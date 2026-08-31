"""
Recipe loader for the creation-recipes system.

Loads a recipe from a directory that contains recipe.yaml, parameters.schema.json,
skeleton/, and optionally ui.schema.json and recipe.lock.json.

Raises RecipeLayoutError BEFORE any schema validation if required files are missing.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import jsonschema
import yaml

from narrative_recipes.template_engine import TemplateEngine


SCHEMA_PATH = Path(__file__).parent.parent.parent / "specs" / "creation-recipe.schema.json"


@dataclass
class RecipeBundle:
    """A loaded recipe with all its components."""
    recipe_id: str
    recipe_yaml: dict
    parameters_schema: dict
    ui_schema: Optional[dict]
    skeleton_files: dict[str, str]  # relative_path -> content
    lock_data: Optional[dict]


@dataclass
class Diagnostic:
    """A validation result."""
    ok: bool
    code: str
    message: str
    value: Optional[dict] = None


class RecipeLayoutError(Exception):
    """Raised when a required recipe file is missing."""
    def __init__(self, code: str, message: str, path: str):
        self.code = code
        self.message = message
        self.path = path
        super().__init__(f"{code}: {message} (path={path})")


class RecipeLoader:
    """
    Loads and validates creation recipes.

    Usage:
        loader = RecipeLoader()
        bundle = loader.load("middle-grade-illustrated", "recipes")
    """

    def __init__(self, schema_path: Optional[Path] = None):
        self.schema_path = schema_path or SCHEMA_PATH
        self._schema: Optional[dict] = None

    @property
    def schema(self) -> dict:
        if self._schema is None:
            with open(self.schema_path) as f:
                self._schema = json.load(f)
        return self._schema

    def _check_layout(self, recipe_dir: Path) -> None:
        """Raise RecipeLayoutError if required files are missing BEFORE Ajv runs."""
        required = ["recipe.yaml", "parameters.schema.json"]
        for name in required:
            path = recipe_dir / name
            if not path.exists():
                raise RecipeLayoutError(
                    code="recipe-layout-error",
                    message=f"required file missing: {name}",
                    path=str(path),
                )

    def load(self, recipe_id: str, recipes_root: str) -> RecipeBundle:
        """
        Load a recipe by ID from a recipes root directory.

        Raises RecipeLayoutError if recipe.yaml or parameters.schema.json is missing.
        Raises jsonschema.ValidationError if recipe.yaml fails schema validation.
        """
        recipes_root_path = Path(recipes_root).resolve()
        recipe_dir = recipes_root_path / recipe_id

        # Step 1: Layout check BEFORE Ajv
        self._check_layout(recipe_dir)

        # Step 2: Load recipe.yaml
        recipe_yaml_path = recipe_dir / "recipe.yaml"
        with open(recipe_yaml_path) as f:
            recipe_yaml = yaml.safe_load(f)

        # Validate against creation-recipe.schema.json
        jsonschema.validate(
            instance=recipe_yaml,
            schema=self.schema,
            format_checker=jsonschema.FormatChecker(),
        )

        # Step 3: Load parameters.schema.json
        params_schema_path = recipe_dir / "parameters.schema.json"
        with open(params_schema_path) as f:
            parameters_schema = json.load(f)

        # Step 4: Load ui.schema.json (optional)
        ui_schema: Optional[dict] = None
        ui_schema_path = recipe_dir / "ui.schema.json"
        if ui_schema_path.exists():
            with open(ui_schema_path) as f:
                ui_schema = json.load(f)

        # Step 5: Load skeleton files
        skeleton_files: dict[str, str] = {}
        skeleton_dir = recipe_dir / "skeleton"
        if skeleton_dir.exists() and skeleton_dir.is_dir():
            for file_path in sorted(skeleton_dir.rglob("*")):
                if file_path.is_file():
                    rel = str(file_path.relative_to(skeleton_dir))
                    with open(file_path) as f:
                        skeleton_files[rel] = f.read()

        # Step 6: Load lock data (optional)
        lock_data: Optional[dict] = None
        lock_path = recipe_dir / "recipe.lock.json"
        if lock_path.exists():
            with open(lock_path) as f:
                lock_data = json.load(f)

        return RecipeBundle(
            recipe_id=recipe_id,
            recipe_yaml=recipe_yaml,
            parameters_schema=parameters_schema,
            ui_schema=ui_schema,
            skeleton_files=skeleton_files,
            lock_data=lock_data,
        )

    def publish(self, recipe_id: str, recipes_root: str) -> dict:
        """
        Regenerate recipe.lock.json for a recipe.

        Computes SHA-256 fingerprints of recipe.yaml, parameters.schema.json,
        and all skeleton files, then writes the lock file.
        """
        import hashlib

        recipe_dir = Path(recipes_root).resolve() / recipe_id
        self._check_layout(recipe_dir)

        def sha256(path: Path) -> str:
            h = hashlib.sha256()
            with open(path, "rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    h.update(chunk)
            return h.hexdigest()

        lock_data = {
            "recipeYamlSha256": sha256(recipe_dir / "recipe.yaml"),
            "parametersSchemaSha256": sha256(recipe_dir / "parameters.schema.json"),
            "skeletonFileShas256": {},
            "generatorVersion": "1.0",
        }

        skeleton_dir = recipe_dir / "skeleton"
        if skeleton_dir.exists() and skeleton_dir.is_dir():
            for file_path in sorted(skeleton_dir.rglob("*")):
                if file_path.is_file():
                    rel = str(file_path.relative_to(skeleton_dir))
                    lock_data["skeletonFileShas256"][rel] = sha256(file_path)

        lock_path = recipe_dir / "recipe.lock.json"
        with open(lock_path, "w") as f:
            json.dump(lock_data, f, indent=2, sort_keys=True)
            f.write("\n")

        return lock_data
