"""
test_roundtrip.py — Python-side unit guarantees for recipe rendering (PR-5, M10.2.1).

This file previously claimed to be a "cross-language equivalence oracle", but it
only rendered with Python and asserted on Python's own output — the TypeScript
runtime was never executed (false-green identified by the Verification & Audit
Harness).

The REAL cross-language equivalence (CLI ↔ UI, both runtimes executing for real)
is owned by scenario SCN-M10-04-001 in verification/scenarios/, run by the
Verification & Audit Harness (`node verification/src/index.ts uat all`).

What remains here are honest unit-level guarantees of the Python renderer and
the canonical-JSON oracle itself.
"""

import json
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / ".."))
from narrative_recipes import ProjectRenderer

from narrative_recipes.equivalence_oracle import canonical_json_equal, canonical_json


# Canonical recipe and parameters for the roundtrip oracle
RECIPE_ID = "middle-grade-illustrated"
RECIPES_ROOT = Path(__file__).parent.parent.parent.parent / "recipes"
CANONICAL_PARAMS = {
    "title": "The Dragon's Compass",
    "projectId": "dragons-compass",
    "audience": "profile-middle-grade-10-11",
    "imagePolicy": "local_preferred",
    "genre": "fantasy",
    "outputLanguage": "es-ES",
}


def test_python_roundtrip_manifest():
    """
    Python engine renders middle-grade-illustrated recipe with canonical params.
    The manifest must be canonical-JSON-serializable (no datetime, no set, etc.).
    """
    from narrative_cli.recipe_loader import load_recipe

    result = load_recipe(RECIPE_ID, str(RECIPES_ROOT))
    assert result.ok, f"Failed to load recipe: {result.message}"
    bundle = result.data

    renderer = ProjectRenderer()
    rendered = renderer.render(bundle, CANONICAL_PARAMS)

    # RenderedProject has manifest dict — no .ok field
    manifest_json = json.dumps(rendered.manifest)
    manifest_roundtrip = json.loads(manifest_json)
    assert manifest_roundtrip["id"] == CANONICAL_PARAMS["projectId"]


def test_python_roundtrip_skeleton_renders_without_error():
    """All skeleton template files render without raising TemplateError."""
    from narrative_cli.recipe_loader import load_recipe

    result = load_recipe(RECIPE_ID, str(RECIPES_ROOT))
    assert result.ok
    bundle = result.data

    renderer = ProjectRenderer()
    rendered = renderer.render(bundle, CANONICAL_PARAMS)

    # Every skeleton file must have rendered content
    assert len(rendered.skeleton) > 0
    for sf in rendered.skeleton:
        assert isinstance(sf.path, str)
        assert isinstance(sf.content, str)
        assert len(sf.content) > 0


def test_canonical_manifest_json_equivalence():
    """
    The Python manifest must be canonical JSON so that the TypeScript side can
    compare using the same canonical representation.
    """
    from narrative_cli.recipe_loader import load_recipe

    result = load_recipe(RECIPE_ID, str(RECIPES_ROOT))
    assert result.ok
    bundle = result.data

    renderer = ProjectRenderer()
    rendered = renderer.render(bundle, CANONICAL_PARAMS)

    # Must not raise — canonical_json must handle the manifest
    canonical = canonical_json(rendered.manifest)
    assert isinstance(canonical, str)

    # Must be parseable back to JSON
    reparsed = json.loads(canonical)
    assert reparsed["id"] == CANONICAL_PARAMS["projectId"]
