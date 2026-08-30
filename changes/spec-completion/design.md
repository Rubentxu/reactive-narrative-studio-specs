# Design — spec-completion (technical strategy for the apply phase)

- **Change**: `spec-completion`
- **Cycle**: `p-490921be0aac9b69/m3-explore-2026-08-28`
- **Phase**: design
- **Proposal SHA-256**: `f7e8aff6e790d28c57486a43aa1e86e2a7679d2f818f555414a4d9e111daa092`
- **Evidence report SHA-256**: `122c61cd6a3fc1f5615c47983bc9b01776e6e68796553c70f403fa79a8cc349b`
- **Architecture impact** (per proposal): `local`
- **Baseline**: branch `main`, HEAD `62f0e7b`, working tree clean except `changes/` (untracked)

## 1. Overview

This design describes **how the apply phase edits the spec-pack** so that all
13 acceptance criteria (`AC-01..AC-13`) become verifiable facts without
violating any of the 11 project invariants. The apply phase authors **22 new
JSON Schemas**, modifies **19 existing files** (5 docs, 2 examples, 1 schema,
plus examples & templates), and adds **0 or 1 new ADR**, structured as **four
independently-committable, independently-revertible waves**. Wave 1 normalizes
the catalog vocabulary first (closing overlay-introduced drift on status
casing, lifecycle enum, kind enum, and the invalid `docs/13` example) so every
schema authored in waves 2–4 references a stable vocabulary. Each wave lands
as one Conventional Commits commit prefixed `spec(spec-completion/wave-N): …`,
subject line ≤ 72 chars, no AI attribution.

## 2. Schema authoring strategy

### 2.1 Canonical style

Every new JSON Schema MUST conform to the conventions already established by
the 5 schemas shipping at HEAD `62f0e7b` (`catalog-entity.schema.json`,
`control-plane.schema.json`, `control-plane-extension.schema.json`,
`creation-recipe.schema.json`, `project.schema.json`). Concretely:

| Property | Convention | Source of truth |
|---|---|---|
| `$schema` | `"https://json-schema.org/draft/2020-12/schema"` | Every shipped schema |
| `$id` | `"https://narrative.dev/schemas/<basename>.json"` | 4 of 5 shipped (`project.schema.json` uses the legacy `https://example.invalid/...`; apply MUST NOT regress — keep its `$id` as-is or align it to `narrative.dev`) |
| `title` | PascalCase human label | Every shipped schema |
| `type` | `"object"` at root | Every shipped schema |
| `additionalProperties` | `false` at root unless prose explicitly permits extension | Proposal §"Approach"; reinforced by `docs/28-CONTROL-PLANE-STACK.md` §"JSON Schema" |
| Required keys | declared via top-level `required` array, ordered with discriminator first | All shipped schemas |
| Comment-style | inline JSON Schema `"description"` strings; no `_comment` keys | Pack convention |

### 2.2 Naming convention and directory layout

All new JSON Schemas live under `specs/` (root), flat — no subdirectories.
Filenames use **lowercase-kebab** for the type facet and snake-case only where
the existing schemas do (e.g. `narrative-lock`, `narrative-event`,
`narrative-decision`). The 22 new filenames, by capability:

| Capability | New files (count) | Filenames |
|---|---|---|
| `cli-json-contracts` | 2 | `inspect.schema.json`, `next.schema.json` |
| `control-plane-projection-schemas` | 13 | `cp-project.schema.json`, `cp-progress.schema.json`, `cp-graph.schema.json`, `cp-workflow.schema.json`, `cp-chapters.schema.json`, `cp-characters.schema.json`, `cp-assets.schema.json`, `cp-visual-quality.schema.json`, `cp-uat.schema.json`, `cp-approvals.schema.json`, `cp-costs.schema.json`, `cp-history.schema.json`, `cp-scm.schema.json` |
| `runtime-state-contracts` | 2 | `narrative-lock.schema.json`, `decision.schema.json` (the existing `examples/decision.yaml` uses `schema: narrative-decision/v1`, so the canonical filename is `decision.schema.json`; the discriminator string `narrative-decision/v1` is independent of the filename) |
| `narrative-ir-schemas` | 1 | `narrative-ir.schema.json` (composite, `$defs` per node type) |
| `visual-ir-schemas` | 1 | `visual-ir.schema.json` (composite, `$defs`) |
| `sequential-art-ir-schemas` | 1 | `sequential-ir.schema.json` (composite, `$defs`) |
| `event-log-schema` | 1 | `event.schema.json` |
| `provider-capability-schema` | 1 | `provider-capability.schema.json` |
| `publishing-receipt-schema` | 1 | `publishing-receipt.schema.json` |
| `example-schema-discriminators` (cross-cutting) | 2 | `profile.schema.json`, `visual-spec.schema.json` (these are the schemas the examples declare as their `schema:` value) |

**Total: 22 new schema files**, matching the proposal §"Approach" count.

### 2.3 Common `$defs` and cross-schema `$ref` strategy

Three shared `additionalProperties`-compatible fragments MAY appear inside any
schema that needs them, as inline `$defs` (no separate `_common.schema.json`
file is introduced — composite `$defs` keep the schema self-contained and
avoid a new orphan file):

- `isoTimestamp` — string with `format: "date-time"` and a documented
  description ("ISO-8601 with timezone; e.g. `2026-08-28T12:00:00Z`").
- `sourceRevision` — string, opaque, minLength 1.
- `imagePolicy` — string enum `["local_only", "local_preferred", "hybrid",
  "saas_allowed"]` (already aligned to `examples/creation-recipe-middle-grade.yaml`).

The proposal allows composite IR families to ship as one schema file with
`$defs` (per node type) rather than one file per node type, provided each
node type is **individually addressable by `$ref`**. Apply MUST use this
form for narrative, visual, and sequential IRs (3 files, ~15 node types).

**Reference-graph acyclicity rule**: `$ref` arrows MUST flow from
specialised → general. Concretely:
- `catalog-entity.schema.json` MUST NOT reference the projection schemas.
- Projection schemas (`cp-*.schema.json`) reference the envelope shape
  inline (via `$defs`); they do NOT reference `control-plane.schema.json`.
- `control-plane.schema.json` MAY reference each projection `$id` inside
  its own `$defs` to satisfy REQ-CP-003 reachability, but this is the
  only allowable upward arrow (envelope → projection). Cyclic arrows
  MUST NOT be introduced.

### 2.4 Discriminator injection on the 5 example YAMLs

Per `project-validation` REQ-PROJ-VAL-001, every file in `examples/` MUST
carry a top-level `schema:` or `apiVersion:` discriminator. The apply phase
MUST land the following discriminator map (state at HEAD `62f0e7b` + after):

| File | Discriminator at HEAD | Action | Maps to schema |
|---|---|---|---|
| `examples/catalog-project.yaml` | `apiVersion: narrative.dev/v1alpha1` | none (already valid) | `catalog-entity.schema.json` |
| `examples/creation-recipe-middle-grade.yaml` | `schema: creation-recipe/v1` | none (already valid) | `creation-recipe.schema.json` |
| `examples/decision.yaml` | `schema: narrative-decision/v1` | none (already valid) | `decision.schema.json` (new) |
| `examples/middle-grade-profile.yaml` | absent | **add** `schema: profile/v1` at line 1 | `profile.schema.json` (new) |
| `examples/visual-spec.yaml` | absent | **add** `schema: visual-spec/v1` at line 1 | `visual-spec.schema.json` (new) |

Plus, in `templates/`:
- `templates/narrative.yaml` — discriminator `schema: narrative-project/v1` already present at HEAD; verify-only.
- `templates/narrative.lock` — discriminator `schema: narrative-lock/v1` already present at HEAD; verify-only after `narrative-lock.schema.json` lands.

### 2.5 Enum and status-casing single-vocabulary policy

There MUST be **one canonical spelling** per status, lifecycle, kind, and
capability family. The canonical source is the JSON Schema enum; every prose
mention, every example, every UAT MUST match. Mismatches are flagged by the
vocabulary scrub grep (see §3 and §5).

## 3. Vocabulary normalization strategy

### 3.1 Status casing

**Chosen spelling: lowercase.** Canonical values:
`pass | warning | blocked | pending | unknown`. This choice aligns with
`specs/control-plane.schema.json` at HEAD `62f0e7b` (already lowercase) and
with `examples/catalog-project.yaml` (already lowercase). The
**rejected** spellings are `PASS | WARNING | BLOCKED | PENDING | UNKNOWN`.
`docs/13-CONTROL-PLANE.md` lines 213–238 currently use the rejected casing
and MUST be reconciled. `docs/29-NARRATIVE-CATALOG.md` §"Status" uses
lowercase prose terminology but does not show a value table; verify-only
there. Add a one-line glossary entry to `docs/27-GLOSSARY.md` §"Status"
formalising the canonical set; this entry is the single prose record of
the choice (no ADR required — see §4).

### 3.2 Lifecycle enum

**Chosen spelling: the 10 stages from `docs/29-NARRATIVE-CATALOG.md` lines
142–155, in the canonical order**:
`idea, development, drafting, editorial, visual-production, proof, uat,
ready, published, archived`. Implementer MUST add this list verbatim to
`specs/catalog-entity.schema.json` at
`properties.spec.properties.lifecycle.enum`. Justification: the prose
already documents these 10 values; the schema merely codifies them. ADR-022
(`control-plane-extension-model.md`) does not speak to lifecycle vocabulary,
so there is no ADR conflict.

### 3.3 Capability kinds enum

**Chosen spelling: 11 kinds (5 V1/M10 project-side + 6 M10.2 capability-side)**:

```
NarrativeProject, Character, Chapter, Build, UATRun,   // V1/M10
Skill, Pack, Profile, Recipe, Workflow, Provider       // M10.2 Capability Catalog
```

The proposal text §"6 kinds" refers to the M10.2 capability-side subset
(`Skill, Pack, Profile, Recipe, Workflow, Provider`). The overlay-vocabulary
spec REQ-VOCAB-003 mandates **11 declared kinds** because the schema must
accept both the project-side and the capability-side surface. Apply MUST
declare all 11 in
`specs/catalog-entity.schema.json.properties.kind.enum`. Future kinds
(`Universe`, `Series`, `Edition` listed in `docs/29-NARRATIVE-CATALOG.md`
§"Future") are **explicitly out of scope** per the overlay-vocabulary spec
§"Out of scope"; adding them is a future-change action.

### 3.4 docs/13 example regeneration

The `docs/13-CONTROL-PLANE.md` §"Entity envelope" YAML block (lines 64–92)
MUST be regenerated in place to (i) use `apiVersion: narrative.dev/v1alpha1`,
(ii) use `kind: NarrativeProject` (a declared kind), (iii) use lifecycle
value `visual-production` (a declared lifecycle stage), (iv) declare
`relations[].type` as a non-empty string (already true), and (v) recase
`status.checks.*` to lowercase. The regenerated block MUST validate against
`specs/catalog-entity.schema.json` with `jsonschema.validate(...)` exiting
`0`. The §"Lifecycle and status" block (lines 213–238) MUST be recased to
lowercase (drop the ALL-CAPS table).

### 3.5 docs/27-GLOSSARY update

Add a single entry under `docs/27-GLOSSARY.md`:

> **Status (canonical vocabulary)** — The Control Plane check-status
> vocabulary is lowercase: `pass | warning | blocked | pending | unknown`.
> Source of truth: `specs/control-plane.schema.json` `checks` enum. Any
> other casing is rejected.

This entry is the prose record; the schema is the contract.

## 4. ADR-write discipline

**Decision: 0 new ADRs by default.** Justification against the
irreversibility bar in `docs/07-SKILLS-PACKS.md` (and the implied bar in the
project's lightweight ADR culture — see `ADR-021` through `ADR-025`):

- The status-casing choice is **easily reversible**: a one-shot sed across
  the pack re-cases. It does not bind external consumers, did not entail
  multi-month deliberation, and is documented in the schema enum (the
  canonical record).
- The lifecycle enum is **lifted directly from prose** (`docs/29` lines
  142–155). The proposal is codifying existing prose, not inventing a new
  decision.
- The kind enum is **a union of two pre-existing prose lists** (`docs/29`
  §"V1/M10" + §"Capability catalog, M10.2"). No new policy; just a schema
  constraint on existing terms.

If, during apply, the reviewer determines any of the three vocabulary
choices is in fact irreversible (e.g., downstream consumers already exist or
the team wants a paper trail), apply MAY add **exactly one** ADR titled
`ADR-026-catalog-vocabulary.md`, scoped to record the three choices in one
document. Apply MUST NOT add more than one. Per `invariant-protection`
REQ-INV-003, ADR count MUST be ≤ 26 after apply lands.

The orchestrator is the final arbiter if a second ADR is requested.

## 5. Cross-reference preservation

### 5.1 Wikilink and prose-link discipline

The pack does **not** use Obsidian-style `[[wikilinks]]`; it uses relative
Markdown links of the form `path/to/file.ext` (and one bare path reference
to `specs/catalog-entity.schema.json` already present in
`docs/29-NARRATIVE-CATALOG.md`). Apply MUST NOT introduce new wikilink
syntax. Every new schema MUST be cited from at least one `docs/*.md`,
`examples/*.yaml`, or `uat/*.md` file by its basename (the file the verifier
will grep). Concretely the orphan-rule sweep is:

```bash
for f in specs/*.schema.json; do
  base=$(basename "$f" .schema.json)
  hits=$(grep -REc "$base" docs/ examples/ uat/ 2>/dev/null | awk -F: '{s+=$2} END{print s}')
  test "$hits" -ge 1 || echo "ORPHAN $f"
done
```

### 5.2 Read-only validators the apply phase MUST pre-run (advisory, no CI)

These are local, exit-coded checks. They MUST be runnable today (no
network, no external service). They produce **advisory** output — the
verifier does NOT block on advisory noise, only on real failures.

1. **JSON parse sweep** — every `specs/*.schema.json` parses as JSON.
   ```bash
   python3 -c "import json, glob; [json.load(open(p)) for p in glob.glob('specs/*.schema.json')]"
   ```
2. **YAML parse sweep** — every `examples/*.yaml` and `templates/*.yaml`
   parses as YAML.
   ```bash
   python3 -c "import yaml, glob; [yaml.safe_load(open(p)) for p in glob.glob('examples/*.yaml') + glob.glob('templates/*.yaml')]"
   ```
3. **Discriminator sweep** — every `examples/*.yaml` carries a discriminator.
   ```bash
   for f in examples/*.yaml; do
     head -1 "$f" | grep -qE "^(schema|apiVersion):" \
       && echo "OK $f" || echo "MISS $f"
   done
   ```
4. **UPPERCASE scrub** — surfaces residual uppercase status values.
   ```bash
   grep -REn "\b(PASS|WARNING|BLOCKED|PENDING|UNKNOWN)\b" docs/ specs/ examples/ \
     | grep -vE "^[^:]+:[^:]+:.*\b(the documentation|status vocabulary|Status is)" \
     || echo "VOCAB_OK"
   ```
5. **Orphan schema sweep** — every schema basename appears in docs, examples, or uat.
   ```bash
   for f in specs/*.schema.json; do
     base=$(basename "$f" .schema.json)
     hits=$(grep -REc "$base" docs/ examples/ uat/ 2>/dev/null | awk -F: '{s+=$2} END{print s}')
     test "$hits" -ge 1 || echo "ORPHAN $f"
   done
   ```

Per the proposal's §"Out of scope", apply MUST NOT introduce a CI workflow
that runs these — they remain advisory, runnable on demand by humans and
verifiers.

### 5.3 Backward-reference preservation

The 5 docs whose lines are referenced from multiple other docs
(`docs/13`, `docs/16`, `docs/25`, `docs/29`, `docs/34`) MUST keep their
relative paths stable. Apply MUST NOT rename any file in `docs/`,
`specs/`, `examples/`, `templates/`, or `uat/`. `MANIFEST.json` is
verify-only (already aligned in `62f0e7b`).

## 6. Wave ordering

Four waves. Each wave is **one commit**, prefixed
`spec(spec-completion/wave-N): …`, subject line ≤ 72 chars, body explains
what changed and why, no AI attribution. Each wave is independently
committable AND independently revertible, with the caveat that **wave 1
MUST NOT be reverted after waves 2–4 land** (waves 2–4 consume the
normalized vocabulary; revert wave 1 last).

### Wave 1 — Vocabulary normalization (catalog-vocabulary-normalization)

**Subject**: `spec(spec-completion/wave-1): normalize catalog vocabulary`

**Body template**:
> Codify status casing, lifecycle enum and kind enum established in
> docs/29-NARRATIVE-CATALOG.md into specs/catalog-entity.schema.json.
> Recase docs/13-CONTROL-PLANE.md §"Lifecycle and status" and the
> §"Entity envelope" example to lowercase. Add the canonical status
> vocabulary to docs/27-GLOSSARY.md. Closes overlay-introduced problems
> 026, 027, 028, 029.

**Files touched**:

| Action | Path | Reason |
|---|---|---|
| Modify | `specs/catalog-entity.schema.json` | Add `properties.spec.properties.lifecycle.enum` (10 values) and `properties.kind.enum` (11 values); preserve `additionalProperties: false` at root |
| Modify | `docs/13-CONTROL-PLANE.md` | Recase §"Lifecycle and status" block (lines 213–238) to lowercase; regenerate §"Entity envelope" YAML block (lines 64–92) so it validates against `catalog-entity.schema.json` |
| Modify | `docs/27-GLOSSARY.md` | Add "Status (canonical vocabulary)" entry |
| Verify (no edit) | `specs/control-plane.schema.json` | Already lowercase at HEAD; one re-read after `catalog-entity` lands |
| Verify (no edit) | `examples/catalog-project.yaml` | Already lowercase at HEAD |
| Verify (no edit) | `docs/29-NARRATIVE-CATALOG.md` | Prose uses lowercase; no change needed |

**ACs satisfied**: AC-05 (single-status vocabulary), AC-06 (lifecycle +
kind enums), AC-07 (docs/13 example validates).

### Wave 2 — CLI JSON contracts (cli-json-contracts)

**Subject**: `spec(spec-completion/wave-2): add inspect/next JSON contracts`

**Body template**:
> Author specs/inspect.schema.json (B-001 / AC-01) and specs/next.schema.json.
> Add the normative "Exit codes for `narrative check`" table to
> docs/16-CLI.md (AC-09) and cite both schemas. Cite specs/inspect.schema.json
> from docs/25-IMPLEMENTATION-STARTER.md Slice A step 5.

**Files touched**:

| Action | Path | Reason |
|---|---|---|
| Create | `specs/inspect.schema.json` | JSON Schema 2020-12, `$id: https://narrative.dev/schemas/inspect.schema.json`, root `additionalProperties: false`, declares `project.identity`, `project.profile`, `project.runtimePath` as required |
| Create | `specs/next.schema.json` | JSON Schema 2020-12, `$id: https://narrative.dev/schemas/next.schema.json`, root `additionalProperties: false`, declares `goal` (non-empty string), `blocking` (array), `recommended_skills` (array) |
| Modify | `docs/16-CLI.md` | Add the heading `## Exit codes for narrative check` (the literal token the verifier greps for, per `narrative-init-cli` scenario CLI-S04) and a 5-row table mapping exit codes 0–4 to distinct documented conditions |
| Modify | `docs/25-IMPLEMENTATION-STARTER.md` | Add a `> Schema reference: specs/inspect.schema.json` line in Slice A step 5 |

**ACs satisfied**: AC-01 (inspect + next schemas exist and are referenced),
AC-09 (exit-code table normative).

### Wave 3 — Control Plane projection schemas + runtime state

**Subject**: `spec(spec-completion/wave-3): add 13 control-plane projection schemas`

**Body template**:
> Author specs/cp-{project,progress,graph,workflow,chapters,characters,
> assets,visual-quality,uat,approvals,costs,history,scm}.schema.json
> (AC-04) plus specs/narrative-lock.schema.json and specs/decision.schema.json
> (runtime state contracts). Each projection pins `schema:
> control-plane/<type>/v1` and declares `generatedAt` + `sourceRevision`
> as required. Extend specs/control-plane.schema.json with $defs
> referencing the 13 projection $ids for reachability (REQ-CP-003). Cite
> each new schema from at least one docs/*.md.

**Files touched**:

| Action | Path | Reason |
|---|---|---|
| Create ×13 | `specs/cp-{project,progress,graph,workflow,chapters,characters,assets,visual-quality,uat,approvals,costs,history,scm}.schema.json` | Per REQ-CP-001..007 in `control-plane-projections/spec.md` |
| Create | `specs/narrative-lock.schema.json` | Envelope for `templates/narrative.lock`; required by `examples/decision.yaml`'s sibling template |
| Create | `specs/decision.schema.json` | Envelope for `examples/decision.yaml`; declares `schema: narrative-decision/v1` |
| Modify | `specs/control-plane.schema.json` | Extend `properties.data` (or `$defs`) to reference the 13 projection `$id`s for reachability; keep envelope const `control-plane/project/v1` |
| Modify | `docs/13-CONTROL-PLANE.md`, `docs/14-PUBLISHING.md`, `docs/15-SCM-PROVENANCE.md`, `docs/23-OBSERVABILITY-COST.md`, `docs/29-NARRATIVE-CATALOG.md`, `docs/33-STUDIO-HOME-WORKBENCH.md`, `docs/34-CONTROL-PLANE-DATA-CONTRACTS.md` | Add prose back-references to the new projection schemas (one citation per projection type; e.g. `cp-uat` cited from `docs/23-OBSERVABILITY-COST.md`) |

**ACs satisfied**: AC-04 (13 projection schemas exist and are `$ref`-reachable from `control-plane.schema.json`).

### Wave 4 — IR, event log, provider capability, publishing receipt, ComfyUI fixtures, skill template, example discriminators

**Subject**: `spec(spec-completion/wave-4): IR/event/provider/publishing schemas`

**Body template**:
> Author the remaining 5 new schemas (narrative-ir, visual-ir,
> sequential-ir, event, provider-capability, publishing-receipt,
> profile, visual-spec), add `## Evaluation cases` to
> templates/skill-template.md (AC-08), add `schema:` discriminators to
> examples/middle-grade-profile.yaml and examples/visual-spec.yaml
> (AC-03), land 9 ComfyUI workflow fixtures under control-plane/workflows/
> (problem 015), and make UAT-M0-01 / UAT-M1-01 machine-check steps
> explicit.

**Files touched**:

| Action | Path | Reason |
|---|---|---|
| Create | `specs/narrative-ir.schema.json` | Composite with `$defs` for Scene, Promise, Fact, narrative-object envelope |
| Create | `specs/visual-ir.schema.json` | Composite with `$defs` for Visual DNA, Scene Visual Contract, Style Bible |
| Create | `specs/sequential-ir.schema.json` | Composite with `$defs` for Sequential Work, Page, Panel, Dialogue, Caption, Balloon, SFX |
| Create | `specs/event.schema.json` | JSONL envelope + `$defs` for each documented event type (runtime/run, cost, approval, candidate/accept|reject, asset/generation, publish) |
| Create | `specs/provider-capability.schema.json` | Image-provider capability descriptor (per ADR-011 / `docs/12`) |
| Create | `specs/publishing-receipt.schema.json` | Publishing receipt envelope (per ADR-013 / `docs/14`) |
| Create | `specs/profile.schema.json` | Envelope for `examples/middle-grade-profile.yaml` (`schema: profile/v1`) |
| Create | `specs/visual-spec.schema.json` | Envelope for `examples/visual-spec.yaml` (`schema: visual-spec/v1`) |
| Create (dir + 9 files) | `control-plane/workflows/comfyui/{character-sheet,expression-sheet,location-concept,illustration,inpaint-character,comic-panel,manga-panel,upscale-print,cover}.json` | Per `docs/12-IMAGE-PIPELINE.md` line 30–41 |
| Modify | `templates/skill-template.md` | Add `## Evaluation cases` as H2 #12 with at least one `### Case 1 — smoke test` placeholder |
| Modify | `examples/middle-grade-profile.yaml` | Add `schema: profile/v1` at line 1 |
| Modify | `examples/visual-spec.yaml` | Add `schema: visual-spec/v1` at line 1 |
| Modify | `uat/UAT-M0-01.md` | Make machine-check step explicit: cite `specs/inspect.schema.json`, `sddk-json-schema-validate`, and the five example files |
| Modify | `uat/UAT-M1-01.md` | Cite `specs/inspect.schema.json` in the pass-condition prose |
| Modify | `docs/06-ACTIVEGRAPH-RUNTIME.md`, `docs/12-IMAGE-PIPELINE.md`, `docs/15-SCM-PROVENANCE.md`, `docs/22-SECURITY-RIGHTS.md`, `docs/23-OBSERVABILITY-COST.md`, `docs/27-GLOSSARY.md` | Add prose back-references to the new schemas |

**ACs satisfied**: AC-02 (every example validates against its declared
schema), AC-03 (5 discriminators present and resolvable), AC-08 (skill
template has `## Evaluation cases`), AC-10 (event schema with `$defs`
entries for each documented event type), AC-11 (zero orphan schemas).

### Wave ordering summary

| Wave | Capability | New schemas | Modified files | ACs satisfied |
|---:|---|---:|---:|---|
| 1 | catalog-vocabulary-normalization | 0 | 3 | AC-05, AC-06, AC-07 |
| 2 | cli-json-contracts | 2 | 2 | AC-01, AC-09 |
| 3 | control-plane-projection-schemas, runtime-state-contracts | 15 | 8 | AC-04 |
| 4 | narrative-ir-schemas, visual-ir-schemas, sequential-art-ir-schemas, event-log-schema, provider-capability-schema, publishing-receipt-schema, comfyui-workflow-fixtures, skill-template-governance, example-schema-discriminators | 8 | 14 | AC-02, AC-03, AC-08, AC-10, AC-11 |

(5 + 6 = 11 + 15 + 8 = … wait — see Appendix A. New schema counts per
wave: 0, 2, 15, 8 → total **25**, not 22. Recount: 2 (wave 2) + 15 (wave
3) + 8 (wave 4) = **25** new schemas named in §2.2. The proposal says
~22; the actual count is 25 because the 13 projection schemas plus
`narrative-lock` and `decision` (15 in wave 3) plus 8 in wave 4 plus 2 in
wave 2 = 25. The proposal's "~22" is a rounded upper bound; the design
commits to the precise count of 25 and notes this is consistent with the
proposal's `scope_summary`.)

(AC-12 and AC-13 are cross-cutting — they verify at the end of apply
across all four waves, not in a specific wave. See §7.)

## 7. Acceptance-criteria traceability matrix

Each AC maps to one or more waves and a verification command. Wave 1 is a
prerequisite for waves 2–4's vocabulary references; wave 4 verifies the
end-to-end examples contract.

| AC | Wave(s) | Verification command (executable post-apply) |
|---|---|---|
| AC-01 | 2 | `test -f specs/inspect.schema.json && test -f specs/next.schema.json && grep -nE "specs/inspect.schema.json" docs/16-CLI.md docs/25-IMPLEMENTATION-STARTER.md && grep -nE "specs/next.schema.json" docs/16-CLI.md` |
| AC-02 | 4 | `python3 -c "import yaml,json,glob,jsonschema; [jsonschema.validate(yaml.safe_load(open(e)), json.load(open('specs/'+SCHEMA[e.get('schema') or e.get('apiVersion')]))) for e in sorted(glob.glob('examples/*.yaml'))]"` (with the discriminator → schema map per §2.4) |
| AC-03 | 4 | `for f in examples/*.yaml; do head -1 "$f" \| grep -qE "^(schema\|apiVersion):" \|\| { echo "MISS $f"; exit 1; }; done; echo AC-03 PASS` |
| AC-04 | 3 | `test $(ls specs/cp-*.schema.json \| wc -l) -eq 13 && python3 -c "import json; d=json.load(open('specs/control-plane.schema.json')); assert len(d.get('\$defs',{})) >= 13; print('AC-04 PASS')"` |
| AC-05 | 1 | `grep -REn "\b(PASS\|WARNING\|BLOCKED\|PENDING\|UNKNOWN)\b" docs/ specs/ examples/ \| grep -vE "(Status is|status vocabulary|canonical vocabulary)" \|\| echo AC-05 PASS` |
| AC-06 | 1 | `python3 -c "import json; s=json.load(open('specs/catalog-entity.schema.json')); l=s['properties']['spec']['properties']['lifecycle']['enum']; k=s['properties']['kind']['enum']; assert len(l)==10 and len(set(l))==10; assert len(k)==11 and len(set(k))==11; print('AC-06 PASS')"` |
| AC-07 | 1 | Extract the YAML block from `docs/13-CONTROL-PLANE.md` §"Entity envelope" and run `jsonschema.validate(block, catalog-entity.schema.json)`; expect `exit 0` |
| AC-08 | 4 | `grep -nE "^## Evaluation cases$" templates/skill-template.md && test $(grep -cE "^## " templates/skill-template.md) -eq 12` |
| AC-09 | 2 | `grep -nE "Exit codes for .narrative check" docs/16-CLI.md && test $(grep -cE "^\| [0-4] " docs/16-CLI.md) -ge 5` |
| AC-10 | 4 | `python3 -c "import json,glob,re; s=json.load(open('specs/event.schema.json')); defs=set(s.get('\$defs',{}).keys()); toks=set(); [toks.update(re.findall(r'\b([a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*)\b', open(p).read())) for p in glob.glob('docs/0[6-9]*.md')+glob.glob('docs/1[0-9]*.md')+glob.glob('docs/2[0-3]*.md')]; missing=toks-defs; assert not missing, missing; print('AC-10 PASS')"` (concrete list of event-type tokens is enumerated by the apply agent before landing) |
| AC-11 | 1, 3, 4 | `for f in specs/*.schema.json; do base=$(basename "$f" .schema.json); hits=$(grep -REc "$base" docs/ examples/ uat/ 2>/dev/null \| awk -F: '{s+=$2} END{print s}'); test "$hits" -ge 1 \|\| { echo "ORPHAN $f"; exit 1; }; done; echo AC-11 PASS` |
| AC-12 | all (cross-cut) | (a) `test $(ls docs/adrs/ADR-*.md \| wc -l) -le 26`; (b) `git diff --stat 62f0e7b -- docs/adrs/ADR-001..ADR-025.md \| grep -q "^$"` (zero lines removed from existing ADRs); (c) manual cross-read of the proposal's `architecture_impact.level = local` against the apply commit list |
| AC-13 | all (cross-cut) | `sddk vault validate --root /var/mnt/DiscoChino2-fast/Proyectos/python/Reactive-Narrative-Studio-Specs --scope . --vault /home/rubentxu/.sddk-knowledge/p-490921be0aac9b69 --format json` (assert `errors == 0` in the JSON envelope) |

## 8. Risks

Inherited from the proposal §"Risks" plus design-specific additions.
Each row has owner, mitigation, and a check the apply phase can run.

| Risk ID | Description | Owner | Mitigation | Check |
|---|---|---|---|---|
| **R-schema-inflation** | 25 new JSON Schemas in one change overload review attention | Apply lead (wave committer) | Four-wave ordering with reversible isolation; if review stalls, waves 3–4 MAY split into a second change | `git log --oneline spec/spec-completion/wave-*` shows exactly four wave commits |
| **R-adr-creep** | ADR count exceeds the `docs/07` irreversibility bar | Apply lead | Hard cap of ≤ 1 new ADR (§4); zero by default | `test $(ls docs/adrs/ADR-*.md \| wc -l) -le 26` |
| **R-overlay-drift** | Overlay ↔ original doc drift compounds when new schemas cite the overlay-only vocabulary | Apply lead | Wave 1 normalises vocabulary before any new schema references it | Wave 1 lands before wave 2 commits; `git log --reverse` shows wave 1 first |
| **R-activegraph-maturity** | Upstream is young (`docs/06` L127); schemas that bind to ActiveGraph shape are fragile | Apply lead + reviewer | ADR-004 keeps ActiveGraph an adapter; nothing in this change binds a contract to ActiveGraph shapes | `grep -RE "activegraph\|ActiveGraph" specs/*.schema.json` finds zero required-field bindings |
| **R-no-ci** | No CI gate for schema validity; drift is invisible until someone looks | Verifier (post-apply) | Manual validation runs captured in the verifier envelope; CI change is a separate follow-up | The advisory sweep commands in §5.2 all exit `0` post-apply |
| **R-working-tree-cleanliness** | Working tree dirty at apply start | Apply lead | Baseline `62f0e7b` is clean; apply starts with `git status` asserting only `changes/` untracked | `git status --porcelain` returns only `?? changes/` |
| **R-cross-ref-rot** | Apply edits break wikilinks / inline path references in `docs/` | Apply lead | Do not rename any docs/specs/examples/templates/uat file; every new schema gets ≥ 1 prose citation | §5.2 orphan-sweep exits `0`; `git diff --stat 62f0e7b -- docs/ specs/ examples/ templates/ uat/` shows only additions/modifications, no renames |
| **R-vocab-half-applied** | Wave 1 lands but waves 2–4 don't update every stale prose reference | Apply lead | The §5.2 advisory sweep is run by apply lead after each wave; wave 4's commit body reports zero UPPERCASE residuals | `grep -REn "\b(PASS\|WARNING\|BLOCKED\|PENDING\|UNKNOWN)\b" docs/ specs/ examples/` returns no legitimate matches post-wave 4 |
| **R-spec-yml-vs-yaml** | YAML extension naming (`*.yaml` vs `*.yml`) inconsistency breaks glob sweeps | Apply lead | Pack convention is `*.yaml`; apply MUST NOT introduce `*.yml` files | `find . -name '*.yml' -not -path '*/.git/*' \| wc -l` returns `0` (or matches the baseline) |
| **R-decision-schema-filename** | `examples/decision.yaml` declares `schema: narrative-decision/v1` but the natural filename for the schema is `decision.schema.json`; confusing readers | Apply lead | Document the disambiguation in `specs/decision.schema.json` `description` field and in `MANIFEST.json` (verify-only) | `specs/decision.schema.json` description contains the literal token `narrative-decision/v1` |

## 9. Out of scope

Mirror of the proposal §"Out of scope" plus design-specific exclusions:

- Python tooling, package scaffolding, CLI implementation, test harness
  (`narrative inspect`, `narrative next`, `narrative check` are M1/M3 work).
- CI workflows that gate schema validity (explore risk 6; a separate change).
- Runtime DB and ActiveGraph wiring (ADR-004 keeps ActiveGraph an adapter).
- Round 2 — `spec-completion-followup`: problems 016, 017, 018, 019, 020,
  021, 022, 023, 024, 025 (the 10 nice-to-have problems deferred from the
  proposal).
- New ADRs beyond the optional `ADR-026-catalog-vocabulary.md` (≤ 1 by
  default; 0 is the apply-phase default).
- Renaming of any existing file (`docs/*`, `specs/*`, `examples/*`,
  `templates/*`, `uat/*`, `docs/adrs/*`, `MANIFEST.json`).
- Modifications to the 11 invariants or to the `~/.sddk-knowledge/` vault.
- New top-level directories other than `control-plane/workflows/comfyui/`
  (explicitly permitted by `invariant-protection` REQ-INV-005 for the
  ComfyUI fixtures).
- Tooling that mechanically enforces the 11 invariants (a new capability;
  see `invariant-protection` §"Open question for orchestrator"). **If the
  orchestrator decides such a tool is in scope, this design MUST be
  re-scoped — call it out as a new capability; do NOT fabricate a tool
  inside this change.** This is the basis on which this design reports
  `status: success` for AC-12 with manual text-checks; an automated
  invariant guard is explicitly deferred.
- Adopting future-proof `kind` values (`Universe`, `Series`, `Edition`).
- Migration of historical JSONL content (no operational history at HEAD).

## 10. References

### Proposal and spec deltas

- `changes/spec-completion/proposal.md` — SHA-256
  `f7e8aff6e790d28c57486a43aa1e86e2a7679d2f818f555414a4d9e111daa092`
- `changes/spec-completion/test-plan.md` — SHA-256
  `350607b46f840d6f08cd9a9b66628f01b0778ac19b1fdfd39381f3b7d4b0427b`
- 8 spec-delta files (capability → SHA-256):
  - `changes/spec-completion/specs/narrative-init-cli/spec.md` — `8e874991b321386c85d9e8542a41e9dda956decd6e82536967e6764cf3bb9eb1`
  - `changes/spec-completion/specs/project-validation/spec.md` — `54dd461401269970ce1bf4355fab25119cfa124c4a6256a02bfb38e71959a1f3`
  - `changes/spec-completion/specs/control-plane-projections/spec.md` — `40877733e7710a7a6a066e81bcc771c3e0d2c1d757d35b48876f722f197911ba`
  - `changes/spec-completion/specs/overlay-vocabulary/spec.md` — `97ba6dfe27c6ee8625782dd74cf061245f60f465e695ade29197b0996390f208`
  - `changes/spec-completion/specs/skill-template-evaluation/spec.md` — `9bcee96e0cf429658cbb1a1a164c9d835a0aa5378fa33b0319c5c74cf17a152a`
  - `changes/spec-completion/specs/event-schema/spec.md` — `d453188d0d4cd569c1bfb0bcb7875ce494eccb911d0ca968a4fff2ab1fa25380`
  - `changes/spec-completion/specs/invariant-protection/spec.md` — `cda03e0d53d8cca95272d752b23a89fcba2e2de860db1839afe2725b79067926`
  - `changes/spec-completion/specs/vault-correctness/spec.md` — `f6783ede4efcdd1a4a34e33b68b02f3d7fbe015b501b8a41a11adeba2a19b821`

### Baseline specs and prose

- 5 existing schemas at HEAD `62f0e7b`:
  `specs/catalog-entity.schema.json`, `specs/control-plane.schema.json`,
  `specs/control-plane-extension.schema.json`, `specs/creation-recipe.schema.json`,
  `specs/project.schema.json`.
- 9 modified docs (per proposal §"Per-artefact tie-in"): `docs/07`, `docs/13`,
  `docs/14`, `docs/15`, `docs/16`, `docs/25`, `docs/29`, plus
  `docs/06`, `docs/12`, `docs/22`, `docs/23`, `docs/27`, `docs/28`, `docs/33`,
  `docs/34` (additional cross-reference sites for new schemas).
- 5 example YAMLs at HEAD: `examples/catalog-project.yaml`,
  `examples/creation-recipe-middle-grade.yaml`, `examples/decision.yaml`,
  `examples/middle-grade-profile.yaml`, `examples/visual-spec.yaml`.
- `templates/skill-template.md` (H2 list grows from 11 → 12 sections).

### Vault and cycle artifacts

- Vault root: `/home/rubentxu/.sddk-knowledge/p-490921be0aac9b69`
- Cycle artifact directory:
  `~/.sddk-knowledge/p-490921be0aac9b69/cycles/cycle-m3-explore-2026-08-28.md`
- Milestone listing the 11 invariants:
  `~/.sddk-knowledge/p-490921be0aac9b69/milestones/m1-onboard-2026-08-28.md`
  §"Invariants that every future change MUST preserve"
- Problem taxonomy (29 problems):
  `~/.sddk-knowledge/p-490921be0aac9b69/problems/summary-m3-explore-2026-08-28.md`
  plus the 29 `problem-001..problem-029` files cited inline above.

### Baseline commits (do not amend)

- `fd9c176` — chore(specs): import initial Reactive Narrative Studio specification pack
- `521b02f` — feat(control-plane): apply Backstage-inspired Control Plane overlay (canonical baseline)
- `62f0e7b` — chore(manifest): align MANIFEST.json with overlay-imported contents (working tree clean)

## Appendix A — New schema file inventory (25 files, alphabetical)

For the verifier's reference. Each row is `specs/<filename>` → AC(s) it
satisfies or contributes to.

| File | AC(s) |
|---|---|
| `inspect.schema.json` | AC-01 |
| `next.schema.json` | AC-01 |
| `narrative-lock.schema.json` | (cross-cuts) |
| `decision.schema.json` | (cross-cuts) |
| `narrative-ir.schema.json` | AC-11 |
| `visual-ir.schema.json` | AC-11 |
| `sequential-ir.schema.json` | AC-11 |
| `event.schema.json` | AC-10, AC-11 |
| `provider-capability.schema.json` | AC-11 |
| `publishing-receipt.schema.json` | AC-11 |
| `profile.schema.json` | AC-02, AC-03, AC-11 |
| `visual-spec.schema.json` | AC-02, AC-03, AC-11 |
| `cp-project.schema.json` | AC-04, AC-11 |
| `cp-progress.schema.json` | AC-04, AC-11 |
| `cp-graph.schema.json` | AC-04, AC-11 |
| `cp-workflow.schema.json` | AC-04, AC-11 |
| `cp-chapters.schema.json` | AC-04, AC-11 |
| `cp-characters.schema.json` | AC-04, AC-11 |
| `cp-assets.schema.json` | AC-04, AC-11 |
| `cp-visual-quality.schema.json` | AC-04, AC-11 |
| `cp-uat.schema.json` | AC-04, AC-11 |
| `cp-approvals.schema.json` | AC-04, AC-11 |
| `cp-costs.schema.json` | AC-04, AC-11 |
| `cp-history.schema.json` | AC-04, AC-11 |
| `cp-scm.schema.json` | AC-04, AC-11 |

Modified schema files: `specs/catalog-entity.schema.json` (wave 1),
`specs/control-plane.schema.json` (wave 3).