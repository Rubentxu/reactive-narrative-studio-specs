"""Dry-run orchestration of the A/B motion-reference spike.

Variant A renders the playblast locally with Blender; variant B hands the same
shot to the fake provider, using variant A's clip as the motion reference. The
runner records every attempt with the spike's metric fields but never invents
human or semantic judgments and never emits a verdict: that decision belongs to
the operator running the live spike.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from cinematic.budget import Budget
from cinematic.drive import run_scene
from cinematic.providers.fake import FakeProvider
from cinematic.providers.port import VideoGenerationRequest, VideoGenerationSuccess
from cinematic.shotplan import validate_shot_plan_file

_HUMAN_METRIC_FIELDS = (
    "camera_adherence",
    "spatial_continuity",
    "subject_consistency",
    "visual_quality",
    "human_acceptability_1_5",
)


def _variant_metrics(attempts: int, cost_credits: float, elapsed: float, artifact: dict[str, Any]) -> dict[str, Any]:
    metrics: dict[str, Any] = {
        "attempts": attempts,
        "cost_credits": cost_credits,
        "elapsed_seconds": round(elapsed, 3),
        "artifact": artifact,
    }
    for field in _HUMAN_METRIC_FIELDS:
        metrics[field] = None
    return metrics


def run_spike_dry(shot_plan_path: str | Path, out_dir: str | Path) -> dict[str, Any]:
    """Execute both spike variants offline and write metrics.json."""

    document, violations = validate_shot_plan_file(shot_plan_path)
    if violations or document is None:
        raise ValueError(f"shot plan validation failed: {violations[0].message if violations else 'unknown'}")
    shot_id = str(document["id"])

    out_path = Path(out_dir)

    variant_a_dir = out_path / "variant-A"
    started_a = time.monotonic()
    report = run_scene(shot_plan_path, variant_a_dir, mode="playblast")
    elapsed_a = time.monotonic() - started_a
    playblast_output = report.metadata["outputs"][-1]
    variant_a_artifact = {
        "path": f"variant-A/{playblast_output['path']}",
        "sha256": playblast_output["sha256"],
    }
    variant_a_metrics = _variant_metrics(1, 0.0, elapsed_a, variant_a_artifact)

    variant_b_dir = out_path / "variant-B"
    started_b = time.monotonic()
    provider = FakeProvider(output_dir=variant_b_dir)
    capabilities = provider.capabilities()
    request = VideoGenerationRequest(
        shot_id=shot_id,
        prompt=(
            f"Cinematic tracking shot derived from the approved ShotPlan {shot_id}."
            " Preserve subject path and camera timing."
        ),
        motion_reference=str(playblast_output["path"]),
        style_references=(),
        character_references=(),
        duration_seconds=float(document["durationSeconds"]),
        aspect_ratio="16:9",
        budget=Budget(max_attempts=2, max_credits=40.0),
    )
    result = provider.generate(request)
    elapsed_b = time.monotonic() - started_b

    attempts_log: list[dict[str, Any]] = [
        {"variant": "A", "attempt": 1, "outcome": "success", "cost_credits": 0.0}
    ]
    if isinstance(result, VideoGenerationSuccess):
        variant_b_metrics = _variant_metrics(
            result.attempts,
            result.cost_credits,
            elapsed_b,
            {
                "path": f"variant-B/{Path(result.artifact_path).name}",
                "sha256": result.artifact_sha256,
            },
        )
        variant_b_metrics["provider"] = capabilities.provider_id
        variant_b_metrics["receipt"] = result.receipt
        per_attempt_cost = result.cost_credits / result.attempts
        for index in range(result.attempts):
            attempts_log.append(
                {
                    "variant": "B",
                    "attempt": index + 1,
                    "outcome": "success" if index + 1 == result.attempts else "failure",
                    "cost_credits": per_attempt_cost,
                }
            )
    else:
        variant_b_metrics = _variant_metrics(result.attempts, result.cost_credits, elapsed_b, {})
        for index in range(result.attempts):
            attempts_log.append(
                {"variant": "B", "attempt": index + 1, "outcome": "failure", "cost_credits": 0.0}
            )

    metrics = {
        "version": 1,
        "spike": "SPK-VIDEO-01",
        "mode": "dry-run",
        "variants": {
            "A": {"name": "playblast_blender", **variant_a_metrics},
            "B": {"name": "provider_fake", **variant_b_metrics},
        },
        "attemptsLog": attempts_log,
        "verdict": None,
        "verdictRule": "B improves >= 2 dimensions without disproportionate cost — human judgment over the LIVE spike",
    }
    (out_path / "metrics.json").write_text(json.dumps(metrics, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return metrics
