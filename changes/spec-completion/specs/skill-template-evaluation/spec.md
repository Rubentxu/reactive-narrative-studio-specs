# skill-template-evaluation — Delta Spec

## Source

- **Proposal SHA-256**: `f7e8aff6e790d28c57486a43aa1e86e2a7679d2f818f555414a4d9e111daa092`.
- **Evidence report SHA-256**: `122c61cd6a3fc1f5615c47983bc9b01776e6e68796553c70f403fa79a8cc349b`.
- **Vault problem**: `problem-013-skill-template-missing-eval-cases`.
- **Affected prose**: `docs/07-SKILLS-PACKS.md` §"Skill template requirements" (12-item list).
- **Affected outputs**: `templates/skill-template.md`.
- **Proposal capability ID (cross-reference)**: `skill-template-governance`.

## Requirements

- **REQ-SKILL-001 — Required section header.** `templates/skill-template.md` MUST contain a Markdown H2 section titled exactly `## Evaluation cases`. Section case MUST match the header style (H2).
- **REQ-SKILL-002 — Section ordering parity.** The H2 sections in `templates/skill-template.md` MUST cover the 12 items from `docs/07-SKILLS-PACKS.md` §"Skill template requirements" (numbered 1–12). The required item 12, "Evaluation cases", MUST be present.
- **REQ-SKILL-003 — Contradiction removed.** The fact pattern in problem 013 — `docs/07` lists 12 required sections while `templates/skill-template.md` lists only 11 — MUST be resolved so the two documents agree on the count and on item 12.
- **REQ-SKILL-004 — Evaluation section content.** The new `## Evaluation cases` section MUST contain at least one placeholder evaluation case (e.g. `### Case 1 — smoke test`) and SHOULD describe the expected PASS / FAIL signal pattern.

## Scenarios

### Scenario SKILL-S01 — Eval-cases header exists (covers AC-08)

- **WHEN** the apply phase updates `templates/skill-template.md` and the verifier runs `grep -nE "^## Evaluation cases$" templates/skill-template.md`
- **THEN** the command exits `0`
- **AND** the file contains exactly one line beginning with `## Evaluation cases`.

### Scenario SKILL-S02 — Section coverage matches docs/07 list (covers AC-08)

- **WHEN** the verifier enumerates H2 headers in `templates/skill-template.md`
- **THEN** the count is `12`
- **AND** items 1–11 correspond to the `docs/07` "Skill template requirements" list, in order
- **AND** item 12 is `Evaluation cases`.

### Scenario SKILL-S03 — Internal consistency check (covers AC-08)

- **WHEN** the verifier reads `docs/07-SKILLS-PACKS.md` §"Skill template requirements" and `templates/skill-template.md`
- **THEN** both enumerate the same 12 sections in the same order
- **AND** the section names appear identically (modulo capitalization).

### Scenario SKILL-S04 — Eval-cases absence at HEAD (executable today, pre-apply)

- **WHEN** the verifier runs `grep -nE "^## Evaluation cases$" templates/skill-template.md`
- **THEN** exit `1` at HEAD `62f0e7b`; apply MUST make it exit `0`.

## Out of scope

- Authoring concrete evaluation cases for any specific skill (e.g. `story-intake`). This delta validates the template only.
- Modifying the Agent Skills directory layout (`skill-name/{SKILL.md, references/, scripts/, templates/, examples/, evals/}`).
- Modifying pack structure or pack naming.
- Authoring Evaluation cases for non-skill knowledge (e.g. ADR review).
