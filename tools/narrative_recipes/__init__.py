"""
Narrative Recipes Python Core.

Provides the recipe loading, template rendering, parameter validation,
project rendering, and equivalence oracle for the creation-recipes system.
"""

from narrative_recipes.recipe_loader import RecipeLoader, RecipeLayoutError
from narrative_recipes.template_engine import TemplateEngine, TemplateError
from narrative_recipes.parameter_validator import ParameterValidator
from narrative_recipes.project_renderer import ProjectRenderer
from narrative_recipes.equivalence_oracle import EquivalenceOracle

__all__ = [
    "RecipeLoader",
    "RecipeLayoutError",
    "TemplateEngine",
    "TemplateError",
    "ParameterValidator",
    "ProjectRenderer",
    "EquivalenceOracle",
]
