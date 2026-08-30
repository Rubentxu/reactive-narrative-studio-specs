# vault-correctness — Delta Spec

## Source

- **Proposal SHA-256**: `f7e8aff6e790d28c57486a43aa1e86e2a7679d2f818f555414a4d9e111daa092`.
- **Evidence report SHA-256**: `122c61cd6a3fc1f5615c47983bc9b01776e6e68796553c70f403fa79a8cc349b`.
- **Vault path**: `/home/rubentxu/.sddk-knowledge/p-490921be0aac9b69`.
- **Affected tools**: `sddk vault validate`.
- **Affected outputs**: vault observations created/updated by the apply phase (artifact store + spec-delta writes).
- **Proposal capability ID (cross-reference)**: N/A (tool-side).

## Requirements

- **REQ-VAULT-001 — Vault validation exits with `errors: 0`.** After the apply phase records each spec-delta artifact via `sddk artifact store`, running `sddk vault validate --root <outer-root> --scope . --vault <vault> --format json` MUST return a JSON envelope whose `errors` field is `0`.
- **REQ-VAULT-002 — Validation is a read-only check.** The spec phase MUST NOT call `sddk vault validate` and then write to the vault to "fix" errors. If validation reports errors, the spec phase MUST return `status: blocked` (or `partial` per launch packet rules) with diagnostics; the orchestrator decides remediation.
- **REQ-VAULT-003 — Validator scope is explicit.** `sddk vault validate` MUST be invoked with `--root` set to the **outer** repository root (`/var/mnt/DiscoChino2-fast/Proyectos/python/Reactive-Narrative-Studio-Specs`) and `--vault` set to the knowledge vault path. `--scope` MUST be `.`. (Inner-root invocation fails with "fallback seed must be a valid UUID" — the previous phase recorded this.)
- **REQ-VAULT-004 — JSON envelope fields are parsed.** When the validator returns a JSON envelope, the verifier MUST record `nodes`, `backlinks`, `errors`, `warnings`, `inserted`, `updated`, `deleted`, `diagnostics` before deeming AC-13 satisfied. A null-only or text-only output is insufficient evidence.
- **REQ-VAULT-005 — Baseline capture.** A baseline `sddk vault validate` run against HEAD `62f0e7b` (no new artifacts) MUST also report `errors: 0` (or report a stable, pre-existing set that the spec phase does NOT alter).

## Scenarios

### Scenario VAULT-S01 — Validator returns `errors: 0` against outer root (covers AC-13)

- **WHEN** the verifier runs `sddk vault validate --root /var/mnt/DiscoChino2-fast/Proyectos/python/Reactive-Narrative-Studio-Specs --scope . --vault /home/rubentxu/.sddk-knowledge/p-490921be0aac9b69 --format json`
- **THEN** the JSON envelope reports `errors: 0`
- **AND** `diagnostics[]` is empty (or contains only warnings under `warnings`).

### Scenario VAULT-S02 — Inner-root invocation is documented, not used (executable today)

- **WHEN** the verifier runs the inner-root variant for negative test
- **THEN** it MUST fail (per prior phase observation). This is recorded so future phases do not silently switch roots.

### Scenario VAULT-S03 — Baseline (pre-apply) validation is captured (executable today)

- **WHEN** the verifier runs scenario VAULT-S01 at HEAD `62f0e7b` BEFORE apply has written any new spec-delta artifacts
- **THEN** the validator reports `errors: 0`
- **AND** this baseline SHA-256 of the output is recorded as evidence.

### Scenario VAULT-S04 — Post-apply validation matches baseline (covers AC-13)

- **WHEN** apply has run `sddk artifact store` for every spec-delta written by this phase
- **THEN** the post-apply validator run reports `errors: 0` AND `nodes` count is `≥` the baseline (allowing for new artifact nodes)
- **AND** no diagnostic line is an error.

## Out of scope

- Initializing or migrating the vault (vault was initialized in `m0-adopt-2026-08-28`).
- Authoring new vault observation types.
- Reconciling pre-existing vault warnings (`warnings` field is informational, not a gate).
- Forging remote integrations (`sddk vault` does not push to remote vaults).
