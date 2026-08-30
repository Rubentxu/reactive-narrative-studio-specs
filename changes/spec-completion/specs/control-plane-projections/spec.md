# control-plane-projections — Delta Spec

## Source

- **Proposal SHA-256**: `f7e8aff6e790d28c57486a43aa1e86e2a7679d2f818f555414a4d9e111daa092`.
- **Evidence report SHA-256**: `122c61cd6a3fc1f5615c47983bc9b01776e6e68796553c70f403fa79a8cc349b`.
- **Vault problem**: `problem-002-control-plane-schemas-incomplete`.
- **Affected prose**: `docs/34-CONTROL-PLANE-DATA-CONTRACTS.md` (envelope shape), `docs/23-OBSERVABILITY-COST.md` (projection surface), `docs/14-PUBLISHING.md`, `docs/15-SCM-PROVENANCE.md`, `docs/33-STUDIO-HOME-WORKBENCH.md`, `docs/29-NARRATIVE-CATALOG.md`, `docs/13-CONTROL-PLANE.md`.
- **ADRs**: `ADR-014-control-plane-projections.md`, `ADR-021-narrative-catalog-projection.md`, `ADR-022-control-plane-extension-model.md`.
- **Proposal capability ID (cross-reference)**: `control-plane-projection-schemas`.

## Requirements

- **REQ-CP-001 — Thirteen projection types.** The change MUST author JSON Schemas for **exactly** these 13 Control Plane projection file types (proposal capability statement):
  1. `project`        — `cp-project.schema.json`
  2. `progress`       — `cp-progress.schema.json`
  3. `graph`          — `cp-graph.schema.json`
  4. `workflow`       — `cp-workflow.schema.json`
  5. `chapters`       — `cp-chapters.schema.json`
  6. `characters`     — `cp-characters.schema.json`
  7. `assets`         — `cp-assets.schema.json`
  8. `visual-quality` — `cp-visual-quality.schema.json`
  9. `uat`            — `cp-uat.schema.json`
  10. `approvals`     — `cp-approvals.schema.json`
  11. `costs`         — `cp-costs.schema.json`
  12. `history`       — `cp-history.schema.json`
  13. `scm`           — `cp-scm.schema.json`
- **REQ-CP-002 — `schema:` discriminator constant.** Every projection schema MUST pin `schema: "control-plane/<type>/v1"` (matching the envelope in `docs/34-CONTROL-PLANE-DATA-CONTRACTS.md` line 13). The existing `control-plane.schema.json` pins `control-plane/project/v1`.
- **REQ-CP-003 — `$ref` reachability from the envelope.** Each projection schema MUST be reachable from `specs/control-plane.schema.json` via a `$ref` declared in `$defs`. In practice, `control-plane.schema.json` MAY be extended with `$defs` referencing each projection `$id`, OR each projection may be addressable via its own `$id` plus an explicit `oneOf` member referencing all 13; both satisfy reachability.
- **REQ-CP-004 — Freshness metadata.** Every projection schema MUST declare `generatedAt` (string, ISO-8601) and `sourceRevision` (string, opaque) as required at the envelope level, matching `docs/34-CONTROL-PLANE-DATA-CONTRACTS.md` §"Projection freshness".
- **REQ-CP-005 — JSON Schema 2020-12.** All new schemas MUST use `draft/2020-12/schema` to match `specs/control-plane.schema.json` line 2.
- **REQ-CP-006 — `additionalProperties: false`.** Each projection MUST declare `additionalProperties: false` at root unless the prose explicitly permits extension. This is the project-wide schema convention recorded in `docs/28-CONTROL-PLANE-STACK.md` §"JSON Schema".
- **REQ-CP-007 — Cross-referenced in prose.** Each projection MUST be cited by at least one of: `docs/13-CONTROL-PLANE.md`, `docs/14-PUBLISHING.md`, `docs/15-SCM-PROVENANCE.md`, `docs/23-OBSERVABILITY-COST.md`, `docs/29-NARRATIVE-CATALOG.md`, `docs/33-STUDIO-HOME-WORKBENCH.md`, or `docs/34-CONTROL-PLANE-DATA-CONTRACTS.md`.

## Scenarios

### Scenario CP-S01 — Exactly 13 projection schemas exist (covers AC-04)

- **WHEN** apply lands and a verifier enumerates `specs/cp-*.schema.json`
- **THEN** the count is exactly `13`
- **AND** each filename ends in `.schema.json`
- **AND** each file's top-level `title` contains the projection's display name.

### Scenario CP-S02 — Every projection is `$ref`-reachable (covers AC-04)

- **WHEN** a verifier parses `specs/control-plane.schema.json` and walks its `$defs` map
- **THEN** the `$defs` set covers each of the 13 projection `$id` URIs declared in REQ-CP-001
- **AND** each `$ref` resolves to a JSON Schema file that exists on disk.

### Scenario CP-S03 — Each projection declares the envelope shape (covers AC-04)

- **WHEN** the verifier parses each new `cp-*.schema.json` schema
- **THEN** the root declares `required` containing `schema`, `generatedAt`, `sourceRevision`, and at least one projection-specific payload field
- **AND** `schema` is `const`-bound to `control-plane/<type>/v1`.

### Scenario CP-S04 — Single-status vocabulary consistency (covers AC-05 + AC-04)

- **WHEN** apply lands and the verifier runs `grep -REn "\\b(PASS|WARNING|BLOCKED|PENDING)\\b" specs/ docs/`
- **THEN** the only matches are inside tables that DEFINE the lowercase vocabulary (the table itself is permitted documentation), AND no check-status string takes UPPERCASE outside of the table in `docs/16-CLI.md` which itself defines the vocabulary.

## Out of scope

- Backstage wire compatibility or import of its schemas. Backstage is referenced only as inspiration (`docs/13-CONTROL-PLANE.md` §"Why Backstage is relevant").
- Computation of the projections themselves (M10 UAT scope).
- Adding projection schemas for new projection types not listed in REQ-CP-001.
- Adding runtime adapter contracts (ActiveGraph adapter binding is covered by `ADR-004-activegraph-adapter.md`).
