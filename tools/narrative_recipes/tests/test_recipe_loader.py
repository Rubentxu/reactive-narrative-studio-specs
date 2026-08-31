"""Tests for RecipeLoader."""

import os
import sys
import tempfile

import pytest
import yaml

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from narrative_recipes.recipe_loader import RecipeLoader, RecipeLayoutError


class TestRecipeLoader:
    """Tests for the recipe loader."""

    def test_check_layout_raises_on_missing_recipe_yaml(self, tmp_path):
        """RecipeLayoutError is raised when recipe.yaml is missing BEFORE Ajv validation."""
        loader = RecipeLoader()
        # Create only parameters.schema.json, not recipe.yaml
        (tmp_path / "parameters.schema.json").write_text('{"type": "object"}')
        with pytest.raises(RecipeLayoutError) as exc_info:
            loader._check_layout(tmp_path)
        assert exc_info.value.code == "recipe-layout-error"
        assert "recipe.yaml" in exc_info.value.message

    def test_check_layout_raises_on_missing_parameters_schema(self, tmp_path):
        """RecipeLayoutError is raised when parameters.schema.json is missing."""
        loader = RecipeLoader()
        (tmp_path / "recipe.yaml").write_text(
            "schema: creation-recipe/v1\nmetadata:\n  id: test\n  title: Test\nparameters:\n  type: object\nproject: {}\n"
        )
        with pytest.raises(RecipeLayoutError) as exc_info:
            loader._check_layout(tmp_path)
        assert exc_info.value.code == "recipe-layout-error"
        assert "parameters.schema.json" in exc_info.value.message

    def test_check_layout_passes_when_all_required_present(self, tmp_path):
        """No error when both required files exist."""
        loader = RecipeLoader()
        (tmp_path / "recipe.yaml").write_text(
            "schema: creation-recipe/v1\nmetadata:\n  id: test\n  title: Test\nparameters:\n  type: object\nproject: {}\n"
        )
        (tmp_path / "parameters.schema.json").write_text('{"type": "object"}')
        # Should not raise
        result = loader._check_layout(tmp_path)
        assert result is None  # returns None on success (raises on error)

    def test_recipe_layout_error_has_code_and_path(self, tmp_path):
        """RecipeLayoutError carries the code, message, and path."""
        loader = RecipeLoader()
        try:
            loader._check_layout(tmp_path)
        except RecipeLayoutError as e:
            assert e.code == "recipe-layout-error"
            assert e.path == str(tmp_path / "recipe.yaml")
            assert "required file missing: recipe.yaml" in e.message
