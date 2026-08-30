# narrative-init-cli — Delta Spec

## Source

- **Proposal SHA-256**: `f7e8aff6e790d28c57486a43aa1e86e2a7679d2f818f555414a4d9e111daa092` (`changes/spec-completion/proposal.md`).
- **Evidence report SHA-256**: `122c61cd6a3fc1f5615c47983bc9b01776e6e68796553c70f403fa79a8cc349b` (`p-490921be0aac9b69/m3-explore-2026-08-28/explore-report.md`).
- **Vault problems**: `problem-001-inspect-json-schema-missing` (blocker B-001), `problem-011-narrative-next-json-schema-missing`, `problem-012-narrative-check-exit-code-table-missing`.
- **Affected prose**: `docs/16-CLI.md`, `docs/25-IMPLEMENTATION-STARTER.md` (Slice A step 5).
- **Affected outputs**: `specs/inspect.schema.json` (to be created by apply), `specs/next.schema.json` (to be created).
- **Proposal capability IDs (cross-reference)**: `cli-json-contracts`.

## Requirements

- **REQ-CLI-001 — Inspect JSON contract.** The pack MUST provide a JSON Schema file `specs/inspect.schema.json` that defines the structured payload returned by `narrative inspect --json`. The schema MUST be written against JSON Schema draft `2020-12` and MUST declare a stable `$id`. Acceptance of this requirement closes problem `001` (blocker B-001).
- **REQ-CLI-002 — Next JSON contract.** The pack MUST provide a JSON Schema file `specs/next.schema.json` that defines the structured payload returned by `narrative next --json`. The schema MUST use draft `2020-12`, declare a stable `$id`, and MUST include a top-level `goal` (string, non-empty) and a `recommended_skills` array.
- **REQ-CLI-003 — Inspect schema referenced from docs.** `docs/16-CLI.md` and `docs/25-IMPLEMENTATION-STARTER.md` Slice A step 5 MUST each contain an explicit reference (link or path) to `specs/inspect.schema.json` as the canonical contract for `narrative inspect --json`.
- **REQ-CLI-004 — Next schema referenced from docs.** `docs/16-CLI.md` MUST cite `specs/next.schema.json` as the canonical contract for `narrative next --json`.
- **REQ-CLI-005 — Normative exit-code table.** `docs/16-CLI.md` MUST contain a normative table titled "Exit codes for `narrative check`" mapping every exit code (0–4) to a unique, documented condition. Each row MUST be distinct.
- **REQ-CLI-006 — No shell-string business logic.** The CLI design MUST continue to forbid shell-string business logic as stated in `docs/16-CLI.md` §"CLI implementation".
- **REQ-CLI-007 — Stable JSON envelope.** `narrative inspect --json` MUST emit a stable envelope (`project.identity`, `project.profile`, `project.runtimePath`, etc.) sufficient for `uat/UAT-M1-01.md`'s pass condition.

## Scenarios

### Scenario CLI-S01 — Inspect schema closes B-001 (covers AC-01)

- **WHEN** the apply phase writes `specs/inspect.schema.json` with `additionalProperties: false` and `properties.project.required: [identity, profile, runtimePath]`
- **THEN** `sddk-json-schema-validate examples/catalog-project.yaml specs/inspect.schema.json` (or the equivalent Python `jsonschema.validate(...)` call) exits with code `0`
- **AND** `docs/16-CLI.md` includes the literal token `specs/inspect.schema.json`
- **AND** `docs/25-IMPLEMENTATION-STARTER.md` Slice A step 5 includes the literal token `specs/inspect.schema.json`
- **AND** the vault problem `problem-001-inspect-json-schema-missing` is marked `RESOLVED`.

### Scenario CLI-S02 — Next JSON schema exists and is schema-valid (covers AC-01 collateral)

- **WHEN** the apply phase writes `specs/next.schema.json` with a `goal` string and a `recommended_skills` array
- **THEN** a synthetic probe `{ "goal": "approve-visual-bible", "blocking": [], "recommended_skills": ["character-visual-design"] }` validates against the schema with exit code `0`
- **AND** `docs/16-CLI.md` cites `specs/next.schema.json`.

### Scenario CLI-S03 — Exit-code table is normative and complete (covers AC-09)

- **WHEN** the apply phase updates `docs/16-CLI.md` with the "Exit codes for `narrative check`" table containing one row per exit code `0`, `1`, `2`, `3`, `4`
- **THEN** every row maps a distinct exit code to a distinct documented condition
- **AND** the table header reads "Exit codes for `narrative check`" (case-sensitive, normative)
- **AND** no two rows share the same exit code value.

### Scenario CLI-S04 — Exit-code coverage can be sampled today (covers AC-09, executable today)

- **WHEN** a verifier runs `grep -nE "Exit codes for .narrative check" docs/16-CLI.md`
- **THEN** the command exits `1` (regex not present at HEAD `62f0e7b`); the apply phase is expected to make it exit `0`.

### Scenario CLI-S05 — Inspect schema embargo at HEAD (executable today, pre-apply)

- **WHEN** a verifier runs `test -f specs/inspect.schema.json`
- **THEN** the command exits `1` at HEAD `62f0e7b` (file is not yet authored); the apply phase MUST make it exit `0`.

## Out of scope

- Implementation of `narrative inspect` and `narrative next` Python code (M1 / M3 work).
- Pydantic output model generation (lives downstream of `sddk-json-schema-validate`).
- Exit-code mapping for commands other than `narrative check` (governance commands MAY be addressed in a separate delta).
- JSON Schema for governance commands (`approve`, `reject`, `checkpoint`, `fork`, `diff`).
