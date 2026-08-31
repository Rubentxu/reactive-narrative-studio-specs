#!/usr/bin/env python3
"""
Profile validation script for the capability catalog.

Validates profile YAML files against specs/profile.schema.json.

Usage:
    python tools/validate-profiles/validate.py <profile-file>     # validate one profile
    python tools/validate-profiles/validate.py examples/         # validate all profiles in examples/
    python tools/validate-profiles/validate.py recipes/          # validate all recipe-scoped profiles

Exit codes:
    0 = all checks pass
    1 = validation error (schema violation, etc.)
    2 = file not found / layout error
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import jsonschema
import yaml


# ---------------------------------------------------------------------------
# Diagnostic types
# ---------------------------------------------------------------------------

@dataclass
class Diagnostic:
    """A validation result with severity and message."""
    code: str
    message: str
    severity: str = "error"
    path: Optional[str] = None

    def to_dict(self) -> dict:
        d = {"code": self.code, "message": self.message, "severity": self.severity}
        if self.path:
            d["path"] = self.path
        return d


# ---------------------------------------------------------------------------
# Schema paths (relative to repo root)
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).parent.parent.parent
PROFILE_SCHEMA_PATH = REPO_ROOT / "specs" / "profile.schema.json"


# ---------------------------------------------------------------------------
# Core utilities
# ---------------------------------------------------------------------------

def load_json(path: Path) -> dict:
    """Load a JSON file from disk."""
    with open(path) as f:
        return json.load(f)


def load_yaml(path: Path) -> dict:
    """Load a YAML file and return as dict."""
    with open(path) as f:
        data = yaml.safe_load(f)
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise ValueError(f"{path}: expected a YAML mapping (dict), got {type(data).__name__}")
    return data


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------

def validate_profile_schema(profile_data: dict, profile_path: Path) -> list[Diagnostic]:
    """Validate a profile YAML against the profile schema."""
    if not PROFILE_SCHEMA_PATH.exists():
        return [
            Diagnostic(
                code="schema-not-found",
                message=f"Profile schema not found at {PROFILE_SCHEMA_PATH}",
                severity="error",
                path=str(profile_path),
            )
        ]

    try:
        schema = load_json(PROFILE_SCHEMA_PATH)
        jsonschema.validate(
            instance=profile_data,
            schema=schema,
            format_checker=jsonschema.FormatChecker(),
        )
        return []
    except jsonschema.ValidationError as e:
        path_str = ".".join(str(p) for p in e.path) if e.path else None
        msg = e.message
        if path_str:
            msg = f"at {path_str}: {msg}"
        d = Diagnostic(
            code="schema-validation-error",
            message=f"profile.yaml: {msg}",
            severity="error",
            path=str(profile_path),
        )
        return [d]
    except Exception as e:
        d = Diagnostic(
            code="schema-load-error",
            message=f"profile.yaml: failed to validate: {e}",
            severity="error",
            path=str(profile_path),
        )
        return [d]


# ---------------------------------------------------------------------------
# Profile-level validation
# ---------------------------------------------------------------------------

def validate_profile_file(profile_file: Path) -> list[Diagnostic]:
    """Validate a single profile YAML file."""
    all_diags: list[Diagnostic] = []

    try:
        profile_data = load_yaml(profile_file)

        # Recipe-skeleton profiles (under <recipe>/skeleton/profiles/) are
        # resolved-from-aliases OUTPUTS, not editable sources. They carry a
        # different shape (resolved from specs/profile-aliases.yaml) and are
        # not validated against profile/v1 schema here.
        if "/skeleton/profiles/" in str(profile_file):
            return []

        # Check schema const
        if profile_data.get("schema") != "profile/v1":
            d = Diagnostic(
                code="schema-const-error",
                message="profile.yaml: must have 'schema: profile/v1'",
                severity="error",
                path=str(profile_file),
            )
            all_diags.append(d)
            return all_diags

        all_diags.extend(validate_profile_schema(profile_data, profile_file))
    except Exception as e:
        d = Diagnostic(
            code="profile-load-error",
            message=f"profile.yaml: failed to load: {e}",
            severity="error",
            path=str(profile_file),
        )
        all_diags.append(d)

    return all_diags


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate profile YAML files against the schema."
    )
    parser.add_argument(
        "path",
        nargs="?",
        default="examples",
        help="Profile file or directory (default: examples)",
    )
    args = parser.parse_args()

    repo_root = REPO_ROOT
    target = (repo_root / args.path).resolve()

    diagnostics: list[Diagnostic] = []

    if target.is_file():
        profile_files = [target]
    elif target.is_dir():
        # Find all yaml files recursively
        profile_files = list(target.rglob("*.yaml"))
    else:
        print(f"Error: {target} not found", file=sys.stderr)
        return 2

    if not profile_files:
        print(f"No profile files found under {target}", file=sys.stderr)
        return 2

    validated_profiles: list[Path] = []
    for profile_file in sorted(profile_files):
        # Skip files known not to be profiles
        if profile_file.name in ["recipe.yaml", "parameters.schema.json", "ui.schema.json"]:
            continue
        # Skip files under tests/negative-fixtures (intentionally invalid profiles)
        if "tests/negative-fixtures" in str(profile_file):
            continue
        # Skip files that don't start with `schema: profile/v1` — they aren't profiles.
        # Recipe-skeleton profiles under <recipe>/skeleton/profiles/ are also
        # skipped (they are resolved-from-aliases outputs, not editable sources).
        try:
            with open(profile_file) as f:
                head = f.read(512)
        except OSError:
            continue
        if "schema: profile/v1" not in head:
            continue
        diags = validate_profile_file(profile_file)
        diagnostics.extend(diags)
        validated_profiles.append(profile_file)

    errors = [d for d in diagnostics if d.severity == "error"]
    warnings = [d for d in diagnostics if d.severity == "warning"]

    for d in warnings:
        print(f"WARNING: {d.code}: {d.message}", file=sys.stderr)
        if d.path:
            print(f"  -> {d.path}", file=sys.stderr)

    for d in errors:
        print(f"ERROR: {d.code}: {d.message}", file=sys.stderr)
        if d.path:
            print(f"  -> {d.path}", file=sys.stderr)

    if diagnostics:
        error_count = len(errors)
        warn_count = len(warnings)
        print(
            f"\n{len(validated_profiles)} profile(s) checked: "
            f"{error_count} error(s), {warn_count} warning(s)",
            file=sys.stderr,
        )
    else:
        print(f"All checks passed for {len(validated_profiles)} profile(s)", file=sys.stderr)

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
