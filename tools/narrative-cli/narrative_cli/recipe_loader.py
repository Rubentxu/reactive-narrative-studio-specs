"""
Thin wrapper around narrative_recipes RecipeLoader.

Provides load_recipe() which wraps RecipeLoader.load() exceptions
into a ValidationDiagnostic result object.
"""

from __future__ import annotations

import jsonschema
from pathlib import Path

from narrative_recipes import RecipeLoader, RecipeLayoutError


class ValidationDiagnostic:
    """Result type for recipe loading."""
    __slots__ = ("ok", "code", "message", "data")

    def __init__(self, ok: bool, code: str, message: str, data=None):
        self.ok = ok
        self.code = code
        self.message = message
        self.data = data

    def __repr__(self):
        return f"ValidationDiagnostic(ok={self.ok}, code={self.code!r}, message={self.message!r})"


def load_recipe(recipe_id: str, recipes_root: str) -> ValidationDiagnostic:
    """
    Load a recipe bundle, returning a ValidationDiagnostic.

    Returns ValidationDiagnostic with .ok=True and .data=RecipeBundle on success.
    Returns ValidationDiagnostic with .ok=False on error.
    """
    try:
        loader = RecipeLoader()
        bundle = loader.load(recipe_id, recipes_root)
        return ValidationDiagnostic(
            ok=True,
            code="recipe-valid",
            message="Recipe loaded successfully",
            data=bundle,
        )
    except FileNotFoundError as e:
        return ValidationDiagnostic(
            ok=False,
            code="recipe-layout-error",
            message=f"Recipe not found: {e}",
        )
    except jsonschema.ValidationError as e:
        return ValidationDiagnostic(
            ok=False,
            code="recipe-schema-error",
            message=f"recipe.yaml schema error: {e.message}",
        )
    except RecipeLayoutError as e:
        return ValidationDiagnostic(
            ok=False,
            code=e.code,
            message=e.message,
        )
    except Exception as e:
        return ValidationDiagnostic(
            ok=False,
            code="recipe-load-error",
            message=f"Failed to load recipe: {e}",
        )
