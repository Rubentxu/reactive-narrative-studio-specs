"""Live gate: denial is typed, default, and provider-free.

Requirements: REQ-CIN-9
"""

from pathlib import Path

from cinematic.budget import Budget, FailureReason, evaluate_live_gate
from cinematic.providers.port import VideoGenerationFailure, VideoGenerationRequest
from cinematic.providers.record import record_provider_run

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


def test_live_without_opt_in_is_denied_without_invoking_provider():
    denial = evaluate_live_gate(opt_in=False, budget=EXAMPLE_REQUEST.budget)
    assert isinstance(denial, VideoGenerationFailure)
    assert denial.reason is FailureReason.LIVE_NOT_ENABLED
    assert denial.provider_invoked is False
    assert denial.attempts == 0
    assert denial.cost_credits == 0.0


def test_opt_in_without_budget_is_denied_as_invalid():
    denial = evaluate_live_gate(opt_in=True, budget=None)
    assert denial.reason is FailureReason.BUDGET_INVALID

    broken = Budget(max_attempts=0, max_credits=10.0)
    denial = evaluate_live_gate(opt_in=True, budget=broken)
    assert denial.reason is FailureReason.BUDGET_INVALID

    negative = Budget(max_attempts=2, max_credits=-1.0)
    denial = evaluate_live_gate(opt_in=True, budget=negative)
    assert denial.reason is FailureReason.BUDGET_INVALID


def test_valid_opt_in_and_budget_enables_the_path():
    assert evaluate_live_gate(opt_in=True, budget=EXAMPLE_REQUEST.budget) is None


def test_denial_is_recorded_provider_neutral(tmp_path):
    request_file = tmp_path / "request.yaml"
    request_file.write_text("shotId: SC12-SH03\n", encoding="utf-8")
    denial = evaluate_live_gate(opt_in=False, budget=EXAMPLE_REQUEST.budget)
    recorded = record_provider_run(tmp_path, request_file, EXAMPLE_REQUEST, denial)
    assert recorded.result_path.is_file()
    assert recorded.provenance_path.is_file()
    content = recorded.result_path.read_text(encoding="utf-8")
    assert '"providerInvoked": false' in content
    assert '"reason": "LIVE_NOT_ENABLED"' in content
