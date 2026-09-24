"""
narrative plan — emit create-plan.json WITHOUT writing project tree.

Produces the same plan artifact that `narrative init` would write, but
does not write any files to the output directory.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from narrative_cli.output import format_output
from narrative_cli.recipe_loader import load_recipe, ValidationDiagnostic
from narrative_recipes import (
    ProjectRenderer,
    canonical_json,
)
from narrative_recipes.template_engine import TemplateError
from narrative_recipes.template_engine import TemplateError


def compute_sha256(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()


def plan(
    recipe_id: str,
    params: dict,
    recipes_root: str,
    output_file: str | None = None,
    as_json: bool = False,
) -> int:
    """
    Generate a create-plan.json artifact and optionally write it to a file.

    Returns exit code.
    """
    # Load recipe (layout check + schema validation)
    result = load_recipe(recipe_id, recipes_root)
    if not result.ok:
        print(f"Error: {result.message}", file=sys.stderr)
        # Distinguish missing recipe from other errors
        if result.code == "recipe-layout-error":
            return 3  # EXIT_MISSING_RECIPE
        return 1  # EXIT_VALIDATION_ERROR

    bundle = result.data

    # Validate parameters BEFORE any rendering (REQ-CR-12)
    from narrative_recipes import ParameterValidator
    validator = ParameterValidator()
    # Apply declared parameter defaults (REQ-CR-10) before validation —
    # explicit user params are never overwritten.
    from narrative_recipes import apply_schema_defaults
    params = apply_schema_defaults(params, bundle.parameters_schema)

    validation_result = validator.validate(params, bundle.parameters_schema)
    if not validation_result.ok:
        print(f"Error: {validation_result.message}", file=sys.stderr)
        return 1  # EXIT_VALIDATION_ERROR

    # Render project
    renderer = ProjectRenderer()
    try:
        rendered = renderer.render(bundle, params)
    except TemplateError as e:
        print(f"Template error: {e}", file=sys.stderr)
        return 1

    # Build skeleton file list with SHA-256 — includes content for --plan replay
    skeleton_list = []
    for sf in rendered.skeleton:
        sha = compute_sha256(sf.content)
        skeleton_list.append({
            "path": sf.path,
            "sha256": sha,
            "bytes": len(sf.content.encode()),
            "content": sf.content,
        })

    # Compute recipe lock SHA-256
    lock_sha = ""
    if bundle.lock_data:
        lock_json = json.dumps(bundle.lock_data, sort_keys=True)
        lock_sha = compute_sha256(lock_json)

    # Build plan artifact
    plan_artifact: dict = {
        "recipe": recipe_id,
        "recipeLockSha256": lock_sha,
        "manifest": rendered.manifest,
        "skeleton": skeleton_list,
    }

    # Compute createPlanSha256 (SHA-256 of the canonical plan itself)
    plan_canonical = canonical_json(plan_artifact)
    create_plan_sha = compute_sha256(plan_canonical)
    plan_artifact["createPlanSha256"] = create_plan_sha

    # Output
    if output_file:
        Path(output_file).parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            output = format_output(plan_artifact, as_json)
            f.write(output)
        print(f"Plan written to {output_file}", file=sys.stderr)
    else:
        output = format_output(plan_artifact, as_json)
        print(output)

    return 0
