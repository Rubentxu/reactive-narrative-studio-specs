# event-schema — Delta Spec

## Source

- **Proposal SHA-256**: `f7e8aff6e790d28c57486a43aa1e86e2a7679d2f818f555414a4d9e111daa092`.
- **Evidence report SHA-256**: `122c61cd6a3fc1f5615c47983bc9b01776e6e68796553c70f403fa79a8cc349b`.
- **Vault problem**: `problem-008-event-log-schema-missing`.
- **Affected prose**: `docs/06-ACTIVEGRAPH-RUNTIME.md` §"Event export" (`YYYY-MM.jsonl`), `docs/15-SCM-PROVENANCE.md` (`JSONL events`), `docs/22-SECURITY-RIGHTS.md` (JSONL events audit), `docs/12-IMAGE-PIPELINE.md` §"Asset storage" (no image bytes in event log), `docs/23-OBSERVABILITY-COST.md`.
- **Affected outputs**: `specs/event.schema.json` (to be created).
- **Proposal capability ID (cross-reference)**: `event-log-schema`.

## Requirements

- **REQ-EVT-001 — Event schema file exists.** The pack MUST provide `specs/event.schema.json`, written against JSON Schema draft `2020-12`, with a stable `$id`.
- **REQ-EVT-002 — JSONL canonical envelope.** Every record in a `.narrative/events/YYYY-MM.jsonl` file MUST conform to `specs/event.schema.json`. The envelope MUST include:
  - `eventType` (string, discriminator; not free-form)
  - `occurredAt` (string, ISO-8601 with timezone)
  - `schema` (string, `narrative-event/v1` or successor)
  - `projectId` (string, opaque identifier — typically the project directory name)
  - `payload` (object, type-discriminated by `eventType`)
- **REQ-EVT-003 — `$defs` for every documented event type.** Each distinct event type named in `docs/` prose MUST resolve to a unique entry in the schema's `$defs`. Concretely:
  - At minimum, the documented event types in scope of AC-10 MUST be addressable. The proposal names `runtime/run`, `cost`, `approval`, `candidate/accept|reject`, `asset/generation`, `publish` as the documented event categories. Each category MUST expand into one or more `$defs` entries.
- **REQ-EVT-004 — No image bytes.** The event schema MUST forbid inline image bytes. Any property that attempts to inline base64-encoded image payloads MUST be rejected via JSON Schema `not`/`maxLength` constraints, OR the schema MUST be declared with `additionalProperties: false` such that the only fields permitted cannot carry binary data.
- **REQ-EVT-005 — Cross-referenced.** `docs/06-ACTIVEGRAPH-RUNTIME.md` and at least one other doc (`docs/22-SECURITY-RIGHTS.md` or `docs/15-SCM-PROVENANCE.md`) MUST cite `specs/event.schema.json` as the canonical contract.

## Scenarios

### Scenario EVT-S01 — Event schema exists with stable `$id` (covers AC-10)

- **WHEN** the verifier parses `specs/event.schema.json`
- **THEN** the file's top-level `$id` field is present and parseable
- **AND** the `$schema` value is `https://json-schema.org/draft/2020-12/schema`.

### Scenario EVT-S02 — Every documented event type has a `$defs` entry (covers AC-10)

- **WHEN** the verifier collects every event-type token referenced in `docs/06`, `docs/12`, `docs/15`, `docs/22`, `docs/23` (e.g. `run.started`, `run.completed`, `cost.recorded`, `candidate.accepted`, `candidate.rejected`, `asset.generated`, `approval.granted`, `publish.completed`)
- **THEN** for each event-type token, the schema's `$defs` (or a `oneOf` of subschemas) contains a matching entry
- **AND** every event type referenced from `docs/` is addressable.

### Scenario EVT-S03 — Canonical envelope validates (covers AC-10)

- **WHEN** the verifier runs `jsonschema.validate({schema:"narrative-event/v1", occurredAt:"2026-08-28T12:00:00Z", projectId:"x", eventType:"run.started", payload:{...}}, specs/event.schema.json)`
- **THEN** exit `0`.

### Scenario EVT-S04 — No image bytes (covers AC-10)

- **WHEN** the verifier probes an event record whose `payload` contains a property whose value looks like a base64 image (`payload.image.data: "iVBORw0K..."` ≥ 1 KiB)
- **THEN** validation exits `1` (rejected).

### Scenario EVT-S05 — Schema absence at HEAD (executable today, pre-apply)

- **WHEN** the verifier runs `test -f specs/event.schema.json`
- **THEN** exit `1` at HEAD `62f0e7b`; apply MUST make it exit `0`.

## Out of scope

- Authoring runtime emitters (Python code that writes `.narrative/events/YYYY-MM.jsonl`) — M3 work.
- Authoring replay tooling — M3 work.
- Defining the runtime event taxonomy exhaustively (apply phase authors the bounded set listed in REQ-EVT-003 / EVT-S02; extensions are deferred).
- Migration of historical JSONL content (there is no operational history at HEAD `62f0e7b`).
