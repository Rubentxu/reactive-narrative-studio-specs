# project-validation — Delta Spec

## Source

- **Proposal SHA-256**: `f7e8aff6e790d28c57486a43aa1e86e2a7679d2f818f555414a4d9e111daa092` (`changes/spec-completion/proposal.md`).
- **Evidence report SHA-256**: `122c61cd6a3fc1f5615c47983bc9b01776e6e68796553c70f403fa79a8cc349b`.
- **Vault problems**: `problem-014-examples-lack-schema-discriminator`, `problem-027-docs13-example-invalid`, plus the orphan-schema assertion implicit in exploration R-022.
- **Affected prose**: `docs/13-CONTROL-PLANE.md` (example YAML), `uat/UAT-M0-01.md` (machine-check step).
- **Affected outputs**: `examples/*.yaml` (5 files), `specs/*.schema.json`.
- **Proposal capability ID (cross-reference)**: `example-schema-discriminators`.

## Requirements

- **REQ-PROJ-VAL-001 — Schema discriminator.** Every YAML file in `examples/` MUST carry either a top-level `schema:` discriminator with a string value resolvable to a `specs/*.schema.json` file, OR a top-level `apiVersion:` discriminator used in conjunction with the catalog-entity schema.
- **REQ-PROJ-VAL-002 — Resolvable discriminator.** A discriminator MUST resolve to an existing schema file at HEAD `62f0e7b` after apply lands (apply introduced 4 schemas in the same change). The schema id MUST equal the discriminator string used.
- **REQ-PROJ-VAL-003 — Validation against declared schema.** For every file in `examples/`, running `sddk-json-schema-validate <example> <declared-schema>` MUST exit code `0`. Equivalent Python invocation: `python3 -c "import yaml, json, jsonschema; yaml.safe_load(open(p)); ..."`.
- **REQ-PROJ-VAL-004 — docs/13 example matches its cited schema.** The YAML example block inside `docs/13-CONTROL-PLANE.md` §"Entity envelope" MUST validate against the schema it cites (`catalog-entity.schema.json`) with exit code `0`.
- **REQ-PROJ-VAL-005 — Zero orphan schemas.** Every file in `specs/` MUST be referenced by at least one file in `docs/`, `examples/`, or `uat/`. An orphan schema is one with zero textual or schema-level cross-references.
- **REQ-PROJ-VAL-006 — UAT machine-check is explicit.** `uat/UAT-M0-01.md` MUST include an explicit reference to the validation command in its Pass-criterion prose (currently `machine-readable schema examples validate` is fuzzy).

## Scenarios

### Scenario PROJ-S01 — Five example YAMLs declare distinct discriminators (covers AC-03)

- **WHEN** a verifier reads every YAML in `examples/` (the 5 files: `catalog-project.yaml`, `creation-recipe-middle-grade.yaml`, `decision.yaml`, `middle-grade-profile.yaml`, `visual-spec.yaml`)
- **THEN** each file carries either `schema:` or `apiVersion:` at the top level
- **AND** the 5 discriminators correspond to 5 distinct contract families (catalog-entity, creation-recipe, narrative-decision, profile, visual-spec).

### Scenario PROJ-S02 — All five examples validate against their declared schemas (covers AC-02)

- **WHEN** apply lands, a verifier runs the `sddk-json-schema-validate` validator chain (one call per example) — or the Python equivalent
- **THEN** every call returns exit code `0`
- **AND** no validation error is reported in stderr.

### Scenario PROJ-S03 — docs/13 example passes its cited schema (covers AC-07)

- **WHEN** the apply phase corrects `docs/13-CONTROL-PLANE.md` §"Entity envelope" so the example block (i) uses `apiVersion: narrative.dev/v1alpha1`, (ii) uses `kind: NarrativeProject`, (iii) uses a lifecycle value from the canonical lifecycle set, and (iv) declares `relations[].type` as a non-empty string
- **THEN** extracting that YAML block and validating it against `specs/catalog-entity.schema.json` exits `0`.

### Scenario PROJ-S04 — Provenance check at HEAD (executable today, pre-apply)

- **WHEN** a verifier enumerates `examples/*.yaml` and inspects the top-level key set
- **THEN** `visual-spec.yaml` and `middle-grade-profile.yaml` (per proposal problem 014) lack a discriminator at HEAD and the apply phase MUST add one.

### Scenario PROJ-S05 — Orphan schema sweep (covers AC-11)

- **WHEN** a verifier walks every file under `specs/`
- **THEN** each schema filename appears in either a `docs/*.md` file, an `examples/*.yaml` reference, or a `uat/*.md` reference
- **AND** `grep -REc "<each-schema-basename>" docs/ examples/ uat/` returns at least `1` for every schema file.

## Out of scope

- Authoring new control-plane projection schemas (covered by `control-plane-projections` spec).
- Enforcing lifecycle / kind enum values inside `catalog-entity.schema.json` (covered by `overlay-vocabulary` spec).
- CI workflow that gates schema validity (`docs/19` deferred follow-up, problem-020 in next round).
- Strict `additionalProperties` policy for schemas whose prose explicitly permits extension (e.g. `docs/13` example may add `format` even if not declared in the projection).
