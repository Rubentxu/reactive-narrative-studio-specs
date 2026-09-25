# Design — m17-write-capable-cp (M17 Write-capable Control Plane)

## Architecture

Outbound command-record pattern, mirroring the recipes sink architecture (FSA primary,
download fallback). No backend, no network, no store mutation.

```
specs/cp-commands.schema.json                (NEW — outbound record schema, NOT in envelope $defs)
control-plane/src/schema/registry.ts         (+ CP_COMMANDS_ID dispatch 'control-plane/commands/v1')
control-plane/src/features/decisions/
  types.ts        CommandKind, CommandPayload, CommandRecord
  record.ts       buildCommandRecord(...) — pure factory (id/timestamps injectable)
  commandSinks.ts fileSystemAccessCommandSink (showDirectoryPicker readwrite → commands/<id>.json)
                  downloadCommandSink (Blob + <a download=<id>.json>) — NEVER imports store
  CommandComposer.tsx  form: command kind, targetRef, subjectDecision, rationale/text/reason/scope,
                       validate via registry → sink; renders error, disables submit when invalid
control-plane/src/views/Decisions.tsx        lists bundle.decisions rows + per-decision action
                                             buttons (prefill composer); reads store (D7 boundary)
control-plane/src/routes/router.tsx          + /decisions route; routes.tsx manifest entry
```

Data flow: bundle.decisions (read) → Decisions.tsx rows → user action → CommandComposer (local
state only) → validateCommandRecord (registry AJV) → commandSink.write → filesystem/download.
CommandComposer lives in features/decisions and is imported by the view (view→feature direction,
same as CreateWizard/PublishingProof).

## Contract details

- Record: `{schema:'control-plane/commands/v1', id, command, targetRef, createdAt, origin, payload}`;
  id default `cmd-<compact-UTC-ts>-<command>` (injectable for tests/scenario determinism).
- Payload discrimination via if/then on `command` (AJV 2020-12):
  approve|reject → `{subjectDecision?: string, rationale?: string}` (additionalProperties false);
  comment → `{text: string, minLength 1}`; regenerate → `{reason: string, minLength 1, scope? ∈ scene|chapter|edition}`.
- cp-commands deliberately NOT referenced from `specs/control-plane.schema.json` ($defs) — the
  envelope describes a loaded project; commands are outbound. Documented in glossary + the
  updated cp-projection-schemas test (15 schemas, cp-commands marked outbound-not-in-envelope).

## UI

/decisions (layout under the standard view shell): table rows with data-testid
`decision-row-<id>` showing action/targetRef/status chip; buttons `decision-<id>-approve|reject|comment|regenerate`
open composer prefilled; standalone composer with `command-record-id` display and
`command-submit` button; submit disabled with inline `command-validation-error` when invalid.
Write attempt order: FSA sink if `window.showDirectoryPicker` exists, else download sink.

## Test plan

Unit (vitest, control-plane/test/):
- cp-commands-schema.spec.ts — AJV boundary (accept per kind; reject: unknown command, bad
  targetRef, extra fields, empty comment text, missing regenerate reason, bad scope, non-string
  rationale).
- decisions-command-sinks.spec.ts — FSA stub path (exact directory/file path + bytes), download
  fallback (blob content + anchor.download === `${id}.json`), purity (no fetch, no
  useProjectionStore import in features/decisions sinks).
- decisions-view.spec.ts — store round-trip no-op on route mount; composer validation gating.
Scenario (SCN-M17-01-001 ↔ UAT-M17-01):
ui.build → start-preview → navigate /home → set-input-files snapshot-valid → navigate /decisions
→ probe rows/statuses/prefill (evaluate) → compose approve via click+fill-wizard → submit →
download artifact `decisions.approve.command.json` → compose regenerate → download
`decisions.regenerate.command.json`. Oracles: browser-evaluate (rows/statuses/prefill),
schema ×2 (downloaded record vs specs/cp-commands.schema.json — proves conformance of the
outbound artifact itself), jsonl-entry ×2 (download is SINGLE-LINE JSON.stringify → 1 JSONL
entry; expected array form with ignoredPaths `[0].id` / `[0].createdAt`, proven syntax from
scn-m11-01-001), browser health.

## Debt policy
No new abstractions beyond the sink pair (already established pattern); registry dispatch follows
existing convention. Severity: low; priority: P2 (feature work, no known debt introduced).
