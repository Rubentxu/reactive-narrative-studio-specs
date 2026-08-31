#!/usr/bin/env python3
"""
Recipe validation script for creation-recipes system.

Validates recipe directories against specs/creation-recipe.schema.json and
computes SHA-256 fingerprints for recipe.lock.json integrity checks.

Usage:
    python tools/validate-recipes/validate.py <recipe-dir>     # validate one recipe
    python tools/validate-recipes/validate.py recipes/        # validate all recipes
    python tools/validate-recipes/validate.py --publish <recipe-dir>   # regenerate lock

Exit codes:
    0 = all checks pass (warnings may be present)
    1 = validation error (schema violation, lock drift, etc.)
    2 = file not found / layout error
"""

from __future__ import annotations

import argparse
import hashlib
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
CREATION_SCHEMA_PATH = REPO_ROOT / "specs" / "creation-recipe.schema.json"
PARAM_META_SCHEMA_PATH = REPO_ROOT / "specs" / "recipe-parameters.schema.json"


# ---------------------------------------------------------------------------
# Core utilities
# ---------------------------------------------------------------------------

def compute_file_sha256(path: Path) -> str:
    """Compute SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def load_json(path: Path) -> dict:
    """Load a JSON file from disk."""
    with open(path) as f:
        return json.load(f)


def load_json_schema(path: Path) -> dict:
    """Load a JSON schema from disk."""
    return load_json(path)


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

def validate_recipe_schema(recipe_data: dict, recipe_path: Path) -> list[Diagnostic]:
    """Validate recipe.yaml against creation-recipe.schema.json."""
    try:
        schema = load_json_schema(CREATION_SCHEMA_PATH)
        jsonschema.validate(
            instance=recipe_data,
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
            message=f"recipe.yaml: {msg}",
            severity="error",
            path=str(recipe_path),
        )
        return [d]
    except Exception as e:
        d = Diagnostic(
            code="schema-load-error",
            message=f"recipe.yaml: failed to validate: {e}",
            severity="error",
            path=str(recipe_path),
        )
        return [d]


def validate_parameters_schema(params_schema_data: dict, recipe_path: Path) -> list[Diagnostic]:
    """Validate parameters.schema.json against recipe-parameters meta-schema."""
    try:
        meta_schema = load_json_schema(PARAM_META_SCHEMA_PATH)
        jsonschema.validate(
            instance=params_schema_data,
            schema=meta_schema,
            format_checker=jsonschema.FormatChecker(),
        )
        return []
    except jsonschema.ValidationError as e:
        path_str = ".".join(str(p) for p in e.path) if e.path else None
        msg = e.message
        if path_str:
            msg = f"at {path_str}: {msg}"
        d = Diagnostic(
            code="parameters-schema-validation-error",
            message=f"parameters.schema.json: {msg}",
            severity="error",
            path=str(recipe_path / "parameters.schema.json"),
        )
        return [d]
    except Exception as e:
        d = Diagnostic(
            code="parameters-schema-load-error",
            message=f"parameters.schema.json: failed to load: {e}",
            severity="error",
            path=str(recipe_path / "parameters.schema.json"),
        )
        return [d]


# ---------------------------------------------------------------------------
# Layout checks
# ---------------------------------------------------------------------------

def check_layout(recipe_dir: Path) -> list[Diagnostic]:
    """Check that required recipe files exist before Ajv validation."""
    required = ["recipe.yaml", "parameters.schema.json"]
    errors = []
    for name in required:
        path = recipe_dir / name
        if not path.exists():
            d = Diagnostic(
                code="recipe-layout-error",
                message=f"required file missing: {name}",
                severity="error",
                path=str(path),
            )
            errors.append(d)
    return errors


# ---------------------------------------------------------------------------
# Lock fingerprinting
# ---------------------------------------------------------------------------

def compute_lock_fingerprint(recipe_dir: Path) -> dict:
    """
    Compute the lock fingerprint for a recipe.

    Returns dict with:
      - recipeYamlSha256: SHA-256 of recipe.yaml
      - parametersSchemaSha256: SHA-256 of parameters.schema.json
      - skeletonFileShas256: dict of {relative_path: sha256} for all skeleton files
      - generatorVersion: "1.0"
    """
    recipe_yaml_path = recipe_dir / "recipe.yaml"
    params_schema_path = recipe_dir / "parameters.schema.json"
    skeleton_dir = recipe_dir / "skeleton"

    fingerprint: dict = {
        "recipeYamlSha256": compute_file_sha256(recipe_yaml_path),
        "parametersSchemaSha256": compute_file_sha256(params_schema_path),
        "skeletonFileShas256": {},
        "generatorVersion": "1.0",
    }

    if skeleton_dir.exists() and skeleton_dir.is_dir():
        for file_path in sorted(skeleton_dir.rglob("*")):
            if file_path.is_file():
                rel = str(file_path.relative_to(skeleton_dir))
                fingerprint["skeletonFileShas256"][rel] = compute_file_sha256(file_path)

    return fingerprint


def check_lock_drift(recipe_dir: Path) -> list[Diagnostic]:
    """Check if recipe.lock.json matches current file fingerprints."""
    lock_path = recipe_dir / "recipe.lock.json"
    if not lock_path.exists():
        d = Diagnostic(
            code="lock-missing",
            message="recipe.lock.json not found (run with --publish to generate)",
            severity="warning",
            path=str(lock_path),
        )
        return [d]

    try:
        lock_data = load_json(lock_path)
    except Exception as e:
        d = Diagnostic(
            code="lock-parse-error",
            message=f"recipe.lock.json: failed to parse: {e}",
            severity="error",
            path=str(lock_path),
        )
        return [d]

    current = compute_lock_fingerprint(recipe_dir)

    # Compare recipe.yaml SHA
    if lock_data.get("recipeYamlSha256") != current["recipeYamlSha256"]:
        d = Diagnostic(
            code="lock-drift",
            message="recipe.yaml has changed — SHA-256 mismatch with recipe.lock.json",
            severity="error",
            path=str(recipe_dir / "recipe.yaml"),
        )
        return [d]

    # Compare parameters.schema.json SHA
    if lock_data.get("parametersSchemaSha256") != current["parametersSchemaSha256"]:
        d = Diagnostic(
            code="lock-drift",
            message="parameters.schema.json has changed — SHA-256 mismatch with recipe.lock.json",
            severity="error",
            path=str(recipe_dir / "parameters.schema.json"),
        )
        return [d]

    # Compare skeleton file SHAs
    lock_shas = lock_data.get("skeletonFileShas256", {})
    current_shas = current["skeletonFileShas256"]

    if set(lock_shas.keys()) != set(current_shas.keys()):
        d = Diagnostic(
            code="lock-drift",
            message=f"skeleton file set changed: {set(lock_shas.keys())} vs {set(current_shas.keys())}",
            severity="error",
            path=str(recipe_dir / "skeleton"),
        )
        return [d]

    for rel_path, sha in current_shas.items():
        if lock_shas.get(rel_path) != sha:
            d = Diagnostic(
                code="lock-drift",
                message=f"skeleton file changed: {rel_path}",
                severity="error",
                path=str(recipe_dir / "skeleton" / rel_path),
            )
            return [d]

    return []


# ---------------------------------------------------------------------------
# Recipe-level validation
# ---------------------------------------------------------------------------

def validate_recipe_dir(recipe_dir: Path, check_lock: bool = True) -> list[Diagnostic]:
    """
    Full validation of a recipe directory.

    Steps:
    1. Layout check (required files exist)
    2. recipe.yaml schema validation
    3. parameters.schema.json meta-schema validation
    4. Lock drift check (optional)
    """
    all_diags: list[Diagnostic] = []

    # Step 1: layout
    layout_diags = check_layout(recipe_dir)
    all_diags.extend(layout_diags)
    if any(d.severity == "error" for d in layout_diags):
        return all_diags

    # Step 2: recipe.yaml schema
    try:
        recipe_data = load_yaml(recipe_dir / "recipe.yaml")
        all_diags.extend(validate_recipe_schema(recipe_data, recipe_dir / "recipe.yaml"))
    except Exception as e:
        d = Diagnostic(
            code="recipe-load-error",
            message=f"recipe.yaml: failed to load: {e}",
            severity="error",
            path=str(recipe_dir / "recipe.yaml"),
        )
        all_diags.append(d)

    # Step 3: parameters.schema.json meta-schema
    params_schema_path = recipe_dir / "parameters.schema.json"
    if params_schema_path.exists():
        try:
            params_data = load_json(params_schema_path)
            all_diags.extend(validate_parameters_schema(params_data, recipe_dir))
        except Exception as e:
            d = Diagnostic(
                code="parameters-load-error",
                message=f"parameters.schema.json: failed to load: {e}",
                severity="error",
                path=str(params_schema_path),
            )
            all_diags.append(d)

    # Step 4: lock drift check
    if check_lock:
        all_diags.extend(check_lock_drift(recipe_dir))

    return all_diags


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate creation recipes against the schema."
    )
    parser.add_argument(
        "--publish",
        action="store_true",
        help="Regenerate recipe.lock.json (instead of checking drift)",
    )
    parser.add_argument(
        "path",
        nargs="?",
        default="recipes",
        help="Recipe directory or recipes root (default: recipes)",
    )
    args = parser.parse_args()

    repo_root = REPO_ROOT
    target = (repo_root / args.path).resolve()

    diagnostics: list[Diagnostic] = []

    if target.is_file():
        recipe_dirs = [target.parent]
    elif target.is_dir():
        recipe_dirs = [p.parent for p in sorted(target.rglob("recipe.yaml"))]
    else:
        print(f"Error: {target} not found", file=sys.stderr)
        return 2

    if not recipe_dirs:
        print(f"No recipes found under {target}", file=sys.stderr)
        return 2

    for recipe_dir in recipe_dirs:
        if args.publish:
            try:
                lock_data = compute_lock_fingerprint(recipe_dir)
                lock_path = recipe_dir / "recipe.lock.json"
                with open(lock_path, "w") as f:
                    json.dump(lock_data, f, indent=2, sort_keys=True)
                    f.write("\n")
                print(f"Generated {lock_path}")
            except Exception as e:
                d = Diagnostic(
                    code="lock-gen-error",
                    message=f"Failed to generate lock: {e}",
                    severity="error",
                    path=str(recipe_dir),
                )
                diagnostics.append(d)
        else:
            diags = validate_recipe_dir(recipe_dir, check_lock=True)
            diagnostics.extend(diags)

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
            f"\n{len(recipe_dirs)} recipe(s) checked: "
            f"{error_count} error(s), {warn_count} warning(s)",
            file=sys.stderr,
        )
    else:
        print(f"All checks passed for {len(recipe_dirs)} recipe(s)", file=sys.stderr)

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
