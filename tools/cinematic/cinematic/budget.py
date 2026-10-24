"""Spending limits for automated video generation and the live-provider gate.

Budget accounting happens before every attempt: an attempt that would exceed
the attempt count or the credit cap is never launched. Live generation is
denied unless explicitly opted in AND backed by a valid budget, so routine runs
can never reach a billable provider.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass


@dataclass(frozen=True)
class Budget:
    """Hard limits for one generation request."""

    max_attempts: int
    max_credits: float


class BudgetExceeded(Exception):
    """Raised when recording a cost would break the declared budget."""


class BudgetLedger:
    """Pre-attempt accounting for one budget.

    ``can_attempt`` decides whether the next attempt is allowed under both
    limits; ``record`` registers a spent cost and fails loudly on any overrun,
    keeping the ledger the single source of truth for attempts and credits.
    """

    def __init__(self, budget: Budget) -> None:
        self._budget = budget
        self._attempts = 0
        self._spent = 0.0

    @property
    def attempts(self) -> int:
        return self._attempts

    @property
    def spent(self) -> float:
        return self._spent

    def can_attempt(self, cost: float) -> bool:
        next_attempts = self._attempts + 1
        return next_attempts <= self._budget.max_attempts and self._spent + cost <= self._budget.max_credits

    def record(self, cost: float) -> None:
        self._attempts += 1
        self._spent += cost
        if self._attempts > self._budget.max_attempts or self._spent > self._budget.max_credits + 1e-9:
            raise BudgetExceeded(
                f"budget broken after {self._attempts} attempts / {self._spent} credits"
                f" (limits: {self._budget.max_attempts} / {self._budget.max_credits})"
            )


class FailureReason(str, enum.Enum):
    """Typed causes for a denied or failed generation."""

    LIVE_NOT_ENABLED = "LIVE_NOT_ENABLED"
    BUDGET_INVALID = "BUDGET_INVALID"
    BUDGET_EXHAUSTED = "BUDGET_EXHAUSTED"
    PROVIDER_ERROR = "PROVIDER_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"


def evaluate_live_gate(opt_in: bool, budget: Budget | None) -> "VideoGenerationFailure | None":
    """Decide whether a live generation may proceed.

    Returns a typed denial when the operator has not opted in, or when the opt-in
    exists but no valid budget backs the request. ``None`` means the live path is
    authorized. Imported lazily to keep the port as the single dependency edge.
    """

    from cinematic.providers.port import VideoGenerationFailure

    if not opt_in:
        return VideoGenerationFailure(
            reason=FailureReason.LIVE_NOT_ENABLED,
            detail="live generation requires explicit opt-in; it is denied by default",
            attempts=0,
            cost_credits=0.0,
            provider_invoked=False,
        )
    if budget is None or budget.max_attempts < 1 or budget.max_credits <= 0:
        return VideoGenerationFailure(
            reason=FailureReason.BUDGET_INVALID,
            detail="live generation requires a valid budget (max_attempts >= 1, max_credits > 0)",
            attempts=0,
            cost_credits=0.0,
            provider_invoked=False,
        )
    return None
