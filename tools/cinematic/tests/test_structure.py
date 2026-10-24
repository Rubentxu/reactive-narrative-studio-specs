"""Structural invariants: closed schemas and a vendor-free core.

Requirements: REQ-CIN-11
"""

import ast
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
SPECS = REPO_ROOT / "specs"
CORE_MODULES = ("shotplan.py", "budget.py", "spike.py")
EDGE_MODULES = ("blender_gen.py", "drive.py")
FORBIDDEN_ROOTS = {"bpy", "socket", "urllib", "http", "requests", "httpx"}


def test_all_cycle_schemas_are_closed():
    names = [
        "shot-plan.schema.json",
        "video-generation-request.schema.json",
        "scene-metadata.schema.json",
        "provenance.schema.json",
    ]
    for name in names:
        schema = json.loads((SPECS / name).read_text(encoding="utf-8"))
        assert schema["$schema"] == "https://json-schema.org/draft/2020-12/schema", name
        assert schema.get("additionalProperties") is False, name


def test_core_modules_never_reference_the_engine_or_vendor_sdks():
    package = Path(__file__).resolve().parents[1] / "cinematic"
    for module_name in CORE_MODULES:
        source = (package / module_name).read_text(encoding="utf-8")
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                assert all(alias.name.split(".")[0] not in FORBIDDEN_ROOTS for alias in node.names), module_name
            elif isinstance(node, ast.ImportFrom):
                assert (node.module or "").split(".")[0] not in FORBIDDEN_ROOTS, module_name
        assert "bpy" not in source, module_name


def test_engine_edge_is_confined_to_generator_and_driver():
    package = Path(__file__).resolve().parents[1] / "cinematic"
    for source_path in package.glob("*.py"):
        if source_path.name in EDGE_MODULES:
            continue
        source = source_path.read_text(encoding="utf-8")
        if "bpy" in source:
            raise AssertionError(f"{source_path.name} must not reference the engine")


def test_providers_directory_is_vendor_free():
    providers = Path(__file__).resolve().parents[1] / "cinematic" / "providers"
    for source_path in providers.glob("*.py"):
        source = source_path.read_text(encoding="utf-8")
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                assert all(alias.name.split(".")[0] not in FORBIDDEN_ROOTS for alias in node.names), source_path.name
            elif isinstance(node, ast.ImportFrom):
                assert (node.module or "").split(".")[0] not in FORBIDDEN_ROOTS, source_path.name
