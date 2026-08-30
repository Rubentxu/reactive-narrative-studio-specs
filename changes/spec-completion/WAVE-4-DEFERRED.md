# Wave 4 Deferred — spec-completion-ir

## Header

Wave 4 of the `spec-completion` change is **deferred** to a future change
`spec-completion-ir` per the tasks-phase D-01 decision. This file is
persisted as apply-progress evidence and will be consumed by the next
`sddk-apply` invocation for `spec-completion-ir`.

## Rationale

The four-wave plan requires 9 review blocks; the budget is 6. Waves 1–3
contribute 5 blocks and fit the budget. Wave 4 alone requires 4 blocks and
would push the total to 9, exceeding the budget.

The D-01 decision (tasks-phase) resolved this by splitting: land waves 1–3
as `spec-completion` (this change), lift wave 4 verbatim into a follow-up
change `spec-completion-ir`.

Lower risk to ship the stable, vocabulary-normalizing waves 1–3 first, then
handle the larger IR/event/provider/publishing block as a separate review
cycle.

## Deferred Files

The following files are **not** touched by this apply and remain in the
original state at HEAD `62f0e7b`:

- `specs/narrative-ir.schema.json`
- `specs/visual-ir.schema.json`
- `specs/sequential-ir.schema.json`
- `specs/event.schema.json`
- `specs/provider-capability.schema.json`
- `specs/publishing-receipt.schema.json`
- `specs/profile.schema.json`
- `specs/visual-spec.schema.json`
- `control-plane/workflows/comfyui/*.json` (directory does not exist yet)
- `templates/skill-template.md` (do NOT add `## Evaluation cases` in this cycle)
- `examples/middle-grade-profile.yaml` (do NOT add `schema: profile/v1` discriminator in this cycle)
- `examples/visual-spec.yaml` (do NOT add `schema: visual-spec/v1` discriminator in this cycle)
- `uat/UAT-M0-01.md` (do NOT add inspect.schema.json citation in this cycle)
- `uat/UAT-M1-01.md` (do NOT add inspect.schema.json citation in this cycle)

## Deferred ACs

The following acceptance criteria are **not** satisfied by this apply and
must be closed by `spec-completion-ir`:

- AC-02 — IR schemas (narrative-ir, visual-ir, sequential-ir)
- AC-03 — example discriminators (middle-grade-profile.yaml, visual-spec.yaml)
- AC-08 — skill-template `## Evaluation cases` section
- AC-10 — event.schema.json (8 event types)
- AC-11 — orphan-schema gate (full sweep)

## Wave 4 Plan

Open a new cycle with name `m4-spec-completion-ir-<date>` and re-use the
wave 4 section of `changes/spec-completion/tasks.md` as input.

The wave 4 commit subject will be:

```
spec(spec-completion/wave-4): IR/event/provider/publishing schemas
```

Cross-wave dependencies:
- Wave 4 depends on wave 1 (vocabulary: lifecycle + kind enums)
- Wave 4 depends on wave 2 (inspect.schema.json cited by uat/UAT-M0-01.md)

Both dependencies are satisfied by this apply (waves 1 and 2 landed).

## Verification for spec-completion-ir

When applying wave 4 in the future cycle, run the wave 4 verification
commands from `changes/spec-completion/tasks.md` §3.4:

```bash
for f in examples/*.yaml; do head -1 "$f" | grep -qE "^(schema|apiVersion):" \
  || { echo "MISS $f"; exit 1; }; done; echo "AC-03 PASS"
python3 -c "import yaml,glob;[yaml.safe_load(open(p)) for p in \
  glob.glob('examples/*.yaml')+glob.glob('templates/*.yaml')];print('YAML sweep PASS')"
grep -nE "^## Evaluation cases$" templates/skill-template.md \
  && test "$(grep -cE '^## ' templates/skill-template.md)" -eq 12 && echo "AC-08 PASS"
python3 -c "import json;s=json.load(open('specs/event.schema.json'));\
  d=set(s.get('\$defs',{}));req={'run.started','run.completed','cost.recorded',\
  'candidate.accepted','candidate.rejected','asset.generated',\
  'approval.granted','publish.completed'};assert not req-d,req-d;print('AC-10 PASS')"
test "$(ls control-plane/workflows/comfyui/*.json | wc -l)" -eq 9 \
  && python3 -c "import json,glob;[json.load(open(p)) for p in \
  glob.glob('control-plane/workflows/comfyui/*.json')];print('fixtures PASS')"
```

Cross-cutting (run once after wave 4):

```bash
test "$(ls docs/adrs/ADR-*.md | wc -l)" -le 26 && echo "AC-12 ADR cap PASS"
sddk vault validate --root <root> --scope . \
  --vault /home/rubentxu/.sddk-knowledge/p-490921be0aac9b69 --format json
```
