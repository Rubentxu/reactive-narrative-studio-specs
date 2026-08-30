# invariant-protection — Delta Spec

## Source

- **Proposal SHA-256**: `f7e8aff6e790d28c57486a43aa1e86e2a7679d2f818f555414a4d9e111daa092`.
- **Evidence report SHA-256**: `122c61cd6a3fc1f5615c47983bc9b01776e6e68796553c70f403fa79a8cc349b`.
- **Vault references**: `~/.sddk-knowledge/p-490921be0aac9b69/milestones/m1-onboard-2026-08-28.md` §"Invariants that every future change MUST preserve" (canonical enumeration of the 11 invariants).
- **Affected prose**: `docs/07-SKILLS-PACKS.md` (irreversibility bar for new ADRs), `docs/adrs/*` (existing 25 ADRs).
- **Affected outputs**: new ADR files (`docs/adrs/ADR-026-*.md`) — at most one, only if vocabulary normalization requires recording an irreversible decision.
- **Proposal capability ID (cross-reference)**: N/A (cross-cut).

## Requirements

- **REQ-INV-001 — Invariant enumeration is binding.** The pack MUST treat the 11 invariants listed in `~/.sddk-knowledge/p-490921be0aac9b69/milestones/m1-onboard-2026-08-28.md` §"Invariants that every future change MUST preserve" as the authoritative enumeration for AC-12 verification. The invariants themselves MUST NOT be modified by the spec-completion change.
- **REQ-INV-002 — Preservation proof.** Apply MUST NOT introduce any change that breaks an invariant. Specifically (by invariant number):
  1. Skills/Packs/Graph separation — schemas MAY model skills/packs but MUST NOT conflate them.
  2. Python-first, hexagonal — code-free change; satisfied trivially.
  3. ActiveGraph is an adapter — no schema binds to ActiveGraph shape.
  4. Image providers are replaceable — capability descriptor is provider-neutral.
  5. Typst is the first print-backend — only contract-bound when Typst is named.
  6. Self-contained projects / rebuildable projections — projection schemas reinforce this.
  7. Candidates separate from accepted — JSON Schemas make the distinction type-level.
  8. Control Plane projections read-only and stable — projection schemas freeze shape.
  9. Local-only/SaaS-only/hybrid — `imagePolicy` enum covers all three branches.
  10. Deterministic validation without LLM — schemas are deterministic.
  11. Human approval gates — not weakened.
- **REQ-INV-003 — ADR additions ≤ 1.** Apply MUST add **zero or one** new ADR. Adding more than one requires the reviewer (orchestrator + apply agent) to surface the count and justify against `docs/07` §"Skill template requirements"-style irreversibility bar.
- **REQ-INV-004 — No ADR contradictions.** No new or modified ADR may contradict any of the existing 25 ADRs (`ADR-001` through `ADR-025`). A contradiction is any statement that negates an existing ADR's core decision.
- **REQ-INV-005 — Change does not weaken invariants.** The change is `architecture_impact.level = local` per the proposal. The verifier MUST confirm that no touched file cross-cuts a previously-green invariant.

## Scenarios

### Scenario INV-S01 — Invariant catalogue is present and unchanged (covers AC-12)

- **WHEN** a verifier enumerates the 11 invariants via `cat ~/.sddk-knowledge/p-490921be0aac9b69/milestones/m1-onboard-2026-08-28.md | grep -c "^[0-9]\+\."` — or the equivalent assertion against the milestone file's section
- **THEN** the count is `≥ 11` (read-only check; the milestone file MUST NOT be edited by this change)
- **AND** invariants 1–11 are each pinned to their source ADR(s).

### Scenario INV-S02 — ADR count after apply is bounded (covers AC-12)

- **WHEN** apply lands
- **THEN** `ls docs/adrs/ADR-*.md | wc -l` returns `≤ 26` (25 baseline + ≤ 1 new)
- **AND** any newly added ADR MUST be referenced from `docs/07` irreversibility rationale.

### Scenario INV-S03 — No contradictions are introduced (covers AC-12)

- **WHEN** the verifier diff-greps the new ADR (or `:` if zero new ADRs) against existing ADRs looking for "instead", "replace", "supersede", "withdraw", "invalidate", "no longer" patterns
- **THEN** no contradicting language refers to a baseline ADR by number
- **AND** the diff between `docs/adrs/ADR-001..ADR-025.md` from HEAD `62f0e7b` to apply-merge has zero lines removed from any existing ADR.

### Scenario INV-S04 — Architecture impact is `local` (covers AC-12)

- **WHEN** the verifier inspects the proposal §"Architecture Impact" and the apply commits
- **THEN** the level stated is `local`
- **AND** no touched file is in `templates/gitignore.txt` exclusion, no `MANIFEST.json` removal, and no new top-level directory outside `specs/` (with the explicit exception of `control-plane/fixtures/` if apply opts to land ComfyUI fixtures there per proposal problem 015).

### Scenario INV-S05 — ADR absence of new file at HEAD (executable today, pre-apply)

- **WHEN** the verifier runs `ls docs/adrs/ADR-026*.md 2>/dev/null | wc -l`
- **THEN** the result is `0` at HEAD `62f0e7b`
- **AND** apply MAY raise it to `0` or `1`.

## Out of scope

- Tooling that *enforces* the 11 invariants mechanically (an invariant checker is a separate change; see proposed follow-up).
- Re-evaluating or amending the 11 invariants (they are out-of-scope per `docs/07` irreversibility bar).
- ADRs addressing deferred follow-ups (`spec-completion-followup`).
- Any deletion of an existing ADR.
- Modifying the `~/.sddk-knowledge/` vault (out-of-scope for any spec-pack change; vault is canonical record).

## Open question for orchestrator

> **NOTE**: AC-12 has no automated enforcement tool today. This spec relies on
> a verifier manually (or via a small shell script) reading the proposal
> `architecture_impact.level` field, diffing ADR files, and checking the
> invariant reference list. **If** the orchestrator decides an automated
> invariant guard is part of this change's scope, treat that as a new
> capability that does not exist yet and call it out — do **not** fabricate a
> tool here.
