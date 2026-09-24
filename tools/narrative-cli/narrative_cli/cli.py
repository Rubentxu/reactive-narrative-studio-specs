"""
narrative CLI — Reactive Narrative Studio creation recipe CLI.

Usage:
    narrative init --recipe <id> [--param k=v ...] --out <dir> [--dry-run] [--force] [--json]
    narrative plan --recipe <id> [--param k=v ...] [--out <file>] [--json]
    narrative --help
"""

from __future__ import annotations

import sys
from pathlib import Path

import click

from narrative_cli import exit_codes
from narrative_cli.init import init as do_init, do_init_from_plan
from narrative_cli.plan import plan as do_plan


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """Reactive Narrative Studio — creation recipe CLI."""
    pass


@cli.command("init")
@click.option("--recipe", "recipe_id", required=False, help="Recipe ID to use")
@click.option("--params-file", type=click.Path(exists=True, path_type=Path), help="JSON file with parameters")
@click.option("--param", "params_list", multiple=True, help="Parameter as k=v")
@click.option("--plan", "plan_path", type=click.Path(exists=True, path_type=Path), help="create-plan.json to consume (skips recipe lookup)")
@click.option("--out", "output_dir", type=click.Path(path_type=Path), required=True, help="Output directory")
@click.option("--dry-run", is_flag=True, help="Validate but do not write files")
@click.option("--force", is_flag=True, help="Overwrite existing files")
@click.option("--json", "as_json", is_flag=True, help="JSON output")
@click.option("--recipes-root", "recipes_root", default="recipes", help="Path to recipes directory")
def init(
    recipe_id: str | None,
    params_file: Path | None,
    params_list: tuple[str, ...],
    plan_path: Path | None,
    output_dir: Path,
    dry_run: bool,
    force: bool,
    as_json: bool,
    recipes_root: str,
) -> int:
    """
    Create a new project from a creation recipe or a create-plan.json.

    Either --recipe <id> OR --plan <create-plan.json> is required.
    """
    from narrative_cli.init import parse_params

    # Validate mutual exclusivity: --recipe and --plan cannot both be set
    if recipe_id and plan_path:
        print("Error: --recipe and --plan are mutually exclusive", file=sys.stderr)
        sys.exit(exit_codes.EXIT_VALIDATION_ERROR)

    if not recipe_id and not plan_path:
        print("Error: either --recipe <id> or --plan <create-plan.json> is required", file=sys.stderr)
        sys.exit(exit_codes.EXIT_VALIDATION_ERROR)

    # --plan mode: consume create-plan.json directly (no recipe lookup)
    if plan_path:
        try:
            exit_code = do_init_from_plan(
                plan_path=plan_path,
                output_dir=output_dir,
                dry_run=dry_run,
                force=force,
                as_json=as_json,
            )
        except Exception as e:
            print(f"Internal error: {e}", file=sys.stderr)
            sys.exit(exit_codes.EXIT_INTERNAL_ERROR)
        sys.exit(exit_code if exit_code else exit_codes.EXIT_SUCCESS)

    # --recipe mode
    params = {}
    try:
        params = parse_params(list(params_list), params_file)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(exit_codes.EXIT_VALIDATION_ERROR)

    try:
        exit_code = do_init(
            recipe_id=recipe_id,
            params=params,
            recipes_root=recipes_root,
            output_dir=output_dir,
            dry_run=dry_run,
            force=force,
            as_json=as_json,
        )
    except Exception as e:
        print(f"Internal error: {e}", file=sys.stderr)
        sys.exit(exit_codes.EXIT_INTERNAL_ERROR)

    sys.exit(exit_code if exit_code else exit_codes.EXIT_SUCCESS)


@cli.command("plan")
@click.option("--recipe", "recipe_id", required=True, help="Recipe ID to use")
@click.option("--params-file", type=click.Path(exists=True, path_type=Path), help="JSON file with parameters")
@click.option("--param", "params_list", multiple=True, help="Parameter as k=v")
@click.option("--out", "output_file", type=click.Path(path_type=Path), help="Output file (default: stdout)")
@click.option("--json", "as_json", is_flag=True, help="JSON output")
@click.option("--recipes-root", "recipes_root", default="recipes", help="Path to recipes directory")
def plan(
    recipe_id: str,
    params_file: Path | None,
    params_list: tuple[str, ...],
    output_file: Path | None,
    as_json: bool,
    recipes_root: str,
) -> int:
    """
    Emit a create-plan.json artifact without writing the project tree.
    """
    from narrative_cli.init import parse_params

    try:
        params = parse_params(list(params_list), params_file)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(exit_codes.EXIT_VALIDATION_ERROR)

    try:
        exit_code = do_plan(
            recipe_id=recipe_id,
            params=params,
            recipes_root=recipes_root,
            output_file=str(output_file) if output_file else None,
            as_json=as_json,
        )
    except Exception as e:
        print(f"Internal error: {e}", file=sys.stderr)
        sys.exit(exit_codes.EXIT_INTERNAL_ERROR)

    sys.exit(exit_code if exit_code else exit_codes.EXIT_SUCCESS)


@cli.command("inspect")
@click.option("--workspace", "workspace", type=click.Path(exists=True, path_type=Path), default=".", show_default=True, help="Rendered project directory containing narrative.yaml")
@click.option("--json", "as_json", is_flag=True, default=True, help="JSON output (contract: specs/inspect.schema.json)")
def inspect(workspace: Path, as_json: bool) -> None:
    """
    Emit the stable inspect envelope for a rendered project
    (contract: specs/inspect.schema.json).
    """
    from narrative_cli.inspect import build_inspect_payload, inspect_payload_to_json

    try:
        payload = build_inspect_payload(workspace)
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(exit_codes.EXIT_VALIDATION_ERROR)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(exit_codes.EXIT_VALIDATION_ERROR)

    if as_json:
        print(inspect_payload_to_json(payload))
    else:
        project = payload["project"]
        print(f"project: {project['identity']['namespace']}/{project['identity']['name']}")
        print(f"profile: {project['profile']}")
        print(f"runtimePath: {project['runtimePath']}")
    sys.exit(exit_codes.EXIT_SUCCESS)


def main():
    cli()
