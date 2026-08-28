---
name: example-skill
description: Explain clearly when this narrative skill should be used.
---

# Skill name

## Purpose

## When to use

## When NOT to use

## Inputs

## Outputs

## Procedure

## Constraints

## Failure modes

## Verification

## Examples

## References

## Evaluation cases

A skill MUST declare the evaluation cases that distinguish a passing run
from a failing one. At minimum one placeholder case is required; the
expected signal is the lowercase verdict vocabulary used everywhere else
in the pack: `pass | warning | blocked | pending | unknown`.

### Case 1 — smoke test

Inputs: the minimal invocation this skill is designed for.

Expected:

- A `run.started` event is emitted under `.narrative/events/`.
- The skill returns a verdict whose token is in `{pass, warning, blocked, pending, unknown}`.
- If the verdict is not `pass`, the skill MUST also emit a `failure`
  event whose payload includes a `reason` string.
