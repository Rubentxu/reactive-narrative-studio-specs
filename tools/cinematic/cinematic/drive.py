"""Headless execution of the generated Blender script.

The driver is the single execution edge to the Blender binary. Every run gets a
disciplined environment built only from an explicit allowlist plus the mode
variable, a fixed timeout, and a success marker that never trusts the child exit
code alone: the run succeeded only when the process exited cleanly AND the
emitted metadata parses, validates, AND every declared output exists on disk.
"""

from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import jsonschema

from cinematic.blender_gen import generate_scene_script
from cinematic.shotplan import specs_dir, validate_shot_plan_file

DEFAULT_BLENDER_PATH = Path.home() / ".local/opt/blender-4.5.3-linux-x64/blender"
BLENDER_ENV_ALLOWLIST = ("PATH", "HOME", "LANG", "LC_ALL", "TMPDIR")
RUN_TIMEOUT_SECONDS = 600.0

SCRIPT_NAME = "generated-scene.py"
METADATA_NAME = "scene-metadata.json"
PROVENANCE_NAME = "provenance.json"


class BlenderBinaryNotFoundError(Exception):
    """Raised when neither BLENDER_BIN nor the default path resolves."""


class RunFailedError(Exception):
    """Raised when a run does not satisfy the success marker."""


def resolve_blender_bin(env: dict[str, str] | None = None, default: Path = DEFAULT_BLENDER_PATH) -> Path:
    """Locate the Blender binary: environment override first, then the default."""

    environment = env if env is not None else os.environ
    override = environment.get("BLENDER_BIN")
    if override:
        candidate = Path(override)
        if candidate.is_file():
            return candidate
        raise BlenderBinaryNotFoundError(f"BLENDER_BIN does not point to a file: {override}")
    if default.is_file():
        return default
    raise BlenderBinaryNotFoundError(
        f"no Blender binary found: set BLENDER_BIN or install the default location {default}"
    )


@dataclass(frozen=True)
class RunReport:
    """Observed facts of one execution, without values that could leak secrets."""

    ok: bool
    child_env_keys: tuple[str, ...]
    metadata: dict[str, Any] | None
    provenance: dict[str, Any] | None
    blender_stderr_tail: str


def _validate_metadata(document: Any) -> bool:
    schema_path = specs_dir() / "scene-metadata.schema.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    try:
        jsonschema.validate(document, schema)
    except jsonschema.ValidationError:
        return False
    return True


def _build_child_env(mode: str) -> tuple[dict[str, str], tuple[str, ...]]:
    env = {key: os.environ[key] for key in BLENDER_ENV_ALLOWLIST if key in os.environ}
    env["CINEMATIC_MODE"] = mode
    return env, tuple(sorted(env.keys()))


def _write_provenance(out_dir: Path, shot_plan_path: Path, metadata: dict[str, Any]) -> dict[str, Any]:
    def artifact(path: str) -> dict[str, str]:
        return {"path": path, "sha256": _sha256(out_dir / path)}

    outputs = [output["path"] for output in metadata["outputs"]]
    provenance = {
        "version": 1,
        "shotPlan": {"path": str(shot_plan_path), "sha256": _sha256(shot_plan_path)},
        "generatedScript": artifact(SCRIPT_NAME),
        "sceneMetadata": artifact(METADATA_NAME),
        "outputs": [artifact(path) for path in outputs],
    }
    (out_dir / PROVENANCE_NAME).write_text(json.dumps(provenance, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return provenance


def _sha256(path: Path) -> str:
    import hashlib

    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_scene(
    shot_plan_path: str | Path,
    out_dir: str | Path,
    mode: str = "scene",
    blender_bin: Path | None = None,
    timeout_s: float = RUN_TIMEOUT_SECONDS,
    env: dict[str, str] | None = None,
) -> RunReport:
    """Validate, generate, and execute the scene script inside the sandbox."""

    document, violations = validate_shot_plan_file(shot_plan_path)
    if violations or document is None:
        raise RunFailedError(f"shot plan validation failed: {violations[0].message if violations else 'unknown'}")

    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    script = generate_scene_script(document, mode=mode)
    script_path = out_path / SCRIPT_NAME
    script_path.write_text(script, encoding="utf-8")

    binary = resolve_blender_bin(env=env) if blender_bin is None else blender_bin
    child_env, child_env_keys = _build_child_env(mode) if env is None else (dict(env), tuple(sorted(env.keys())))

    completed = subprocess.run(
        [str(binary), "--background", "--factory-startup", "--python", str(script_path)],
        cwd=out_path,
        env=child_env,
        capture_output=True,
        text=True,
        timeout=timeout_s,
        check=False,
    )
    stderr_tail = completed.stderr[-2000:]

    metadata_path = out_path / METADATA_NAME
    metadata: dict[str, Any] | None = None
    if metadata_path.is_file():
        try:
            candidate = json.loads(metadata_path.read_text(encoding="utf-8"))
            if _validate_metadata(candidate) and all((out_path / o["path"]).is_file() for o in candidate["outputs"]):
                metadata = candidate
        except (json.JSONDecodeError, KeyError):
            metadata = None

    if completed.returncode != 0 or metadata is None:
        raise RunFailedError(
            f"run did not satisfy the success marker (exit={completed.returncode}, metadata_valid={metadata is not None})"
            f" | stderr tail: {stderr_tail}"
        )

    provenance = _write_provenance(out_path, Path(shot_plan_path), metadata)
    return RunReport(
        ok=True,
        child_env_keys=child_env_keys,
        metadata=metadata,
        provenance=provenance,
        blender_stderr_tail=stderr_tail,
    )
