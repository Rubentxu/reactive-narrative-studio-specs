"""Spike dry run: metric contract and fake-only orchestration.

Requirements: REQ-CIN-12
"""

import json
from pathlib import Path

from cinematic.spike import run_spike_dry

REPO_ROOT = Path(__file__).resolve().parents[3]
EXAMPLE = REPO_ROOT / "examples/video/shot-plan.yaml"

METRIC_FIELDS = (
    "attempts",
    "cost_credits",
    "elapsed_seconds",
    "camera_adherence",
    "spatial_continuity",
    "subject_consistency",
    "visual_quality",
    "human_acceptability_1_5",
)


def test_metrics_contain_all_fields_with_humans_left_empty(tmp_path):
    metrics = run_spike_dry(EXAMPLE, tmp_path)
    assert metrics["spike"] == "SPK-VIDEO-01"
    assert metrics["mode"] == "dry-run"
    assert metrics["verdict"] is None
    for variant in ("A", "B"):
        payload = metrics["variants"][variant]
        for field in METRIC_FIELDS:
            assert field in payload, (variant, field)
        for human_field in METRIC_FIELDS[3:]:
            assert payload[human_field] is None, (variant, human_field)
        assert payload["attempts"] >= 1
        assert "elapsed_seconds" in payload and payload["elapsed_seconds"] >= 0.0


def test_machine_observables_are_populated_and_attempted(tmp_path):
    metrics = run_spike_dry(EXAMPLE, tmp_path)
    variant_a = metrics["variants"]["A"]
    variant_b = metrics["variants"]["B"]
    assert variant_a["artifact"]["path"].startswith("variant-A/")
    assert variant_a["artifact"]["sha256"]
    assert variant_b["provider"] == "fake"
    assert variant_b["cost_credits"] > 0.0
    logged_variants = {entry["variant"] for entry in metrics["attemptsLog"]}
    assert logged_variants == {"A", "B"}
    for entry in metrics["attemptsLog"]:
        assert entry["outcome"] in {"success", "failure"}


def test_both_variants_produce_artifacts_on_disk(tmp_path):
    metrics = run_spike_dry(EXAMPLE, tmp_path)
    for variant in ("A", "B"):
        artifact = metrics["variants"][variant]["artifact"]
        path = tmp_path / artifact["path"]
        assert path.is_file(), (variant, path)


def test_metrics_file_is_written_and_deterministic_in_shape(tmp_path):
    first = run_spike_dry(EXAMPLE, tmp_path / "one")
    second = run_spike_dry(EXAMPLE, tmp_path / "two")
    persisted = json.loads((tmp_path / "one" / "metrics.json").read_text(encoding="utf-8"))
    assert persisted == first
    strip_volatile = lambda m: {k: v for k, v in m.items() if k not in {"variants", "attemptsLog"}}
    assert strip_volatile(first) == strip_volatile(second)
