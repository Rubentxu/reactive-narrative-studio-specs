# UAT-M0-01 — Specification coherence

## Given
The specification pack.

## When
Schemas, ADRs and roadmap terminology are validated.

## Then
- every roadmap core concept exists in glossary/domain docs;
- ADR decisions do not contradict project invariants;
- machine-readable schema examples validate.

## Pass
0 blocking inconsistencies.

## Machine-check step

Run the JSON-Schema validator against each example file using its declared
discriminator:

```bash
for f in examples/*.yaml; do
  schema=$(head -2 "$f" | awk '/^schema:/ {print $2}')
  # Resolve $schema id from specs/$(basename $schema .v1).schema.json
  sddk-json-schema-validate "$f" "specs/${schema%/*}.schema.json"
done
```

The canonical contract for `narrative inspect --json` is
[`specs/inspect.schema.json`](../specs/inspect.schema.json). The canonical
event-log contract for `.narrative/events/YYYY-MM.jsonl` is
[`specs/event.schema.json`](../specs/event.schema.json).
