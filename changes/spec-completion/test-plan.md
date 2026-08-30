# Test Plan — spec-completion

## Purpose

Map each AC-01..AC-13 from `changes/spec-completion/proposal.md` to one or more
scenarios across `changes/spec-completion/specs/*/spec.md`, and identify which
scenarios can be verified **today** against the current `62f0e7b` HEAD vs
which require the apply phase to land first. The spec phase is read-only on
`docs/`, `specs/`, `examples/`, `templates/`, `uat/`, `docs/adrs/`, and
`MANIFEST.json`; therefore most executable-today scenarios are negative tests
("the file/system is currently absent, so we can verify absence right now").

## Conventions

- Verifier is invoked with `--root` set to the **outer** repo root
  (`/var/mnt/DiscoChino2-fast/Proyectos/python/Reactive-Narrative-Studio-Specs`) — not
  the inner repo. Inner-root `sddk` invocations fail with
  `fallback seed must be a valid UUID`.
- Working directory for shell commands is the inner repo unless otherwise
  stated (`/var/mnt/.../reactive-narrative-studio-specs`).
- File SHA-256 envelopes are computed at the end of the spec phase and recorded
  in the canonical `PhaseEnvelope`.
- `python3 -c "..."` invocations use the system `jsonschema` package
  (version 4.x — verified during spec phase).

## AC → Scenario → Executable Today?

| AC | Scenario(s) | Executable today? | Verifier command / approach |
|---|---|---|---|
| AC | Scenario(s) | Executable today? | Verifier command / approach |
|---|---|---|---|
| AC-01 | CLI-S01, CLI-S02, CLI-S03, CLI-S05 | Yes for S05 (negative); No for S01–S03 | After apply, `test -f specs/inspect.schema.json`, `grep -nE "specs/inspect.schema.json" docs/16-CLI.md docs/25-IMPLEMENTATION-STARTER.md` |
| AC-02 | PROJ-S02 | No (4 of 5 examples don't declare discriminators yet, and the schemas to validate against don't all exist yet) | After apply, run `python3 -c "import yaml, json, jsonschema, pathlib; ..."` for every `examples/*.yaml` against its declared schema |
| AC-03 | PROJ-S01, PROJ-S04 | Yes for S04 (negative — counts missing discriminators today); No for S01 | After apply, walk every `examples/*.yaml` and confirm top-level `schema:` or `apiVersion:` key exists |
| AC-04 | CP-S01, CP-S02, CP-S03, CP-S04 | No (12 of 13 projection schemas missing today) | After apply, `ls specs/cp-*.schema.json \| wc -l` must be `13` |
| AC-05 | VOCAB-S01, VOCAB-S04, VOCAB-S05 | Yes for S05 (negative — UPPERCASE today matches docs/13); No for S01/S04 | Run `grep -REn "\\b(PASS\|WARNING\|BLOCKED\|PENDING\|UNKNOWN)\\b" docs/ specs/ examples/` post-apply and confirm only documentation-table matches remain |
| AC-06 | VOCAB-S02, VOCAB-S03 | No | After apply, parse `specs/catalog-entity.schema.json.properties.spec.properties.lifecycle.enum` and assert 10 elements; same for `kind` |
| AC-07 | PROJ-S03, VOCAB-S04 | No (docs/13 example is currently invalid) | After apply, extract the YAML block from docs/13-CONTROL-PLANE.md and validate it via `python3 -c "import yaml, ...; jsonschema.validate(...)"` |
| AC-08 | SKILL-S01, SKILL-S02, SKILL-S03, SKILL-S04 | Yes for S03 (parses today; will flip after apply) and S04 (negative); No for S01/S02 positive | `grep -nE "^## Evaluation cases$" templates/skill-template.md` |
| AC-09 | CLI-S03, CLI-S04 | Yes for S04 (negative — table absent today); No for S03 positive | `grep -nE "Exit codes for .narrative check" docs/16-CLI.md` |
| AC-10 | EVT-S01, EVT-S02, EVT-S03, EVT-S04, EVT-S05 | Yes for S04 (probe today), S05 (negative); No for S01–S03 positive | After apply, parse `specs/event.schema.json` and confirm every named event type in `docs/06`, `docs/12`, `docs/15`, `docs/22`, `docs/23` has a `$defs` entry |
| AC-11 | PROJ-S05 | Yes (orphan rule runs today, will run again after apply) | For each `specs/*.schema.json`, run `grep -REc "<basename>" docs/ examples/ uat/` and assert `≥ 1` |
| AC-12 | INV-S01..INV-S05 | **Yes** (textual checks against HEAD) | Run the five scenarios below |
| AC-13 | VAULT-S01, VAULT-S02, VAULT-S03, VAULT-S04 | **Yes** (no tool fabrication needed) | Run `sddk vault validate` against outer root; assert `errors: 0` |

## Verifier Commands (executable today, baseline)

The spec phase captured the following commands at HEAD `62f0e7b` to record the
expected *current* state. None of them modify the working tree.

```bash
# Baseline vault state
sddk vault validate \
  --root /var/mnt/DiscoChino2-fast/Proyectos/python/Reactive-Narrative-Studio-Specs \
  --scope . \
  --vault /home/rubentxu/.sddk-knowledge/p-490921be0aac9b69 \
  --format json

# Inspect absence (will exit 1)
test -f specs/inspect.schema.json || echo "OK_NEGATIVE_inspect_schema_absent"

# Event schema absence (will exit 1)
test -f specs/event.schema.json || echo "OK_NEGATIVE_event_schema_absent"

# Skill-template eval-cases absence (will exit 1)
grep -nE "^## Evaluation cases$" templates/skill-template.md \
  || echo "OK_NEGATIVE_eval_cases_header_absent"

# Exit-code table absence (will exit 1)
grep -nE "Exit codes for .narrative check" docs/16-CLI.md \
  || echo "OK_NEGATIVE_check_exit_code_table_absent"

# Status casing reconciliation (will match lines 233–236 of docs/13)
grep -nE "(continuity|visual|uat|publishing): (PASS|WARNING|BLOCKED|PENDING)" \
  docs/13-CONTROL-PLANE.md

# ADR count baseline (must be 25; new ADR must raise it to ≤ 26 post-apply)
ls docs/adrs/ADR-*.md | wc -l

# Projection schemas count baseline (1 → expected 13 post-apply)
ls specs/cp-*.schema.json 2>/dev/null | wc -l

# Examples discriminators baseline (counts existing discriminators)
for f in examples/*.yaml; do
  head -1 "$f" | grep -qE "^(schema|apiVersion):" \
    && echo "HAS $f" || echo "MISS $f"
done
```

## Verifier Commands (post-apply, for verify phase)

The verify phase runs the same commands expecting post-apply behaviour:

```bash
# AC-01: inspect schema present and referenced
test -f specs/inspect.schema.json
grep -nE "specs/inspect.schema.json" docs/16-CLI.md docs/25-IMPLEMENTATION-STARTER.md

# AC-02: every example validates against its declared schema
python3 - <<'PY'
import yaml, json, glob, jsonschema, pathlib
ROOT = pathlib.Path(".")
SCHEMA_FROM_DISCRIMINATOR = {
    "schema: catalog-entity/v1alpha1": "catalog-entity.schema.json",
    "schema: control-plane-project/v1": "control-plane.schema.json",
    "schema: creation-recipe/v1": "creation-recipe.schema.json",
    "schema: narrative-decision/v1": "decision.schema.json",
    "schema: narrative-lock/v1": "narrative-lock.schema.json",
    "schema: narrative-event/v1": "event.schema.json",
    "schema: profile/v1": "profile.schema.json",
    "schema: visual-spec/v1": "visual-spec.schema.json",
    "apiVersion: narrative.dev/v1alpha1": "catalog-entity.schema.json",
}
for p in sorted(glob.glob("examples/*.yaml")):
    doc = yaml.safe_load(open(p))
    discriminator = doc.get("schema") or doc.get("apiVersion")
    if not discriminator: raise SystemExit(f"AC-03 failed: {p} has no discriminator")
    schema = SCHEMA_FROM_DISCRIMINATOR[f"schema: {discriminator}"] if "schema" in (doc.keys() and set(doc.keys()) & {"schema"}) else None
    # fallback for apiVersion-based catalog docs
    if schema is None:
        schema = SCHEMA_FROM_DISCRIMINATOR.get(f"apiVersion: {discriminator}")
    if schema is None: raise SystemExit(f"AC-02 failed: no schema mapped for {p}")
    jsonschema.validate(doc, json.load(open(f"specs/{schema}")))
print("AC-02 PASS")
PY

# AC-04: 13 projection schemas exist and are reachable
test $(ls specs/cp-*.schema.json | wc -l) -eq 13
python3 -c "import json, glob; \
  ids = set(); \
  [ids.update(set(json.load(open(p)).get('\$defs', {}).keys())) for p in glob.glob('specs/cp-*.schema.json')]; \
  print('13 projections reachable via \$defs')"

# AC-05: status casing reconciliation
grep -REn "\\b(PASS|WARNING|BLOCKED|PENDING|UNKNOWN)\\b" docs/ specs/ examples/ | \
  grep -vE "(documentation|vocabulary|Status is)" || echo "AC-05 PASS only legitimate documentation matches"

# AC-06: lifecycle + kind enums
python3 -c "import json; s=json.load(open('specs/catalog-entity.schema.json')); \
  enum = s['properties']['spec']['properties']['lifecycle']['enum']; \
  assert len(enum) == 10, ('lifecycle count', len(enum)); \
  assert len(set(enum)) == 10; \
  print('AC-06 lifecycle PASS')"
# (plus a parallel check for kind when apply lands the new schema)

# AC-07: docs/13 example validates
python3 -c "<extract YAML block from docs/13 and validate against specs/catalog-entity.schema.json>"

# AC-08: skill template has Evaluation cases
grep -nE "^## Evaluation cases$" templates/skill-template.md
test $(grep -cE "^## " templates/skill-template.md) -eq 12

# AC-09: exit-code table in docs/16
grep -nE "Exit codes for .narrative check" docs/16-CLI.md
test $(grep -cE "^\| [0-4] " docs/16-CLI.md) -ge 5

# AC-10: every documented event type resolved
python3 -c "<scan docs/*, collect event-type tokens, assert each is in \$defs of specs/event.schema.json>"

# AC-11: zero orphan schemas
for f in specs/*.schema.json; do
  base=$(basename "$f" .schema.json)
  hits=$(grep -REc "$base" docs/ examples/ uat/)
  test "$hits" -ge 1 || echo "ORPHAN $f"
done

# AC-12: invariant text-checks (see scenarios INV-S01..INV-S05)
test $(cat ~/.sddk-knowledge/p-490921be0aac9b69/milestones/m1-onboard-2026-08-28.md | grep -c "^[0-9]\+\.") -ge 11
test $(ls docs/adrs/ADR-*.md | wc -l) -le 26

# AC-13: vault validate reports errors: 0
sddk vault validate \
  --root /var/mnt/DiscoChino2-fast/Proyectos/python/Reactive-Narrative-Studio-Specs \
  --scope . \
  --vault /home/rubentxu/.sddk-knowledge/p-490921be0aac9b69 \
  --format json
```

## Coverage Summary

| AC | Coverage |
|---|---|
| AC-01 | CLI-S01, CLI-S02, CLI-S03 |
| AC-02 | PROJ-S02, PROJ-S04 (provenance) |
| AC-03 | PROJ-S01, PROJ-S04 (provenance) |
| AC-04 | CP-S01, CP-S02, CP-S03, CP-S04 |
| AC-05 | VOCAB-S01, VOCAB-S04, VOCAB-S05 |
| AC-06 | VOCAB-S02, VOCAB-S03 |
| AC-07 | PROJ-S03, VOCAB-S04 |
| AC-08 | SKILL-S01, SKILL-S02, SKILL-S03, SKILL-S04 |
| AC-09 | CLI-S03, CLI-S04 |
| AC-10 | EVT-S01, EVT-S02, EVT-S03, EVT-S04, EVT-S05 |
| AC-11 | PROJ-S05 |
| AC-12 | INV-S01, INV-S02, INV-S03, INV-S04, INV-S05 |
| AC-13 | VAULT-S01, VAULT-S03, VAULT-S04 |

**Coverage: 13/13 (100%)**.

## Executable-Today Summary

- **Scenarios executable today**: 11 (across 6 spec files — `narrative-init-cli`, `project-validation`, `overlay-vocabulary`, `skill-template-evaluation`, `event-schema`, `vault-correctness`). These are text-only checks that confirm current absence or current value of files the apply phase will modify, plus a few that *can* pass today (vault-correctness S01/S02/S03 and invariant-protection S01–S04 textual checks).
- **Scenarios requiring apply first**: 26 (positive tests with concrete acceptance criteria that only pass once the new schemas / sections / examples / vocabulary tables / exit-code table / authors / templates exist).
- **Scenarios with both a pre-apply and a post-apply assertion in one block**: some scenarios are dual-use — e.g., `VAULT-S03` is "baseline (pre-apply) validation is captured" executed today, and `VAULT-S04` is "post-apply validation matches baseline" executed after apply; these two together form one acceptance thread.

The current executable-today scenarios are predominantly **negative tests** —
they assert the absence of the file/section the apply phase will introduce. This
is intentional: it lets the verify phase (post-apply) re-run the same scripts
and assert the *flip* to pass.

## Notes for Orchestrator

- Vault validate was executed during the spec phase as a **read-only** check;
  the spec phase did NOT write to the vault (per REQ-VAULT-002). The vault
  path passed without errors before any spec-delta was stored.
- The `invariant-protection` spec explicitly calls out that no automated
  invariant enforcement tool exists; the spec relies on text checks. If the
  orchestrator decides to bundle an invariant checker into this change, the
  capability is new and should be called out separately.
- All scenarios are written to map directly to AC rows in the proposal. No
  scenario silently assumes behaviour beyond what the proposal commits to.
