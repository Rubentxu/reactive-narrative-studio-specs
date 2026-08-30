# Tasks: spec-completion — four-wave implementation plan

- **Change**: `spec-completion`
- **Cycle**: `p-490921be0aac9b69/m3-explore-2026-08-28` (phase `plan`, path `A-full`)
- **Baseline**: branch `main`, HEAD `62f0e7b`, working tree `?? changes/` only
- **Proposal SHA-256**: `f7e8aff6e790d28c57486a43aa1e86e2a7679d2f818f555414a4d9e111daa092`
- **Design SHA-256**: `6c2136f82bf3e24f3c86a72f1483c5e1c10c15b36b889405c38ebe3d35643020`
- **Commit strategy**: atomic-per-wave (each wave = exactly one commit)
- **Validator pinned**: `python3` + `jsonschema 4.23.0` + `PyYAML` (see D-02)

## 1. Overview

The apply phase lands 25 new JSON Schemas and ~24 modified Markdown/YAML files as
four atomically-committed, independently-revertible waves. Wave 1 normalizes the
catalog vocabulary (status casing, `lifecycle` enum, `kind` enum) so that every
schema authored in waves 2–4 references a stable vocabulary; it must therefore
land first and be reverted last. Wave 2 authors the two CLI JSON contracts that
close blocker B-001. Wave 3 authors the 13 Control Plane projection schemas plus
the two runtime-state contracts and wires them into the envelope. Wave 4 authors
the three composite IR families, the event/provider/publishing schemas, the two
example-discriminator schemas, the ComfyUI fixtures and the skill-template
governance section. **Waves 1–3 fit the 6-block review budget; wave 4 does not
— see §6 for the mandatory scope decision before apply starts.**

## 2. Wave summary table

| Wave | Subject line | Files | Satisfied ACs | Reversible in isolation? | Cross-wave dependencies |
|---:|---|---:|---|---|---|
| 1 | `spec(spec-completion/wave-1): normalize catalog vocabulary` | 3 modified (`specs/catalog-entity.schema.json`, `docs/13-CONTROL-PLANE.md`, `docs/27-GLOSSARY.md`) | AC-05, AC-06, AC-07 | Yes, **only while waves 2–4 are unlanded**; revert last | none |
| 2 | `spec(spec-completion/wave-2): add inspect/next JSON contracts` | 2 new (`specs/inspect.schema.json`, `specs/next.schema.json`) + 2 modified (`docs/16-CLI.md`, `docs/25-IMPLEMENTATION-STARTER.md`) | AC-01, AC-09 | Yes | none (vocabulary-independent) |
| 3 | `spec(spec-completion/wave-3): add 13 control-plane projection schemas` | 15 new (`specs/cp-*.schema.json` ×13, `specs/narrative-lock.schema.json`, `specs/decision.schema.json`) + 8 modified (`specs/control-plane.schema.json` + 7 docs) | AC-04 | Yes | wave 1 (status enum vocabulary) |
| 4 | `spec(spec-completion/wave-4): IR/event/provider/publishing schemas` | 8 new schemas + 9 new `control-plane/workflows/comfyui/*.json` + 11 modified | AC-02, AC-03, AC-08, AC-10, AC-11 | Yes | wave 1 (vocabulary), wave 2 (`inspect.schema.json` cited by `uat/UAT-M0-01.md`) |

Cross-cutting ACs AC-12 (invariants + ADR cap) and AC-13 (`sddk vault validate`
→ `errors: 0`) are verified once, after the last wave lands.

## 3. Per-wave task breakdown

### Wave 1 — Normalize catalog vocabulary

Closes problems 026, 027, 028, 029. **Estimated delta: ~50 changed lines, 1 block.**

#### 1.0 Pre-flight checks (read-only)

```bash
cd reactive-narrative-studio-specs
git rev-parse --short HEAD                       # expect: 62f0e7b
git status --porcelain                           # expect exactly: ?? changes/
test -f specs/catalog-entity.schema.json         # expect exit 0
grep -nE "(continuity|visual|uat|publishing): (PASS|WARNING|BLOCKED|PENDING)" \
  docs/13-CONTROL-PLANE.md                       # expect exit 0, lines 233-236
python3 -c "import json;s=json.load(open('specs/catalog-entity.schema.json'));\
assert 'enum' not in s['properties']['kind'];print('kind is free-string: OK')"
```

**Verified finding that corrects design §3.4** — the `docs/13-CONTROL-PLANE.md`
§"Entity envelope" YAML block (lines 64–92) is **already valid** against
`specs/catalog-entity.schema.json` at HEAD `62f0e7b`: it already uses
`apiVersion: narrative.dev/v1alpha1`, `kind: NarrativeProject`,
`lifecycle: visual-production` and lowercase `status.checks`. Apply MUST treat
that block as **verify-only (zero edits)**; the only real uppercase drift is the
§"Lifecycle and status" block at lines 233–236. Regenerating the envelope block
would be churn. AC-07 is therefore a **regression guard**: the block must still
validate *after* the enums are added.

#### 1.1 Apply steps

1. `specs/catalog-entity.schema.json` — replace the `properties.kind` body
   (currently `{"type": "string", "minLength": 1}`) with a `type: "string"` plus
   an `enum` of exactly 11 values in this order: `NarrativeProject`, `Character`,
   `Chapter`, `Build`, `UATRun`, `Skill`, `Pack`, `Profile`, `Recipe`,
   `Workflow`, `Provider` (REQ-VOCAB-003).
2. `specs/catalog-entity.schema.json` — expand `properties.spec` (currently
   `{"type": "object"}`) into an object declaring
   `properties.lifecycle.enum` with exactly 10 values in this order: `idea`,
   `development`, `drafting`, `editorial`, `visual-production`, `proof`, `uat`,
   `ready`, `published`, `archived` (REQ-VOCAB-002). Keep `spec` open
   (`additionalProperties` NOT set to false on `spec`) so existing
   `language`/`format` keys in `docs/13` still validate. Root
   `additionalProperties: false` is preserved unchanged.
3. `docs/13-CONTROL-PLANE.md` lines 233–236 — recase the four status values in
   the §"Lifecycle and status" fenced `text` block to `continuity: pass`,
   `visual: warning`, `uat: pending`, `publishing: blocked` (REQ-VOCAB-004).
4. `docs/27-GLOSSARY.md` — append one entry at end of file:
   `**Status (canonical vocabulary)** — Control Plane check-status values are`
   `lowercase: `pass | warning | blocked | pending | unknown`. Source of truth:`
   `specs/control-plane.schema.json checks enum. Any other casing is rejected.`
5. **No edit** to `docs/13-CONTROL-PLANE.md` lines 64–92, to
   `specs/control-plane.schema.json`, to `examples/catalog-project.yaml`, or to
   `docs/29-NARRATIVE-CATALOG.md` — all already conform (verify-only).

#### 1.2 Commit message

```text
spec(spec-completion/wave-1): normalize catalog vocabulary

Codify the status casing, lifecycle enum and kind enum already documented in
docs/29-NARRATIVE-CATALOG.md into specs/catalog-entity.schema.json: kind gains
an 11-value enum, spec.lifecycle gains the 10-stage enum. Recase the four
status values in docs/13-CONTROL-PLANE.md "Lifecycle and status" to lowercase
and record the canonical vocabulary in docs/27-GLOSSARY.md.

The docs/13 "Entity envelope" example already validates at 62f0e7b and is left
untouched; wave 1 only adds the constraint it must keep satisfying.

Closes problems 026, 027, 028, 029. Satisfies AC-05, AC-06, AC-07.
```

#### 1.3 Post-apply verification (each must exit 0)

```bash
python3 -c "import json;s=json.load(open('specs/catalog-entity.schema.json'));\
l=s['properties']['spec']['properties']['lifecycle']['enum'];k=s['properties']['kind']['enum'];\
assert len(l)==10 and len(set(l))==10;assert len(k)==11 and len(set(k))==11;print('AC-06 PASS')"
python3 -c "import json,yaml,jsonschema;b=open('docs/13-CONTROL-PLANE.md').read()\
.split('\`\`\`yaml')[1].split('\`\`\`')[0];\
jsonschema.validate(yaml.safe_load(b),json.load(open('specs/catalog-entity.schema.json')));print('AC-07 PASS')"
grep -REn "\b(PASS|WARNING|BLOCKED|PENDING|UNKNOWN)\b" docs/ specs/ examples/ \
  | grep -vE "(canonical vocabulary|status vocabulary)" || echo "AC-05 PASS"
grep -q "Status (canonical vocabulary)" docs/27-GLOSSARY.md && echo "GLOSSARY PASS"
```

Negative probe (must exit non-zero — the enum actually constrains):

```bash
python3 -c "import json,jsonschema,sys;s=json.load(open('specs/catalog-entity.schema.json'));\
try:jsonschema.validate({'apiVersion':'narrative.dev/v1alpha1','kind':'RandomCapability',\
'metadata':{'name':'x'}},s);sys.exit('REJECT FAILED')
except jsonschema.ValidationError:print('VOCAB-S03 negative PASS')"
```

#### 1.4 Rollback

```bash
git revert TBD-by-apply   # wave-1 commit SHA
```

Safe only while waves 2–4 are unlanded. Once wave 3 or 4 has landed, reverting
wave 1 removes the enums those waves' prose and schemas depend on: revert
wave 4 → 3 → 2 → 1 in that order, or revert the whole range with
`git revert --no-commit <wave1>..<wave4>` followed by one commit.

---

### Wave 2 — CLI JSON contracts

Closes problems 001 (blocker B-001), 011, 012. **Estimated delta: ~151 changed
lines, 1 block.**

#### 2.0 Pre-flight checks (read-only)

```bash
git log --oneline -1 --grep="wave-1"             # wave 1 must already be committed
git status --porcelain                           # expect exactly: ?? changes/
test -f specs/inspect.schema.json; echo $?       # expect 1 (absent at HEAD)
test -f specs/next.schema.json; echo $?          # expect 1 (absent at HEAD)
grep -nE "Exit codes for .narrative check" docs/16-CLI.md; echo $?   # expect 1
grep -nE "^## \`check\`" docs/16-CLI.md          # expect exit 0, line 74
```

#### 2.1 Apply steps

1. Create `specs/inspect.schema.json` — JSON Schema 2020-12,
   `$id: https://narrative.dev/schemas/inspect.schema.json`,
   `title: "Narrative Inspect Output"`, `type: object`, root
   `additionalProperties: false`, root `required: ["project"]`;
   `properties.project` is an object with
   `required: ["identity", "profile", "runtimePath"]` and
   `additionalProperties: false` (REQ-CLI-001, REQ-CLI-007, Scenario CLI-S01).
2. Create `specs/next.schema.json` — JSON Schema 2020-12,
   `$id: https://narrative.dev/schemas/next.schema.json`,
   `title: "Narrative Next Output"`, root `additionalProperties: false`,
   `required: ["goal", "recommended_skills"]`; `goal` is a string with
   `minLength: 1`; `blocking` and `recommended_skills` are arrays of strings
   (REQ-CLI-002, Scenario CLI-S02).
3. `docs/16-CLI.md` — under the existing `## \`check\`` section (line 74), insert
   the literal H3 heading ``### Exit codes for `narrative check` `` followed by a
   5-row Markdown table mapping exit codes `0`–`4` to five distinct documented
   conditions (0 = all checks pass; 1 = one or more blocking checks failed;
   2 = warnings only, no blockers; 3 = project not initialised / no
   `narrative.yaml`; 4 = internal error). Every row's code MUST be unique
   (REQ-CLI-005, Scenario CLI-S03).
4. `docs/16-CLI.md` — in `## JSON-first agent interface` (line 45) add the
   literal tokens `specs/inspect.schema.json` and `specs/next.schema.json` as
   the canonical contracts (REQ-CLI-003, REQ-CLI-004).
5. `docs/25-IMPLEMENTATION-STARTER.md` — in Slice A step 5 add one line:
   `> Schema reference: specs/inspect.schema.json` (REQ-CLI-003).

#### 2.2 Commit message

```text
spec(spec-completion/wave-2): add inspect/next JSON contracts

Author specs/inspect.schema.json, the output contract for narrative inspect
--json, and specs/next.schema.json for narrative next --json. Both are JSON
Schema 2020-12 with a stable $id and additionalProperties false at root.

Add the normative "Exit codes for narrative check" table to docs/16-CLI.md
mapping codes 0-4 to five distinct conditions, and cite both schemas from
docs/16-CLI.md and docs/25-IMPLEMENTATION-STARTER.md Slice A step 5.

Closes blocker B-001 (problem 001) plus problems 011 and 012. Satisfies AC-01
and AC-09.
```

#### 2.3 Post-apply verification (each must exit 0)

```bash
test -f specs/inspect.schema.json && test -f specs/next.schema.json
python3 -c "import json;[json.load(open(p)) for p in \
['specs/inspect.schema.json','specs/next.schema.json']];print('parse PASS')"
grep -q "specs/inspect.schema.json" docs/16-CLI.md \
  && grep -q "specs/inspect.schema.json" docs/25-IMPLEMENTATION-STARTER.md \
  && grep -q "specs/next.schema.json" docs/16-CLI.md && echo "AC-01 PASS"
grep -nE "Exit codes for .narrative check" docs/16-CLI.md \
  && test "$(grep -cE '^\| [0-4] ' docs/16-CLI.md)" -ge 5 && echo "AC-09 PASS"
python3 -c "import json,jsonschema;jsonschema.validate(\
{'goal':'approve-visual-bible','blocking':[],'recommended_skills':['character-visual-design']},\
json.load(open('specs/next.schema.json')));print('CLI-S02 PASS')"
```

#### 2.4 Rollback

```bash
git revert TBD-by-apply   # wave-2 commit SHA
```

Fully independent: wave 2 adds two new files and appends to two docs, and
references no vocabulary from wave 1. Reverting it re-opens blocker B-001 but
leaves waves 1, 3 and 4 valid. No other wave `$ref`s these two schemas.

---

### Wave 3 — Control Plane projection schemas + runtime state

Closes problems 002, 003, 004. **Estimated delta: ~895 changed lines, 3 blocks.**

#### 3.0 Pre-flight checks (read-only)

```bash
git log --oneline -1 --grep="wave-1"             # wave 1 MUST be landed first
git status --porcelain                           # expect exactly: ?? changes/
ls specs/cp-*.schema.json 2>/dev/null | wc -l    # expect 0
python3 -c "import json;s=json.load(open('specs/control-plane.schema.json'));\
assert s['properties']['schema']['const']=='control-plane/project/v1';\
assert '\$defs' not in s;print('envelope unextended: OK')"
test -f templates/narrative.lock && test -f examples/decision.yaml
```

#### 3.1 Apply steps

Split into three review blocks; all three land in **one** commit.

- **Block 3A** — create `specs/cp-project.schema.json`,
  `specs/cp-progress.schema.json`, `specs/cp-graph.schema.json`,
  `specs/cp-workflow.schema.json`, `specs/cp-chapters.schema.json`.
- **Block 3B** — create `specs/cp-characters.schema.json`,
  `specs/cp-assets.schema.json`, `specs/cp-visual-quality.schema.json`,
  `specs/cp-uat.schema.json`, `specs/cp-costs.schema.json`.
- **Block 3C** — create `specs/cp-approvals.schema.json`,
  `specs/cp-history.schema.json`, `specs/cp-scm.schema.json`,
  `specs/narrative-lock.schema.json`, `specs/decision.schema.json`; extend
  `specs/control-plane.schema.json`; add the 7 doc citations.

Every `cp-*.schema.json` file MUST follow this exact shape (REQ-CP-002/004/005/006):

1. `$schema: "https://json-schema.org/draft/2020-12/schema"`.
2. `$id: "https://narrative.dev/schemas/cp-<type>.schema.json"`.
3. `title`: PascalCase, containing the projection display name (Scenario CP-S01).
4. `type: "object"`, root `additionalProperties: false`.
5. `required: ["schema", "generatedAt", "sourceRevision", "<payload>"]` — at
   least one projection-specific payload field (Scenario CP-S03).
6. `properties.schema.const: "control-plane/<type>/v1"`.
7. `properties.generatedAt.$ref: "#/$defs/isoTimestamp"` and
   `properties.sourceRevision.$ref: "#/$defs/sourceRevision"`.
8. Inline `$defs.isoTimestamp` (string, `format: "date-time"`) and
   `$defs.sourceRevision` (string, `minLength: 1`) — inlined per schema, never
   a shared `_common.schema.json`, to keep the reference graph acyclic
   (design §2.3).
9. Any status-bearing field uses the lowercase enum landed in wave 1:
   `["pass","warning","blocked","pending","unknown"]`.

Additional file-level steps:

10. `specs/narrative-lock.schema.json` — envelope for `templates/narrative.lock`;
    pins `schema: "narrative-lock/v1"`.
11. `specs/decision.schema.json` — envelope for `examples/decision.yaml`; pins
    `schema: "narrative-decision/v1"`; its `description` MUST contain the
    literal token `narrative-decision/v1` to document the filename ≠
    discriminator mismatch (risk R-decision-schema-filename).
12. `specs/control-plane.schema.json` — add a top-level `$defs` object with 13
    entries, each `{"$ref": "https://narrative.dev/schemas/cp-<type>.schema.json"}`
    (REQ-CP-003, Scenario CP-S02). Do **not** change the existing envelope
    `const`, `required`, or root `additionalProperties: false`. This is the only
    permitted upward `$ref` arrow (envelope → projection); projections MUST NOT
    reference the envelope.
13. Add one prose citation per projection basename across
    `docs/13-CONTROL-PLANE.md`, `docs/14-PUBLISHING.md`,
    `docs/15-SCM-PROVENANCE.md`, `docs/23-OBSERVABILITY-COST.md`,
    `docs/29-NARRATIVE-CATALOG.md`, `docs/33-STUDIO-HOME-WORKBENCH.md`,
    `docs/34-CONTROL-PLANE-DATA-CONTRACTS.md` (REQ-CP-007) — this is what keeps
    AC-11 (zero orphan schemas) green.

#### 3.2 Commit message

```text
spec(spec-completion/wave-3): add 13 control-plane projection schemas

Author the 13 Control Plane projection schemas (project, progress, graph,
workflow, chapters, characters, assets, visual-quality, uat, approvals, costs,
history, scm) plus specs/narrative-lock.schema.json and
specs/decision.schema.json. Each projection pins schema control-plane/<type>/v1
and declares generatedAt and sourceRevision as required.

Extend specs/control-plane.schema.json with a $defs map referencing the 13
projection $ids so every projection is $ref-reachable from the envelope, and
cite each new schema from at least one docs file.

Closes problems 002, 003, 004. Satisfies AC-04.
```

#### 3.3 Post-apply verification (each must exit 0)

```bash
test "$(ls specs/cp-*.schema.json | wc -l)" -eq 13 && echo "CP-S01 PASS"
python3 -c "import json,glob;[json.load(open(p)) for p in glob.glob('specs/*.schema.json')];\
print('JSON parse sweep PASS')"
python3 -c "import json;d=json.load(open('specs/control-plane.schema.json'));\
assert len(d.get('\$defs',{}))>=13;print('AC-04 PASS')"
python3 -c "import json,glob,os;
for p in sorted(glob.glob('specs/cp-*.schema.json')):
    s=json.load(open(p)); t=os.path.basename(p)[3:-12]
    assert s['properties']['schema']['const']=='control-plane/%s/v1'%t, p
    assert s['additionalProperties'] is False, p
    for k in ('schema','generatedAt','sourceRevision'): assert k in s['required'], p
print('CP-S03 PASS')"
for f in specs/*.schema.json; do base=$(basename "$f" .schema.json); \
  hits=$(grep -REc "$base" docs/ examples/ uat/ 2>/dev/null | awk -F: '{s+=$2} END{print s}'); \
  test "$hits" -ge 1 || { echo "ORPHAN $f"; exit 1; }; done; echo "AC-11 (wave 3) PASS"
```

#### 3.4 Rollback

```bash
git revert TBD-by-apply   # wave-3 commit SHA
```

Independently revertible: nothing outside wave 3 `$ref`s the `cp-*` schemas, and
the `$defs` extension to `specs/control-plane.schema.json` reverts with the same
commit, restoring the HEAD envelope byte-for-byte. Reverting wave 3 while wave 4
is landed is safe — wave 4 declares no `$ref` into any `cp-*` schema. Do **not**
revert wave 1 before wave 3: the projection status enums consume its vocabulary.

---

### Wave 4 — IR, event, provider, publishing, fixtures, discriminators

Closes problems 005, 006, 007, 008, 009, 010, 013, 014, 015. **Estimated delta:
~1173 changed lines, 4 blocks — this wave exceeds the review budget on its own;
see §5 D-01 and §6.**

#### 4.0 Pre-flight checks (read-only)

```bash
git log --oneline -1 --grep="wave-1"             # wave 1 MUST be landed
git log --oneline -1 --grep="wave-2"             # wave 2 MUST be landed (UAT cites inspect)
git status --porcelain                           # expect exactly: ?? changes/
test "$(grep -cE '^## ' templates/skill-template.md)" -eq 11   # expect 11 at HEAD
for f in examples/*.yaml; do head -1 "$f" | grep -qE "^(schema|apiVersion):" \
  && echo "OK $f" || echo "MISS $f"; done   # expect MISS on 2 files
test -d control-plane/workflows/comfyui; echo $?               # expect 1 (absent)
```

#### 4.1 Apply steps

Split into four review blocks; all four land in **one** commit.

- **Block 4A** — create `specs/narrative-ir.schema.json` (composite, `$defs` for
  Scene, Promise, Fact, narrative-object envelope) and
  `specs/visual-ir.schema.json` (`$defs` for Visual DNA, Scene Visual Contract,
  Style Bible). Each `$defs` node type MUST be individually addressable by
  `$ref` (proposal §Approach).
- **Block 4B** — create `specs/sequential-ir.schema.json` (`$defs` for
  Sequential Work, Page, Panel, Dialogue, Caption, Balloon, SFX) and
  `specs/event.schema.json`. The event envelope declares `eventType`,
  `occurredAt`, `schema` (`narrative-event/v1`), `projectId`, `payload`
  (REQ-EVT-002), with one `$defs` entry per documented event-type token —
  minimum set `run.started`, `run.completed`, `cost.recorded`,
  `candidate.accepted`, `candidate.rejected`, `asset.generated`,
  `approval.granted`, `publish.completed` (REQ-EVT-003, Scenario EVT-S02).
  `payload` MUST forbid inline base64 image bytes via
  `additionalProperties: false` on each payload `$def` (REQ-EVT-004).
- **Block 4C** — create `specs/provider-capability.schema.json`,
  `specs/publishing-receipt.schema.json`, `specs/profile.schema.json`,
  `specs/visual-spec.schema.json`; add `schema: profile/v1` at line 1 of
  `examples/middle-grade-profile.yaml` and `schema: visual-spec/v1` at line 1 of
  `examples/visual-spec.yaml`; add `## Evaluation cases` as H2 #12 of
  `templates/skill-template.md` with a `### Case 1 — smoke test` placeholder and
  the expected PASS/FAIL signal pattern (REQ-SKILL-001, REQ-SKILL-004); cite
  `specs/inspect.schema.json` and the five example files in `uat/UAT-M0-01.md`
  and `uat/UAT-M1-01.md`; add prose back-references in `docs/06`, `docs/12`,
  `docs/15`, `docs/22`, `docs/23`, `docs/27`.
- **Block 4D** — create `control-plane/workflows/comfyui/` with 9 fixture files:
  `character-sheet.json`, `expression-sheet.json`, `location-concept.json`,
  `illustration.json`, `inpaint-character.json`, `comic-panel.json`,
  `manga-panel.json`, `upscale-print.json`, `cover.json` (per
  `docs/12-IMAGE-PIPELINE.md` lines 30–41). This is the only new top-level
  directory permitted (REQ-INV-005).

#### 4.2 Commit message

```text
spec(spec-completion/wave-4): IR/event/provider/publishing schemas

Author the three composite IR schemas (narrative, visual, sequential) with one
$defs entry per node type, the JSONL event envelope with a $defs entry for every
documented event type, and the provider-capability, publishing-receipt, profile
and visual-spec schemas.

Add schema discriminators to examples/middle-grade-profile.yaml and
examples/visual-spec.yaml, add the Evaluation cases section to
templates/skill-template.md, land the 9 ComfyUI workflow fixtures under
control-plane/workflows/comfyui/, and make the UAT-M0-01 and UAT-M1-01
machine-check steps explicit.

Closes problems 005-010, 013, 014, 015. Satisfies AC-02, AC-03, AC-08, AC-10,
AC-11.
```

#### 4.3 Post-apply verification (each must exit 0)

```bash
for f in examples/*.yaml; do head -1 "$f" | grep -qE "^(schema|apiVersion):" \
  || { echo "MISS $f"; exit 1; }; done; echo "AC-03 PASS"
python3 -c "import yaml,glob;[yaml.safe_load(open(p)) for p in \
glob.glob('examples/*.yaml')+glob.glob('templates/*.yaml')];print('YAML sweep PASS')"
grep -nE "^## Evaluation cases$" templates/skill-template.md \
  && test "$(grep -cE '^## ' templates/skill-template.md)" -eq 12 && echo "AC-08 PASS"
python3 -c "import json;s=json.load(open('specs/event.schema.json'));\
e=s['properties']['eventType']['enum'];req={'run.started','run.completed','cost.recorded',\
'candidate.accepted','candidate.rejected','asset.generated','approval.granted',\
'publish.completed'};assert len(e)==8 and set(e)>=req,(set(e)^req);print('AC-13.5 PASS')"
test "$(ls control-plane/workflows/comfyui/*.json | wc -l)" -eq 9 \
  && python3 -c "import json,glob;[json.load(open(p)) for p in \
glob.glob('control-plane/workflows/comfyui/*.json')];print('fixtures PASS')"
for f in specs/*.schema.json; do base=$(basename "$f" .schema.json); \
  hits=$(grep -REc "$base" docs/ examples/ uat/ 2>/dev/null | awk -F: '{s+=$2} END{print s}'); \
  test "$hits" -ge 1 || { echo "ORPHAN $f"; exit 1; }; done; echo "AC-11 PASS"
```

Cross-cutting, run once after wave 4 (AC-02, AC-12, AC-13):

```bash
test "$(ls docs/adrs/ADR-*.md | wc -l)" -le 26 && echo "AC-12 ADR cap PASS"
find . -name '*.yml' -not -path './.git/*' | wc -l          # expect 0
sddk vault validate --root <root> --scope . \
  --vault /home/rubentxu/.sddk-knowledge/p-490921be0aac9b69 --format json  # errors: 0
```

#### 4.4 Rollback

```bash
git revert TBD-by-apply   # wave-4 commit SHA
```

Independently revertible and the safest wave to drop: it adds only new files
plus append-only prose, and nothing in waves 1–3 `$ref`s any wave-4 schema.
Reverting it restores `templates/skill-template.md` to 11 H2 sections and drops
the two example discriminators, re-opening AC-03 and AC-08 but leaving AC-01,
AC-04, AC-05, AC-06, AC-07 and AC-09 green. If the §6 split is accepted, this
wave is never committed here — it is lifted verbatim into a follow-up change.

## 4. Cross-wave dependency map

```text
wave 1 (vocabulary)  ──┬──> wave 3 (projections consume the lowercase status enum)
                       └──> wave 4 (IR/event schemas consume lifecycle + kind)
wave 2 (CLI contracts) ────> wave 4 (uat/UAT-M0-01.md cites specs/inspect.schema.json)
wave 3 ─── no outbound edge ───> wave 4   (independent; order 3→4 is convenience only)
```

- **Wave 1 is first and unconditional.** Its enums are the vocabulary every later
  schema references. Landing wave 3 or 4 first would embed the drifting casing
  and force rework (design risk R-overlay-drift).
- **Wave 2 has no inbound dependency** and may land before or after wave 3. It is
  ordered second only because it closes the blocker with the smallest diff.
- **Wave 4 depends on wave 2** solely through the `uat/UAT-M0-01.md` citation of
  `specs/inspect.schema.json`; if wave 2 is deferred, drop that citation from
  wave 4 rather than reordering.
- **Revert order is the reverse**: 4 → 3 → 2 → 1. Wave 1 is reverted last, or the
  whole range is reverted as one unit.

## 5. Decision points

| id | Type | Trigger | Auto-decide rule | Fallback / escalation |
|---|---|---|---|---|
| **D-01** | **human pause** | Total review blocks = 9, exceeding the ≤6 budget (§6) | none — apply MUST NOT start wave 4 without a verdict | Split: land waves 1–3 as `spec-completion` (5 blocks), lift wave 4 into a new change. See §6 for the naming constraint. |
| **D-02** | orchestrator, auto-decide | `sddk-json-schema-validate` is not on PATH (verified at plan time) | Use the sanctioned equivalent `python3 -c "import jsonschema..."` with recorded argv + exit code, per proposal §Dependencies | If `jsonschema` is also missing, block apply with `tool_unavailable` |
| **D-03** | **human pause** | Reviewer asks to reverse a vocabulary spelling (lowercase → UPPERCASE, or enum membership) | none — the enum is the contract and waves 2–4 consume it | Reversal after wave 3 lands requires reverting waves 4→3→2→1 and re-authoring; escalate to orchestrator before any wave-1 amendment |
| **D-04** | orchestrator pause | SHA conflict: a consumed artifact's SHA-256 no longer matches the value recorded in §7 | none — a mismatched input invalidates the plan | Halt apply, re-run the tasks phase against the new SHA; never apply a plan derived from a superseded design |
| **D-05** | **human pause** | Reviewer demands an ADR paper trail for the vocabulary choices | none — design §4 sets the default to zero new ADRs | Add **exactly one** `docs/adrs/ADR-026-catalog-vocabulary.md` in wave 1. A second ADR breaches AC-12 (`≤ 26`); orchestrator is final arbiter |
| **D-06** | orchestrator, auto-decide | Working tree is not exactly `?? changes/` at any wave pre-flight | none | Halt that wave, report the dirty paths; do not `git add -A` or stash |

## 6. Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2269 (`additions + deletions`, all four waves) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Waves 1–3 as `spec-completion` (5 blocks) → wave 4 as a separate change (4 blocks) |
| Delivery strategy | ask-on-risk (not supplied in the launch plan; derived from High budget risk + D-01) |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Per-wave forecast

| Wave | Est. changed lines | Blocks | Est. review time | Reviewer attention areas |
|---:|---:|---:|---:|---|
| 1 | ~50 | 1 | 20 min | Enum membership and ordering (10 lifecycle, 11 kind); that `spec` stays open so `language`/`format` still validate; that the docs/13 envelope block was **not** edited |
| 2 | ~151 | 1 | 35 min | Exit-code rows are mutually distinct; `required` set on `inspect.project`; the literal heading token the verifier greps |
| 3 | ~895 | 3 | 2 h 15 min | 13 × envelope conformance (`const`, `generatedAt`, `sourceRevision`); `$defs` reachability without a cyclic arrow; that the envelope's existing `const`/`required` are untouched |
| 4 | ~1173 | 4 | 3 h 00 min | `$defs` addressability per IR node type; event-type coverage vs. docs prose; no inline image bytes; 9 fixtures parse; skill-template H2 count is exactly 12 |

### Budget verdict

**The four-wave plan needs 9 blocks; the budget is 6.** No block was inflated to
force a fit — per-block estimates are 50, 151, 3 × ~300, and 4 × ~293. The
arithmetic floor for 2269 lines is 6 blocks even before the atomic-per-wave
commit boundary is honoured, and honouring it costs 3 more.

**Recommended split** (design risk R-schema-inflation already sanctions it —
"if review stalls, waves 3–4 MAY split into a second change"):

| Change | Waves | Blocks | Lines |
|---|---|---:|---:|
| `spec-completion` (revised scope) | 1, 2, 3 | 5 | ~1096 |
| follow-up change | 4 | 4 | ~1173 |

**Naming constraint — do not reuse `spec-completion-followup`.** That id is
already reserved by proposal §"Out of Scope" for round 2 (problems 016–025).
Use a distinct id such as `spec-completion-ir`. This is the orchestrator's call
under D-01.

## 7. References

| Artifact | SHA-256 |
|---|---|
| `changes/spec-completion/proposal.md` (249 lines) | `f7e8aff6e790d28c57486a43aa1e86e2a7679d2f818f555414a4d9e111daa092` |
| `changes/spec-completion/design.md` (580 lines) | `6c2136f82bf3e24f3c86a72f1483c5e1c10c15b36b889405c38ebe3d35643020` |
| `changes/spec-completion/test-plan.md` | `350607b46f840d6f08cd9a9b66628f01b0778ac19b1fdfd39381f3b7d4b0427b` |
| `specs/narrative-init-cli/spec.md` | `8e874991b321386c85d9e8542a41e9dda956decd6e82536967e6764cf3bb9eb1` |
| `specs/project-validation/spec.md` | `54dd461401269970ce1bf4355fab25119cfa124c4a6256a02bfb38e71959a1f3` |
| `specs/control-plane-projections/spec.md` | `40877733e7710a7a6a066e81bcc771c3e0d2c1d757d35b48876f722f197911ba` |
| `specs/overlay-vocabulary/spec.md` | `97ba6dfe27c6ee8625782dd74cf061245f60f465e695ade29197b0996390f208` |
| `specs/skill-template-evaluation/spec.md` | `9bcee96e0cf429658cbb1a1a164c9d835a0aa5378fa33b0319c5c74cf17a152a` |
| `specs/event-schema/spec.md` | `d453188d0d4cd569c1bfb0bcb7875ce494eccb911d0ca968a4fff2ab1fa25380` |
| `specs/invariant-protection/spec.md` | `cda03e0d53d8cca95272d752b23a89fcba2e2de860db1839afe2725b79067926` |
| `specs/vault-correctness/spec.md` | `f6783ede4efcdd1a4a34e33b68b02f3d7fbe015b501b8a41a11adeba2a19b821` |

- Explore-phase cycle artifact: `p-490921be0aac9b69/m3-explore-2026-08-28/explore-report.md`
  — SHA-256 `122c61cd6a3fc1f5615c47983bc9b01776e6e68796553c70f403fa79a8cc349b`
- Vault root: `/home/rubentxu/.sddk-knowledge/p-490921be0aac9b69`
  (`sddk vault validate` at plan time: 44 nodes, 8 backlinks, `errors: 0`)
- Baseline commits, **do not amend**: `fd9c176`, `521b02f`, `62f0e7b`
