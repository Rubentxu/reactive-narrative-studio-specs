# overlay-vocabulary — Delta Spec

## Source

- **Proposal SHA-256**: `f7e8aff6e790d28c57486a43aa1e86e2a7679d2f818f555414a4d9e111daa092`.
- **Evidence report SHA-256**: `122c61cd6a3fc1f5615c47983bc9b01776e6e68796553c70f403fa79a8cc349b`.
- **Vault problems**: `problem-026-status-casing-mismatch`, `problem-027-docs13-example-invalid`, `problem-028-lifecycle-enum-missing`, `problem-029-capability-kinds-not-enumerated`.
- **Affected prose**: `docs/13-CONTROL-PLANE.md`, `docs/29-NARRATIVE-CATALOG.md`, `examples/catalog-project.yaml`.
- **Affected outputs**: `specs/catalog-entity.schema.json` (lifecycle + kind enums), `specs/control-plane.schema.json` (status casing alignment).
- **Proposal capability ID (cross-reference)**: `catalog-vocabulary-normalization`.

## Requirements

- **REQ-VOCAB-001 — Single status-casing vocabulary.** The change MUST commit to **lowercase** as the canonical casing of the check-status vocabulary — values `pass | warning | blocked | pending | unknown`. This vocabulary MUST be applied consistently in:
  - `specs/control-plane.schema.json` (already lowercase at HEAD)
  - `docs/13-CONTROL-PLANE.md` lines 213–238 (currently uppercase; apply MUST reconcile to lowercase)
  - `docs/16-CLI.md` if it lists any status values
  - `examples/catalog-project.yaml` (already lowercase at HEAD)
- **REQ-VOCAB-002 — Lifecycle enum (10 stages).** `specs/catalog-entity.schema.json` MUST declare `spec.lifecycle` as an `enum` containing **exactly** these 10 strings, in this order:
  - `idea`, `development`, `drafting`, `editorial`, `visual-production`, `proof`, `uat`, `ready`, `published`, `archived`.
  Source: `docs/29-NARRATIVE-CATALOG.md` lines 142–155.
- **REQ-VOCAB-003 — Capability kinds enum (6 kinds).** `specs/catalog-entity.schema.json` MUST declare `kind` as an `enum` for catalog-entity kinds. The **capability** kinds declared in `docs/29-NARRATIVE-CATALOG.md` §"Capability catalog, M10.2" are:
  - `Skill`, `Pack`, `Profile`, `Recipe`, `Workflow`, `Provider`.
  The new `kind` enum MUST allow all `kind` values from §"Initial entity kinds" (V1/M10) **and** §"Capability catalog" subsections. The proposal's "6 kinds" refers to the **M10.2 capability kinds** as a stable, finite, declarative set; the resulting `kind` enum MUST list these 6 plus the 5 V1/M10 project-side kinds (`NarrativeProject`, `Character`, `Chapter`, `Build`, `UATRun`), for a total of 11 declared kinds. The M10.2 capability kinds MUST be expressible as a sub-enum (e.g. via `allOf`/`oneOf` with an annotation) for tools that scope to capabilities only.
- **REQ-VOCAB-004 — docs/13 example uses lowercase status.** The YAML block inside `docs/13-CONTROL-PLANE.md` §"Entity envelope" and §"Lifecycle and status" MUST be re-cased to lowercase to match `examples/catalog-project.yaml`.
- **REQ-VOCAB-005 — catalog-entity rejects free-form strings.** Any string value of `kind` or `lifecycle` not in the declared enums MUST be rejected by `jsonschema.validate` with `exit 1`.

## Scenarios

### Scenario VOCAB-S01 — Status-casing unification (covers AC-05)

- **WHEN** apply lands and the verifier runs `grep -REn "\\b(PASS|WARNING|BLOCKED|PENDING|UNKNOWN)\\b" docs/ specs/ examples/` and filters out legitimate documentation of the casing
- **THEN** the only remaining matches outside the doc that defines the vocabulary are inside tables defining the casing itself
- **AND** no check-status string takes UPPERCASE in a YAML example.

### Scenario VOCAB-S02 — Lifecycle enum is exhaustive (covers AC-06)

- **WHEN** apply lands
- **THEN** `specs/catalog-entity.schema.json.properties.spec.properties.lifecycle.enum` contains all 10 REQ-VOCAB-002 values
- **AND** `jsonschema.validate({"apiVersion":"narrative.dev/v1alpha1","kind":"NarrativeProject","metadata":{"name":"x"},"spec":{"lifecycle":"visual-production"}}, catalog-entity.schema.json)` exits `0`
- **AND** the same call with `lifecycle: "Visual-Production"` exits `1`.

### Scenario VOCAB-S03 — Capability kinds are declared (covers AC-06)

- **WHEN** apply lands
- **THEN** `specs/catalog-entity.schema.json` enumerates the 11 kinds (5 V1/M10 project-side + 6 M10.2 capability-side) OR provides two non-overlapping enums discriminated by another field
- **AND** a sample with `kind: "Recipe"` validates; `kind: "RandomCapability"` is rejected.

### Scenario VOCAB-S04 — docs/13 example is re-cased (covers AC-07 + AC-05)

- **WHEN** apply lands and the verifier extracts the YAML block from `docs/13-CONTROL-PLANE.md` and validates against `catalog-entity.schema.json`
- **THEN** exit code is `0`
- **AND** all `status.checks` values are lowercase.

### Scenario VOCAB-S05 — UPPERCASE scrub at HEAD (executable today, pre-apply)

- **WHEN** the verifier runs `grep -nE "(continuity|visual|uat|publishing): (PASS|WARNING|BLOCKED|PENDING)" docs/13-CONTROL-PLANE.md`
- **THEN** lines 233–236 are matched at HEAD `62f0e7b`; apply MUST eliminate them.

## Out of scope

- Adding new lifecycle stages beyond the 10 declared in `docs/29-NARRATIVE-CATALOG.md`.
- Adding future-proof `kind` values (`Universe`, `Series`, `Edition` — all listed under "Future" in `docs/29`).
- Renaming existing kind values (`NarrativeProject`, `Character`, etc.) — those names are stable.
- Migration tooling for existing catalog YAMLs that carry UPPERCASE status (apply phase MAY include a one-shot edit, but tooling is not part of this delta).
