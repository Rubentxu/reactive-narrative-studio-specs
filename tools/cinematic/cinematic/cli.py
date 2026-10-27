"""Command-line interface for the cinematic toolkit.

Six commands cover the deterministic path end to end: validate a shot plan,
generate the scene script, execute it headless (scene or playblast mode), and
drive the provider port with budget discipline and a live gate that is denied
unless the operator explicitly opts in.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import click

from cinematic import exit_codes
from cinematic.output import emit, emit_error
from cinematic.providers.port import VideoGenerationSuccess
from cinematic.providers.record import record_provider_run


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """Deterministic shot plan to Blender previz and provider-neutral video generation."""


def _exit(code: int) -> None:
    sys.exit(code)


@cli.command("validate")
@click.argument("shot_plan", type=click.Path(path_type=Path))
@click.option("--json", "as_json", is_flag=True, help="JSON output")
def validate(shot_plan: Path, as_json: bool) -> None:
    """Validate a shot plan document against its contract."""

    from cinematic.shotplan import validate_shot_plan_file

    document, violations = validate_shot_plan_file(shot_plan)
    if as_json:
        emit(
            {
                "valid": not violations,
                "shotPlanId": str(document["id"]) if document and not violations else None,
                "errors": [v.as_dict() for v in violations],
            }
        )
    if violations:
        for violation in violations:
            emit_error(f"{violation.path}: {violation.message}")
        _exit(exit_codes.EXIT_VALIDATION_ERROR)
    if not as_json:
        emit_error(f"shot plan {document['id']} is valid")
    _exit(exit_codes.EXIT_SUCCESS)


def _prepare_out_dir(out_dir: Path, force: bool) -> None:
    if out_dir.exists() and any(out_dir.iterdir()) and not force:
        emit_error(f"output directory is not empty: {out_dir} (use --force to overwrite)")
        _exit(exit_codes.EXIT_CONFLICT)
    out_dir.mkdir(parents=True, exist_ok=True)


def _run(shot_plan: Path, out_dir: Path, mode: str, force: bool, as_json: bool) -> None:
    from cinematic.drive import RunFailedError, BlenderBinaryNotFoundError, run_scene
    from cinematic.shotplan import validate_shot_plan_file

    document, violations = validate_shot_plan_file(shot_plan)
    if violations:
        for violation in violations:
            emit_error(f"{violation.path}: {violation.message}")
        _exit(exit_codes.EXIT_VALIDATION_ERROR)

    _prepare_out_dir(out_dir, force)
    try:
        report = run_scene(shot_plan, out_dir, mode=mode)
    except BlenderBinaryNotFoundError as exc:
        emit_error(str(exc))
        _exit(exit_codes.EXIT_BLENDER_UNRESOLVED)
    except RunFailedError as exc:
        emit_error(str(exc))
        _exit(exit_codes.EXIT_RUN_FAILED)

    artifacts = sorted(output["path"] for output in report.metadata["outputs"])
    if as_json:
        emit({"status": "success", "shotPlanId": str(document["id"]), "mode": mode, "artifacts": artifacts})
    _exit(exit_codes.EXIT_SUCCESS)


@cli.command("generate")
@click.option("--shot-plan", type=click.Path(exists=True, path_type=Path), required=True)
@click.option("--out", type=click.Path(path_type=Path), required=True)
@click.option("--force", is_flag=True, help="Write into a non-empty directory")
@click.option("--json", "as_json", is_flag=True, help="JSON output")
def generate(shot_plan: Path, out: Path, force: bool, as_json: bool) -> None:
    """Generate the scene script for a shot plan without executing Blender."""

    import hashlib

    from cinematic.blender_gen import generate_scene_script
    from cinematic.shotplan import validate_shot_plan_file

    document, violations = validate_shot_plan_file(shot_plan)
    if violations:
        for violation in violations:
            emit_error(f"{violation.path}: {violation.message}")
        _exit(exit_codes.EXIT_VALIDATION_ERROR)

    _prepare_out_dir(out, force)
    script = generate_scene_script(document)
    script_path = out / "generated-scene.py"
    script_path.write_text(script, encoding="utf-8")
    digest = hashlib.sha256(script_path.read_bytes()).hexdigest()
    if as_json:
        emit({"status": "written", "shotPlanId": str(document["id"]), "script": script_path.name, "sha256": digest})
    _exit(exit_codes.EXIT_SUCCESS)


@cli.command("run")
@click.option("--shot-plan", type=click.Path(exists=True, path_type=Path), required=True)
@click.option("--out", type=click.Path(path_type=Path), required=True)
@click.option("--mode", type=click.Choice(["scene", "playblast"]), default="scene", show_default=True)
@click.option("--force", is_flag=True, help="Write into a non-empty directory")
@click.option("--json", "as_json", is_flag=True, help="JSON output")
def run(shot_plan: Path, out: Path, mode: str, force: bool, as_json: bool) -> None:
    """Execute the generated scene headless inside the sandbox."""

    _run(shot_plan, out, mode, force, as_json)


@cli.command("playblast")
@click.option("--shot-plan", type=click.Path(exists=True, path_type=Path), required=True)
@click.option("--out", type=click.Path(path_type=Path), required=True)
@click.option("--force", is_flag=True, help="Write into a non-empty directory")
@click.option("--json", "as_json", is_flag=True, help="JSON output")
def playblast(shot_plan: Path, out: Path, force: bool, as_json: bool) -> None:
    """Render the scene to a workbench playblast (mode shortcut for run)."""

    _run(shot_plan, out, "playblast", force, as_json)


_LIVE_OPT_IN_ENV = "CINEMATIC_LIVE_OPT_IN"
_LIVE_OPT_IN_VALUES = {"1", "true"}


def _live_opt_in(explicit_flag: bool) -> bool:
    if explicit_flag:
        return True
    return os.environ.get(_LIVE_OPT_IN_ENV, "").lower() in _LIVE_OPT_IN_VALUES


@cli.command("generate-video")
@click.option("--request", "request_path", type=click.Path(exists=True, path_type=Path), required=True)
@click.option("--out", type=click.Path(path_type=Path), required=True)
@click.option("--live", is_flag=True, help="Request the live provider path (still gated by opt-in and budget)")
@click.option("--allow-live-provider", is_flag=True, help="Explicit operator opt-in for billable live generation")
@click.option("--json", "as_json", is_flag=True, help="JSON output")
def generate_video(request_path: Path, out: Path, live: bool, allow_live_provider: bool, as_json: bool) -> None:
    """Generate a video through the provider port with budget discipline."""

    from cinematic.budget import evaluate_live_gate
    from cinematic.providers.fake import FakeProvider
    from cinematic.providers.request import VideoRequestError, load_video_request

    try:
        loaded = load_video_request(request_path)
    except VideoRequestError as exc:
        emit_error(str(exc))
        _exit(exit_codes.EXIT_VALIDATION_ERROR)

    if not live:
        out.mkdir(parents=True, exist_ok=True)
        provider = FakeProvider(output_dir=out)
        provider.capabilities()
        result = provider.generate(loaded.request)
        record_provider_run(out, request_path, loaded.request, result)
        if isinstance(result, VideoGenerationSuccess):
            if as_json:
                emit(
                    {
                        "status": "success",
                        "providerId": result.provider_id,
                        "model": result.model,
                        "receipt": result.receipt,
                        "attempts": result.attempts,
                        "costCredits": result.cost_credits,
                        "artifact": {"path": result.artifact_path, "sha256": result.artifact_sha256},
                    }
                )
            _exit(exit_codes.EXIT_SUCCESS)
        emit_error(f"{result.reason.value}: {result.detail}")
        _exit(exit_codes.EXIT_RUN_FAILED)

    denial = evaluate_live_gate(opt_in=_live_opt_in(allow_live_provider), budget=loaded.request.budget)
    if denial is not None:
        record_provider_run(out, request_path, loaded.request, denial)
        if as_json:
            emit(
                {
                    "status": "denied",
                    "reason": denial.reason.value,
                    "detail": denial.detail,
                    "providerInvoked": denial.provider_invoked,
                }
            )
        _exit(exit_codes.EXIT_LIVE_DENIED)

    # Even with opt-in and a valid budget, this build ships no live adapter:
    # the live path stays operator-only (credentials + provider integration).
    from cinematic.budget import FailureReason
    from cinematic.providers.port import VideoGenerationFailure

    failure = VideoGenerationFailure(
        reason=FailureReason.PROVIDER_ERROR,
        detail="no live provider adapter is registered in this build; live execution is operator-only",
        attempts=0,
        cost_credits=0.0,
        provider_invoked=False,
    )
    record_provider_run(out, request_path, loaded.request, failure)
    emit_error(failure.detail)
    _exit(exit_codes.EXIT_RUN_FAILED)


@cli.command("spike-dry")
@click.option("--shot-plan", type=click.Path(exists=True, path_type=Path), required=True)
@click.option("--out", type=click.Path(path_type=Path), required=True)
@click.option("--json", "as_json", is_flag=True, help="JSON output")
def spike_dry(shot_plan: Path, out: Path, as_json: bool) -> None:
    """Execute the offline A/B spike and write metrics.json (no live providers)."""

    from cinematic.spike import run_spike_dry

    out.mkdir(parents=True, exist_ok=True)
    try:
        metrics = run_spike_dry(shot_plan, out)
    except ValueError as exc:
        emit_error(str(exc))
        _exit(exit_codes.EXIT_VALIDATION_ERROR)
    except Exception as exc:
        emit_error(f"spike dry run failed: {exc}")
        _exit(exit_codes.EXIT_INTERNAL_ERROR)
    if as_json:
        emit(metrics)
    _exit(exit_codes.EXIT_SUCCESS)


@cli.command("prompt")
@click.option("--shot-plan", type=click.Path(exists=True, path_type=Path), required=True)
@click.option("--json", "as_json", is_flag=True, help="JSON output")
def prompt(shot_plan: Path, as_json: bool) -> None:
    """Compile the eight-section video prompt from a validated shot plan."""

    from cinematic.prompt import compile_prompt
    from cinematic.shotplan import validate_shot_plan_file

    document, violations = validate_shot_plan_file(shot_plan)
    if violations:
        for violation in violations:
            emit_error(f"{violation.path}: {violation.message}")
        _exit(exit_codes.EXIT_VALIDATION_ERROR)

    text = compile_prompt(document)
    if as_json:
        emit({"prompt": text, "shotId": str(document["id"])})
    else:
        sys.stdout.write(text)
    _exit(exit_codes.EXIT_SUCCESS)


@cli.command("approve")
@click.option("--shot-plan", type=click.Path(exists=True, path_type=Path), required=True)
@click.option("--out", type=click.Path(path_type=Path), required=True)
@click.option("--decision", type=click.Choice(["approved", "rejected"]), required=True)
@click.option("--rationale", required=True, help="Why this decision was made")
@click.option("--decided-by", required=True, help="Who made the decision")
@click.option("--decided-at", default=None, help="Decision instant (RFC 3339); defaults to now")
@click.option("--json", "as_json", is_flag=True, help="JSON output")
def approve(shot_plan: Path, out: Path, decision: str, rationale: str, decided_by: str, decided_at: str | None, as_json: bool) -> None:
    """Record an explicit human approval for a validated shot plan."""

    from cinematic.approval import ApprovalError, build_approval_record, write_approval_record

    try:
        record = build_approval_record(shot_plan, decision, rationale, decided_by, decided_at)
        written = write_approval_record(out, record)
    except ApprovalError as exc:
        emit_error(str(exc))
        _exit(exit_codes.EXIT_VALIDATION_ERROR)
    if as_json:
        emit({"record": str(written), "shotPlanSha256": record["shotPlan"]["sha256"]})
    _exit(exit_codes.EXIT_SUCCESS)


@cli.command("sequence-prompt")
@click.option("--sequence", type=click.Path(exists=True, path_type=Path), required=True)
@click.option("--json", "as_json", is_flag=True, help="JSON output")
def sequence_prompt(sequence: Path, as_json: bool) -> None:
    """Compile the multi-shot video prompt from a validated sequence plan."""

    from cinematic.prompt import compile_sequence_prompt
    from cinematic.sequence import validate_sequence_file

    document, violations = validate_sequence_file(sequence)
    if violations:
        for violation in violations:
            emit_error(f"{violation.path}: {violation.message}")
        _exit(exit_codes.EXIT_VALIDATION_ERROR)

    text = compile_sequence_prompt(document, sequence.parent)
    if as_json:
        emit({"prompt": text, "sequenceId": str(document["id"])})
    else:
        sys.stdout.write(text)
    _exit(exit_codes.EXIT_SUCCESS)


def main() -> None:
    """Entry point that maps click failures to typed exit codes."""

    try:
        cli(standalone_mode=False)
    except click.exceptions.Exit as exc:
        _exit(exc.exit_code)
    except click.exceptions.UsageError as exc:
        emit_error(str(exc))
        _exit(exit_codes.EXIT_VALIDATION_ERROR)
    except click.exceptions.Abort:
        _exit(exit_codes.EXIT_INTERNAL_ERROR)
    except SystemExit as exc:
        _exit(exc.code if isinstance(exc.code, int) else exit_codes.EXIT_INTERNAL_ERROR)


if __name__ == "__main__":
    main()
