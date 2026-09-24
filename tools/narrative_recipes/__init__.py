"""
Narrative Recipes Python Core.

Provides the recipe loading, template rendering, parameter validation,
project rendering, and equivalence oracle for the creation-recipes system.
"""

from narrative_recipes.recipe_loader import RecipeLoader, RecipeLayoutError
from narrative_recipes.template_engine import TemplateEngine, TemplateError
from narrative_recipes.parameter_validator import ParameterValidator, apply_schema_defaults
from narrative_recipes.project_renderer import ProjectRenderer
from narrative_recipes.equivalence_oracle import (
    EquivalenceOracle,
    canonical_json,
    canonical_json_equal,
    strip_recipe_owned,
)

__all__ = [
    "RecipeLoader",
    "RecipeLayoutError",
    "TemplateEngine",
    "TemplateError",
    "ParameterValidator",
    "apply_schema_defaults",
    "ProjectRenderer",
    "EquivalenceOracle",
    "canonical_json",
    "canonical_json_equal",
    "strip_recipe_owned",
]
