# Specification — m17-write-capable-cp (M17 Write-capable Control Plane)

Milestone: M17 (docs/19-ROADMAP.md:286). The read-only Control Plane condition is satisfied.
Scope: outbound command records via filesystem (FSA dir picker or download fallback); a
`/decisions` view listing the loaded cp-decisions projection and composing command records.
NO persistent backend, NO network, NO IndexedDB persistence of commands.

## Requirements

### REQ-M17-1 — Command record schema (fitness)
`specs/cp-commands.schema.json` exists: `$id https://narrative.dev/schemas/cp-commands.schema.json`,
draft 2020-12, const `control-plane/commands/v1`, SINGLE record per document:
`{schema, id, command, targetRef, createdAt, origin, payload}` with `additionalProperties:false`.
`command` ∈ {approve, reject, comment, regenerate}; `targetRef` matches the EntityRef pattern
`^[A-Z][A-Za-z]+:[a-z0-9-]+/[a-z0-9-]+$`; `createdAt` date-time; `id`/`origin` minLength 1.
Payload is closed and discriminated by `command` (if/then): approve|reject → `{subjectDecision?,
rationale?}`; comment → `{text}` (text minLength 1, required); regenerate → `{reason}` (required,
minLength 1) + optional `scope` ∈ {scene, chapter, edition}. Registered in the schema registry
dispatch (`control-plane/commands/v1` → CP_COMMANDS_ID).
AC: AJV boundary tests accept a valid record per kind and reject unknown command, bad targetRef,
unknown fields, missing/empty comment text, missing regenerate reason, bad scope.

### REQ-M17-2 — Approve/reject payload (fitness)
An approve/reject record MAY carry `subjectDecision` (the cp-decisions item id being acted on)
and `rationale` (free text); both optional. AC: unit test with subjectDecision+rationale passes;
schema rejects non-string types.

### REQ-M17-3 — Comment payload (fitness)
A comment record requires non-empty `text`. AC: schema boundary rejects missing/empty text.

### REQ-M17-4 — Regeneration request payload (fitness)
A regenerate record requires non-empty `reason`; optional `scope` limited to the enum. AC:
schema boundary tests.

### REQ-M17-5 — Validate before write (fitness)
The composer validates the record against the cp-commands schema (client registry) BEFORE any
write; an invalid record disables submit and renders the validation error. Invalid records are
never handed to a sink. AC: unit tests assert disabled submit + no sink call on invalid input.

### REQ-M17-6 — Filesystem write path (functional)
Preferred path: File System Access API `showDirectoryPicker({mode:'readwrite'})` → writes
`commands/<id>.json` inside the picked directory (subdir created on demand). Fallback when the
API is unavailable: browser download of `<id>.json` (Blob + anchor). The sink layer never imports
useProjectionStore, never uses fetch, never persists commands to IndexedDB. AC: unit tests with
stubs assert the exact file path/bytes on the FSA path and the anchor-download path; purity tests
(no fetch / no store import in the sink module); the executable scenario proves the download
fallback end-to-end with the record content asserted from the captured artifact.

### REQ-M17-7 — /decisions view + store no-op (functional)
Route `/decisions` renders every decision in `bundle.decisions` (id, action, targetRef, status)
with per-decision action buttons (Approve / Reject / Comment / Regenerate) that open the composer
prefilled (targetRef from the decision's targetRef; subjectDecision = decision id). Composer
works standalone for arbitrary EntityRefs too. Mounting the route leaves `useProjectionStore`
state deep-equal (round-trip no-op). AC: executable scenario probes rows/statuses/prefill and
downloads an approve record; unit test asserts the store round-trip no-op.

### REQ-M17-8 — No persistent backend (fitness)
Isolation: the decisions feature contains no `fetch(`, no Dexie/Orama/IndexedDB usage, and no
cross-feature imports (DECLARED_CROSS_FEATURE not needed). cp-commands is NOT added to the
control-plane project envelope ($defs) — it is an outbound artifact, not a project projection.
AC: purity grep tests; the cp-projection-schemas count test is updated deliberately (15 = 14 +
documented cp-commands addition) asserting cp-commands is NOT referenced from the envelope.

## Traceability
- UAT-M17-01 (uat/UAT-M17-01.md) → scenario SCN-M17-01-001 proves REQ-M17-6, REQ-M17-7 (+observes 1,5).
- REQ-M17-1..5, 8 are fitness-level (unit test refs suffice); 6–7 are functional (scenario verdict).
