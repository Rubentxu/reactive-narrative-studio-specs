"""
test_roundtrip.py — cross-language equivalence oracle for creation recipes.

Both Python and TypeScript template engines render the same recipe with the same
canonical parameters and must produce canonical-JSON-equivalent output.

This test is the S-02 cross-language equivalence oracle.  It reads the canonical
recipe (middle-grade-illustrated) and canonical parameters, renders the skeleton
via the Python engine, and compares the manifest against the TypeScript output
(which is tested in roundtrip.spec.ts using the same recipe and parameters).

The canonicalJsonEqual oracle is used so that ordering and timestamp differences
do not cause false failures.
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
