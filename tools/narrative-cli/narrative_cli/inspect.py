"""
narrative inspect — emit the stable inspect envelope for a rendered project.

Contract: specs/inspect.schema.json (REQ-CLI-001/007). The payload contains
exactly the `project` object: identity (name + namespace), profile, and the
opaque runtimePath pointing at the project's narrative.yaml.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml


def build_inspect_payload(workspace: Path) -> dict[str, Any]:
    """
    Build the inspect payload from a rendered project directory.

    The workspace MUST contain narrative.yaml (the recipe-rendered manifest).
    Missing manifest → FileNotFoundError; malformed → ValueError. The caller
    (CLI) maps these to exit codes.
    """
    manifest_path = workspace / "narrative.yaml"
    if not manifest_path.is_file():
        raise FileNotFoundError(f"no narrative.yaml found in {workspace}")
    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        raise ValueError(f"{manifest_path} is not a valid manifest")

    identity = manifest.get("project") if isinstance(manifest.get("project"), dict) else {}
    audience = manifest.get("audience") if isinstance(manifest.get("audience"), dict) else {}

    name = manifest.get("id") or identity.get("name") or ""
    if not name:
        raise ValueError(f"{manifest_path} declares no project id")

    return {
        "project": {
            "identity": {
                "name": str(name),
                "namespace": str(
                    identity.get("namespace")
                    or (manifest.get("metadata") or {}).get("namespace")
                    or "default"
                ),
            },
            "profile": str(audience.get("profile") or manifest.get("profile") or ""),
            "runtimePath": str(manifest_path),
        }
    }


def inspect_payload_to_json(payload: dict[str, Any]) -> str:
    return json.dumps(payload, indent=2, sort_keys=False)
