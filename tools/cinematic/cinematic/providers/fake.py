"""A deterministic, network-free video provider for tests and dry runs.

The fake satisfies the same port as any future real provider: capabilities
first, then generate returning a typed result. It never touches the network
and never exceeds the declared budget; failures are simulated by construction
(failures_before_success) and every attempt is accounted.
"""

from __future__ import annotations

from pathlib import Path

from cinematic.budget import BudgetLedger, FailureReason
from cinematic.providers.port import (
    ProviderCapabilities,
    VideoGenerationFailure,
    VideoGenerationRequest,
    VideoGenerationResult,
    VideoGenerationSuccess,
    sha256_file,
)

_FAKE_CLIP_BYTES = (
    b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom"
    b"cinematic-fake-clip\n"
)

_PLACEHOLDER_HEADER = "cinematic fake clip\n"


class FakeProvider:
    """In-memory provider producing fixed placeholder clips at a fixed cost."""

    def __init__(
        self,
        output_dir: str | Path = ".",
        cost_per_attempt_credits: float = 10.0,
        failures_before_success: int = 0,
    ) -> None:
        self._output_dir = Path(output_dir)
        self._cost = cost_per_attempt_credits
        self._failures_before_success = failures_before_success

    def capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            provider_id="fake",
            supports_motion_reference=True,
            max_duration_seconds=60.0,
            aspect_ratios=("16:9", "9:16", "1:1"),
            live_capable=False,
        )

    def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        ledger = BudgetLedger(request.budget)
        cost = self._cost
        for attempt in range(1, request.budget.max_attempts + 1):
            if not ledger.can_attempt(cost):
                return VideoGenerationFailure(
                    reason=FailureReason.BUDGET_EXHAUSTED,
                    detail=(
                        f"budget exhausted after {ledger.attempts} attempts / {ledger.spent} credits"
                        f" (limits: {request.budget.max_attempts} attempts / {request.budget.max_credits} credits)"
                    ),
                    attempts=ledger.attempts,
                    cost_credits=ledger.spent,
                    provider_invoked=True,
                )
            ledger.record(cost)
            if attempt <= self._failures_before_success:
                continue
            return self._succeed(request, attempt, ledger)

        return VideoGenerationFailure(
            reason=FailureReason.PROVIDER_ERROR,
            detail=(
                f"provider failed on every attempt ({self._failures_before_success} injected failures"
                f", budget allowed {request.budget.max_attempts})"
            ),
            attempts=ledger.attempts,
            cost_credits=ledger.spent,
            provider_invoked=True,
        )

    def _succeed(self, request: VideoGenerationRequest, attempt: int, ledger: BudgetLedger) -> VideoGenerationSuccess:
        artifact_dir = self._output_dir
        artifact_dir.mkdir(parents=True, exist_ok=True)
        artifact_path = artifact_dir / f"fake-clip-{request.shot_id}.mp4"
        body = f"{_PLACEHOLDER_HEADER}shot: {request.shot_id}\nattempt: {attempt}\n"
        artifact_path.write_bytes(_FAKE_CLIP_BYTES + body.encode("utf-8"))
        receipt = f"fake-{request.shot_id}-attempt-{attempt}"
        return VideoGenerationSuccess(
            provider_id="fake",
            model="fake-static",
            receipt=receipt,
            artifact_path=str(artifact_path),
            artifact_sha256=sha256_file(artifact_path),
            attempts=ledger.attempts,
            cost_credits=ledger.spent,
        )
