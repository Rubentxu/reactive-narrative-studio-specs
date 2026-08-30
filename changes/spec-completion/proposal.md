# Proposal: spec-completion — close blocker B-001 + normalize overlay-introduced inconsistencies

- **Change id**: `spec-completion`
- **Cycle**: `p-490921be0aac9b69/m3-explore-2026-08-28`
- **Evidence**: `explore-report.md` SHA-256 `122c61cd6a3fc1f5615c47983bc9b01776e6e68796553c70f403fa79a8cc349b`
- **Baseline**: branch `main`, HEAD `62f0e7b`, working tree clean
- **Rounds**: 1 (this change) + 1 deferred follow-up (`spec-completion-followup`)

## Intent

The `reactive-narrative-studio-specs` pack is **prose-consistent but machine-incomplete**.
The explore phase read 95 SHA-256-fingerprinted files across 25 ADRs and 35 docs and found
**zero violations of the 11 project invariants** — the pack's reasoning is sound. What is
missing is the machine-readable layer: of an estimated ~15 required contract families only
5 JSON Schemas ship (`project`, `control-plane`, `catalog-entity`,
`control-plane-extension`, `creation-recipe`).

That gap is not cosmetic. It is load-bearing:

- **B-001 blocks M1.** `narrative inspect --json` is a Slice A step-5 deliverable
  (`docs/25-IMPLEMENTATION-STARTER.md`) and its output contract is undefined. M1 cannot
  exit and UAT-M1-01 cannot be codified.
  → `~/.sddk-knowledge/p-490921be0aac9b69/problems/problem-001-inspect-json-schema-missing.md`
- **M10 cannot exit.** 12 of 13 Control Plane projection file types have no schema; only
  the envelope is specified.
  → `~/.sddk-knowledge/p-490921be0aac9b69/problems/problem-002-control-plane-schemas-incomplete.md`
- **M0 is "achieved" but untestable.** 3 of 5 example YAMLs carry no `schema:`
  discriminator, so UAT-M0-01's machine-check step has nothing to assert.
  → `~/.sddk-knowledge/p-490921be0aac9b69/problems/problem-014-examples-lack-schema-discriminator.md`
- **The Control Plane overlay (commit `521b02f`) added value and added drift.** Four new
  inconsistencies were introduced between the overlay's docs and its schemas: status
  casing, an invalid `docs/13` example, an unenforced lifecycle enum, and a free-string
  `kind` field.
  → `problem-026-status-casing-mismatch.md`, `problem-027-docs13-example-invalid.md`,
  `problem-028-lifecycle-enum-missing.md`, `problem-029-capability-kinds-not-enumerated.md`

Every downstream apply slice validates against contracts that do not yet exist. This change
authors them. It MUST land before any code-bearing slice is proposed.

`MANIFEST.json` was already realigned with the overlay in commit `62f0e7b`; this proposal
RECOGNIZES that work and MUST NOT re-apply it, only re-verify it after new files land
(problem-020, deferred).

## Scope

### In Scope

19 problems: **1 blocker + 18 recommended**. Spec-pack artefacts only — Markdown, JSON
Schema, YAML, UAT documents.

| Axis | Problems | Deliverable |
|---|---|---|
| cli | 001 (blocker), 011, 012 | `inspect`/`next` JSON output schemas; `check` exit-code table |
| control-plane | 002, 026, 027, 028, 029 | 12 projection schemas; casing + lifecycle + kind vocabularies |
| runtime | 003, 004 | `narrative.lock`, `narrative-decision/v1` schemas |
| ir-narrative | 005 | Scene / Promise / Fact / narrative-object schemas |
| ir-visual | 006 | Visual DNA / Scene Visual Contract / Style Bible schemas |
| ir-sequential | 007 | Page / Panel / Dialogue / Caption / Balloon / SFX schemas |
| observability | 008 | JSONL event-log schema |
| image-pipeline | 009, 015 | Provider capability descriptor schema; ComfyUI workflow fixtures |
| publishing | 010 | Publishing receipt schema |
| governance | 013 | `templates/skill-template.md` gains `## Evaluation cases` |
| uat | 014 | `schema:` discriminators on 3 example YAMLs |

Approximately **22 new schema files** under `specs/` and **~19 modified** Markdown/YAML
files. No file outside the spec pack is touched.

### Out of Scope

- **Python tooling, package scaffolding, CLI implementation, test harness.** M2+ per
  `docs/19-ROADMAP.md`. This change ships contracts, not code.
- **CI workflows.** Explore risk 6 notes there is no CI gate for schema validity; adding
  one is a separate change (it introduces tooling).
- **Runtime DB and ActiveGraph wiring.** ADR-004 keeps ActiveGraph an adapter; nothing here
  touches it.
- **Round 2 — `spec-completion-followup`** (10 nice-to-have problems, deferred verbatim):
  `problem-016` Typst templates, `problem-017` reference skills, `problem-018`
  `.gitattributes` template, `problem-019` M13–M16 UATs, `problem-020` MANIFEST
  re-verification, `problem-021` genre extensions, `problem-022` relation vocabulary,
  `problem-023` `asset:sha256:` URI scheme, `problem-024` provenance shape, `problem-025`
  Pillow-vs-pyvips ADR.

## Capabilities

> CONTRACT with sddk-spec. Vault research: only `capability-m2-init-2026-08-28` exists, and
> it does not cover any surface below. Therefore all entries are new; no existing capability
> is modified.

### New Capabilities

- `cli-json-contracts`: output schema for `narrative inspect --json` (B-001) and
  `narrative next --json`, plus the normative `narrative check` exit-code convention.
- `control-plane-projection-schemas`: JSON Schemas for the 12 unschematized projection
  files (project, progress, graph, workflow, chapters, characters, assets, visual-quality,
  uat, approvals, costs, history, scm), consistent with the existing envelope schema.
- `catalog-vocabulary-normalization`: single normative vocabulary for check status casing,
  entity `lifecycle`, and entity `kind`; `docs/13` example made schema-valid.
- `runtime-state-contracts`: schemas for `narrative.lock` and `narrative-decision/v1`.
- `narrative-ir-schemas`: Scene, Promise, Fact and the shared narrative-object envelope.
- `visual-ir-schemas`: Visual DNA, Scene Visual Contract, Style Bible.
- `sequential-art-ir-schemas`: Sequential Work, Page, Panel, Dialogue, Caption, Balloon, SFX.
- `event-log-schema`: canonical JSONL event envelope backing replay and audit.
- `provider-capability-schema`: image-provider capability descriptor (ADR-011 replaceability).
- `publishing-receipt-schema`: publishing receipt contract (ADR-013 Typst backend).
- `comfyui-workflow-fixtures`: reference ComfyUI workflow fixtures declared by `docs/12`.
- `skill-template-governance`: `## Evaluation cases` section required by `docs/07`.
- `example-schema-discriminators`: every `examples/*.yaml` carries a resolvable discriminator.

### Modified Capabilities

- None. No existing spec-level requirement changes; this change adds machine-readable
  contracts for behaviour that is already normatively described in prose.

## Approach

**Split-by-problem, not split-by-doc.** Each problem node is self-contained, carries its own
evidence, and maps to one capability. Splitting by document would fan a single schema
decision across many files and lose the per-problem acceptance trace.

The change SHOULD be applied in four ordered waves. Later waves depend on vocabulary fixed
by earlier ones.

| Wave | Content | Rationale |
|---|---|---|
| 1 | `catalog-vocabulary-normalization` (026–029) | Purely textual/enum. Fixes casing, lifecycle and kind BEFORE any schema references them. Prevents re-work. |
| 2 | `cli-json-contracts` (001, 011, 012) | Unblocks B-001 / M1. Smallest path to a demonstrable win. |
| 3 | `control-plane-projection-schemas` (002) + `runtime-state-contracts` (003, 004) | Largest surface; needs wave-1 vocabulary. Unblocks M10. |
| 4 | IR schemas (005–007), `event-log-schema` (008), `provider-capability-schema` (009), `publishing-receipt-schema` (010), `comfyui-workflow-fixtures` (015), `skill-template-governance` (013), `example-schema-discriminators` (014) | Independent leaves; parallelizable. |

Per-artefact tie-in, where the change is **purely textual** (no schema authored, only prose
or enum reconciliation): `docs/07-SKILLS-PACKS.md` (template requirement),
`docs/13-CONTROL-PLANE.md` (`apiVersion` in example + casing), `docs/16-CLI.md` (exit-code
table + `--json` schema references), `docs/29-NARRATIVE-CATALOG.md` (lifecycle enum now
enforced), `docs/14-PUBLISHING.md` and `docs/15-SCM-PROVENANCE.md` (schema back-references),
`uat/UAT-M0-01.md` and `uat/UAT-M1-01.md` (make the machine-check step explicit),
`templates/skill-template.md` (new section).

Schema conventions the apply phase MUST follow:

- JSON Schema draft consistent with the 5 shipped schemas; no new draft version.
- Every schema declares `$id`, `title`, `additionalProperties: false` unless the prose
  explicitly permits extension.
- Every schema is reachable from at least one doc and exercised by at least one example or
  UAT step; orphan schemas MUST NOT be added.
- Composite IR families MAY use one file with `$defs` rather than one file per node type,
  provided each node type is individually addressable by `$ref`.

New ADRs SHOULD be limited to at most **one** (recording the normalized catalog vocabulary
if the casing decision proves irreversible). Adding more MUST be justified against the
irreversibility bar in `docs/07`.

## Quality Intent

- Production surfaces: `specs/**`, `examples/**`, `templates/skill-template.md`, `uat/**`,
  and the nine `docs/` files listed above. No executable surface.
- Changed public APIs: none at runtime; the JSON Schemas BECOME the public contract surface.
- Readiness dimensions: contract completeness, internal consistency, testability of UATs.
- Required real boundaries: schema-validation of the real `examples/*.yaml` files against the
  real `specs/*.schema.json` files — this cannot be proven with fixtures alone.

## Architecture Impact

- Level: `local`
- Evidence: `specs/`, `examples/`, `templates/`, `uat/`, `docs/` — documentation and contract
  artefacts only. No module, deployable, or boundary is created or moved. The 11 invariants
  are preserved unchanged; in particular invariant 8 (Control Plane projections read-only and
  stable) is *reinforced* by schematizing the projections rather than altering them.
- Architecture intent: N/A — level is `local`, so no C4 intent preview is produced.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `specs/` | New | ~22 JSON Schemas (inspect, next, lock, decision, narrative/visual/sequential IR, event, provider-capability, publishing-receipt, visual-spec, profile, 12 control-plane projections) |
| `specs/catalog-entity.schema.json` | Modified | `lifecycle` and `kind` enums added (028, 029) |
| `specs/control-plane.schema.json` | Modified | Status casing aligned with normalized vocabulary (026) |
| `examples/` | Modified | `schema:` discriminators on `visual-spec.yaml`, `middle-grade-profile.yaml`, `catalog-project.yaml`; `imagePolicy` enum reconciled in `creation-recipe-middle-grade.yaml` |
| `docs/` (9 files) | Modified | Textual reconciliation and schema back-references only |
| `templates/skill-template.md` | Modified | `## Evaluation cases` section (013) |
| `uat/` (≥2 files) | Modified | Machine-check steps made explicit and schema-referencing |
| `control-plane/` | New | ComfyUI workflow fixtures (015) if the pack's fixture home is here; otherwise `examples/fixtures/` |
| `MANIFEST.json` | Verify only | Already aligned in `62f0e7b`; re-verification deferred to round 2 (problem-020) |

## Risks

Adopted from `explore-report.md` §Risks.

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Schema inflation** — ~22 schemas in one change overloads review attention | High | Four-wave ordering above; waves 1–2 are independently reviewable and independently valuable. If review stalls, waves 3–4 MAY be split into a second change without invalidating waves 1–2. |
| **ADR count growth** past the `docs/07` advisory (25 ADRs today) | Med | Hard cap of one new ADR; every candidate must clear the irreversibility bar. Enum choices are recorded in the schema itself, not in a new ADR. |
| **Overlay ↔ original doc drift compounding** — the overlay replaced 14 docs and added concepts (catalog, recipes) that do not fully map to the original schema | High | Wave 1 exists precisely to close this first, before any new schema references the drifting vocabulary. |
| **ActiveGraph maturity** — upstream is young (`docs/06` L127; R-01 in `docs/26-RISKS.md` ranks it High) | Med | Out of scope here; ADR-004 keeps it behind an adapter. Nothing in this change binds a contract to ActiveGraph shapes. |
| **No CI to gate schema validity** — drift is invisible until someone looks | High | Acceptance criteria below require a manual validation run with recorded exit codes; a CI change is proposed separately. |
| Working-tree cleanliness at apply time | Low | Baseline `62f0e7b` is clean and verified; apply starts from a known state. |

## Rollback Plan

This is a Git-native spec pack with no runtime state, no migrations, and no deployed
artefacts, so rollback is a pure content revert.

1. Every wave lands as its own commit, prefixed `spec(spec-completion/wave-N): …`.
2. The change is released under the tag pattern **`spec-completion-vN`** (`spec-completion-v1`
   for this round; `spec-completion-followup-v1` for round 2).
3. Full rollback: `git revert <release-tag>` — or `git revert --no-commit <first>..<last>`
   for the wave range — then re-verify with the acceptance runs below.
4. Partial rollback: revert individual wave commits. Waves 2–4 are revertible independently.
   Reverting wave 1 alone is NOT safe once waves 3–4 have landed, because they consume the
   normalized vocabulary; revert wave 1 last.
5. No remote exists, so rollback is local and requires no coordination.

## Dependencies

- Baseline commits `fd9c176`, `521b02f`, `62f0e7b` MUST remain unamended.
- A JSON Schema validator available to the verify phase (`sddk-json-schema-validate` or an
  equivalent invoked with recorded argv and exit code).
- No external service, network access, or third-party API.

## Success Criteria

| id | Criterion | Milestone / UAT |
|---|---|---|
| AC-01 | `specs/inspect.schema.json` exists, is referenced from `docs/16-CLI.md` and `docs/25-IMPLEMENTATION-STARTER.md` Slice A step 5, and blocker B-001 is closed | M1 / UAT-M1-01 |
| AC-02 | `sddk-json-schema-validate` validates every `examples/*.yaml` against its declared `specs/*.schema.json` and exits `0` | M0 / UAT-M0-01 |
| AC-03 | All 5 `examples/*.yaml` carry a resolvable discriminator (`schema:` or a documented `apiVersion:`) | M0 / UAT-M0-01 |
| AC-04 | All 13 Control Plane projection file types have a schema, each `$ref`-reachable from `control-plane.schema.json` | M10 / UAT-M10-01..05 |
| AC-05 | Exactly one status-casing vocabulary appears across `docs/**` and `specs/**`; a repo-wide grep for the rejected casing returns no matches | M10 |
| AC-06 | `catalog-entity.schema.json` enforces both the `lifecycle` enum (10 stages, `docs/29`) and the `kind` enum (6 kinds, `docs/29`) | M10 |
| AC-07 | The `docs/13-CONTROL-PLANE.md` example YAML validates against the schema it cites, exit `0` | M10 |
| AC-08 | `templates/skill-template.md` contains `## Evaluation cases`; the `docs/07` ↔ template contradiction is gone | M0 |
| AC-09 | `narrative check` exit-code convention is a normative table in `docs/16-CLI.md`; every code is distinct and documented | M1 |
| AC-10 | `specs/event.schema.json` exists and every event type named in `docs/` resolves to a `$defs` entry | M3 |
| AC-11 | Zero orphan schemas: every file in `specs/` is referenced by at least one doc, example, or UAT | M0 |
| AC-12 | All 11 project invariants still hold; ADR additions ≤ 1; no ADR contradicts another | M0 |
| AC-13 | `sddk vault validate` reports `errors: 0` after the change is recorded | M3 |

## Vault References

- `~/.sddk-knowledge/p-490921be0aac9b69/problems/summary-m3-explore-2026-08-28.md`
- `~/.sddk-knowledge/p-490921be0aac9b69/problems/problem-001-inspect-json-schema-missing.md`
- `~/.sddk-knowledge/p-490921be0aac9b69/problems/problem-002-control-plane-schemas-incomplete.md`
- `~/.sddk-knowledge/p-490921be0aac9b69/problems/problem-013-skill-template-missing-eval-cases.md`
- `~/.sddk-knowledge/p-490921be0aac9b69/problems/problem-014-examples-lack-schema-discriminator.md`
- `~/.sddk-knowledge/p-490921be0aac9b69/problems/problem-026-status-casing-mismatch.md`
- `~/.sddk-knowledge/p-490921be0aac9b69/problems/problem-027-docs13-example-invalid.md`
- `~/.sddk-knowledge/p-490921be0aac9b69/problems/problem-028-lifecycle-enum-missing.md`
- `~/.sddk-knowledge/p-490921be0aac9b69/problems/problem-029-capability-kinds-not-enumerated.md`
- Cycle artifact: `p-490921be0aac9b69/m3-explore-2026-08-28/explore-report.md`
  (SHA-256 `122c61cd6a3fc1f5615c47983bc9b01776e6e68796553c70f403fa79a8cc349b`)
