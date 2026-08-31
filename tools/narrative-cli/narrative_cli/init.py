"""
narrative init — create a new project from a creation recipe.

Flags:
  --recipe <id>       Recipe ID (required unless --plan given)
  --params-file <f>   JSON file with parameters (XOR --param)
  --param k=v         Individual parameter (XOR --params-file)
  --out <dir>         Output directory (required)
  --dry-run           Validate but do not write files
  --force             Overwrite existing files
  --json              JSON output
  --recipes-root <p>  Path to recipes directory (default: recipes/)
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from narrative_cli.plan import plan
from narrative_cli.recipe_loader import load_recipe
from narrative_cli.output import format_output
from narrative_recipes import ProjectRenderer
from narrative_recipes.template_engine import TemplateError


def compute_sha256(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()


def parse_params(params_source: list[str] | None = None, params_file: Path | None = None) -> dict:
    """Parse parameters from --param k=v flags or a JSON file."""
    params = {}

    if params_file:
        with open(params_file) as f:
            file_params = json.load(f)
            if not isinstance(file_params, dict):
                raise ValueError(f"params-file must contain a JSON object, got {type(file_params).__name__}")
            params.update(file_params)

    if params_source:
        for item in params_source:
            if "=" not in item:
                raise ValueError(f"--param must be k=v, got {item!r}")
            key, value = item.split("=", 1)
            key = key.strip()
            if not key:
                raise ValueError(f"--param key cannot be empty")
            # Try to parse value as JSON (number, bool, etc.)
            try:
                params[key] = json.loads(value)
            except json.JSONDecodeError:
                params[key] = value

    return params


def init(
    recipe_id: str | None,
    params: dict,
    recipes_root: str,
    output_dir: Path,
    dry_run: bool = False,
    force: bool = False,
    as_json: bool = False,
) -> int:
    """
    Create a new project from a recipe.

    Returns exit code.
    """
    # Validate mutually exclusive: recipe_id xor plan
    # (plan mode is handled at CLI dispatch level)

    # Load recipe (layout check + schema validation)
    result = load_recipe(recipe_id, recipes_root)
    if not result.ok:
        print(f"Error: {result.message}", file=sys.stderr)
        if result.code == "recipe-layout-error":
            return 3  # EXIT_MISSING_RECIPE
        return 1  # EXIT_VALIDATION_ERROR

    bundle = result.data

    # Render project
    renderer = ProjectRenderer()

    # Validate parameters before any write (REQ-CR-12)
    from narrative_recipes import ParameterValidator
    validator = ParameterValidator()
    validation_result = validator.validate(params, bundle.parameters_schema)
    if not validation_result.ok:
        print(f"Error: {validation_result.message}", file=sys.stderr)
        return 1  # EXIT_VALIDATION_ERROR

    # Validate output directory (after all validation passes)
    if not dry_run and not force and output_dir.exists() and any(output_dir.iterdir()):
        print(f"Error: output directory {output_dir} is not empty. Use --force to overwrite.", file=sys.stderr)
        return 2  # EXIT_CONFLICT

    # Create output directory (after all validation passes)
    if not dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)

    try:
        rendered = renderer.render(bundle, params)
    except TemplateError as e:
        print(f"Template error: {e}", file=sys.stderr)
        return 1

    # Check for conflicts (only in non-force mode)
    if not dry_run and not force:
        conflicts = []
        for sf in rendered.skeleton:
            target = output_dir / sf.path
            if target.exists():
                conflicts.append(sf.path)
        if conflicts:
            print(f"Error: conflicting files exist in {output_dir}: {', '.join(conflicts)}", file=sys.stderr)
            print("Use --force to overwrite.", file=sys.stderr)
            return 2  # EXIT_CONFLICT

    # Write files
    if not dry_run:
        for sf in rendered.skeleton:
            target = output_dir / sf.path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(sf.content, encoding="utf-8")

    # Write .narrative/create-plan.json
    if not dry_run:
        create_plan = _build_plan_artifact(recipe_id, bundle, rendered, params)
        plan_dir = output_dir / ".narrative"
        plan_dir.mkdir(exist_ok=True)
        plan_path = plan_dir / "create-plan.json"
        plan_json = json.dumps(create_plan, sort_keys=True, indent=2, ensure_ascii=False)
        plan_path.write_text(plan_json, encoding="utf-8")

    # JSON output
    if as_json:
        output = _build_plan_artifact(recipe_id, bundle, rendered, params)
        print(format_output(output, as_json=True))
    else:
        if dry_run:
            print(f"Dry run: would create project at {output_dir}", file=sys.stderr)
            for sf in rendered.skeleton:
                print(f"  {sf.path}", file=sys.stderr)
        else:
            print(f"Project created at {output_dir}", file=sys.stderr)
            for sf in rendered.skeleton:
                print(f"  {sf.path}", file=sys.stderr)

    return 0


def _build_plan_artifact(recipe_id, bundle, rendered, params) -> dict:
    """Build the create-plan.json artifact."""
    # Compute lock SHA
    lock_sha = ""
    if bundle.lock_data:
        lock_json = json.dumps(bundle.lock_data, sort_keys=True)
        lock_sha = compute_sha256(lock_json)

    # Skeleton list
    skeleton_list = []
    for sf in rendered.skeleton:
        sha = compute_sha256(sf.content)
        skeleton_list.append({
            "path": sf.path,
            "sha256": sha,
            "bytes": len(sf.content.encode()),
        })

    plan_artifact = {
        "recipe": recipe_id,
        "recipeLockSha256": lock_sha,
        "manifest": rendered.manifest,
        "skeleton": skeleton_list,
    }

    # createPlanSha256
    import unicodedata
    canonical = json.dumps(plan_artifact, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    canonical = unicodedata.normalize("NFC", canonical)
    plan_artifact["createPlanSha256"] = compute_sha256(canonical)

    return plan_artifact
