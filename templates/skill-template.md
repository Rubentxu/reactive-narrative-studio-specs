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

## Divergence with reference skills

The three reference skills in `examples/skills/` (`character-consistency`,
`narrative-arc`, `scene-validator`) follow the canonical 12-section
template mandated by `docs/07`. They share 11 `## section` headings with
this template but DO NOT share bodies — each skill specializes its
content for the literary-craft aspect it covers. This is the canonical
pattern working as designed, not a defect.

| Template section | Reference skills section | Notes |
|---|---|---|
| When to use | When to invoke | naming convention |
| Procedure | Workflow | naming convention |
| References | Cross-references | naming convention |
| When NOT to use | (absent) | template-only |
| Constraints | (absent) | template-only |
| Verification | (absent) | template-only |
| (absent) | Edge cases | reference-skills-only |
| (absent) | Acceptance criteria | reference-skills-only |

DEBT-SMELLS-NEW-001 and DEBT-DUPLICATION-NEW-001 are closed by this
annotation as "intentional by-design, documented" (m10 cycle, 2026-08-28).
