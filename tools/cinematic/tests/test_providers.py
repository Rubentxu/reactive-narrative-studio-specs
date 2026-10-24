"""Provider port structure: typed results, budget accounting, no network.

Requirements: REQ-CIN-7, REQ-CIN-8
"""

import ast
import hashlib
from pathlib import Path

import pytest

from cinematic.budget import Budget, BudgetExceeded, BudgetLedger, FailureReason
from cinematic.providers.fake import FakeProvider
from cinematic.providers.port import (
    ProviderCapabilities,
    VideoGenerationFailure,
    VideoGenerationRequest,
    VideoGenerationSuccess,
)

EXAMPLE_REQUEST = VideoGenerationRequest(
    shot_id="SC12-SH03",
    prompt="Cinematic tracking shot.",
    motion_reference=None,
    style_references=(),
    character_references=(),
    duration_seconds=6.0,
    aspect_ratio="16:9",
    budget=Budget(max_attempts=2, max_credits=40.0),
)


def _run_fake(tmp_path, failures=0, budget=None):
    provider = FakeProvider(output_dir=tmp_path, failures_before_success=failures)
    request = EXAMPLE_REQUEST if budget is None else VideoGenerationRequest(**{**EXAMPLE_REQUEST.__dict__, "budget": budget})
    return provider, provider.generate(request)


def test_port_declares_capabilities_before_generation(tmp_path):
    provider = FakeProvider(output_dir=tmp_path)
    capabilities = provider.capabilities()
    assert isinstance(capabilities, ProviderCapabilities)
    assert capabilities.provider_id == "fake"
    assert capabilities.live_capable is False


def test_success_result_is_fully_typed_and_hashed(tmp_path):
    _, result = _run_fake(tmp_path)
    assert isinstance(result, VideoGenerationSuccess)
    assert result.provider_id == "fake"
    assert result.attempts == 1
    assert result.cost_credits == 10.0
    artifact = Path(result.artifact_path)
    assert artifact.is_file()
    assert result.artifact_sha256 == hashlib.sha256(artifact.read_bytes()).hexdigest()


def test_failure_is_a_value_not_an_exception(tmp_path):
    _, result = _run_fake(tmp_path, failures=5)
    assert isinstance(result, VideoGenerationFailure)
    assert result.reason is FailureReason.PROVIDER_ERROR
    assert result.attempts == 2
    assert result.cost_credits == 20.0


def test_never_exceeds_attempt_budget(tmp_path):
    _, result = _run_fake(tmp_path, failures=5, budget=Budget(max_attempts=3, max_credits=100.0))
    assert result.attempts == 3
    assert result.cost_credits == 30.0


def test_never_exceeds_credit_budget(tmp_path):
    _, result = _run_fake(
        tmp_path,
        failures=5,
        budget=Budget(max_attempts=10, max_credits=25.0),
    )
    assert result.attempts == 2
    assert result.cost_credits == 20.0
    assert isinstance(result, VideoGenerationFailure)


def test_ledger_rejects_overrun():
    ledger = BudgetLedger(Budget(max_attempts=1, max_credits=5.0))
    assert ledger.can_attempt(5.0)
    ledger.record(5.0)
    assert not ledger.can_attempt(0.0)
    with pytest.raises(BudgetExceeded):
        ledger.record(1.0)


def test_fake_is_deterministic(tmp_path):
    _, first = _run_fake(tmp_path / "a")
    _, second = _run_fake(tmp_path / "b")
    assert first.receipt == second.receipt
    assert first.artifact_sha256 == second.artifact_sha256


def test_no_network_imports_in_provider_modules():
    root = Path(__file__).resolve().parents[1] / "cinematic"
    forbidden = {"socket", "urllib", "http", "requests", "httpx"}
    for source in root.rglob("*.py"):
        tree = ast.parse(source.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                assert all(alias.name.split(".")[0] not in forbidden for alias in node.names), source
            elif isinstance(node, ast.ImportFrom):
                assert (node.module or "").split(".")[0] not in forbidden, source
