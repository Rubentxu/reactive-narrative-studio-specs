# Testing and Golden Dataset

## Test pyramid

### Unit
- domain rules;
- schemas;
- dependency graph;
- profile merge;
- preflight calculations.

### Contract
- ActiveGraph adapter;
- image providers;
- ComfyUI workflow adapter;
- Typst adapter;
- projection schemas.

### Property-based
Use Hypothesis for:
- profile composition;
- IDs;
- state transition invariants;
- timeline ordering;
- dependency invalidation.

### Integration
- project load -> runtime -> projection;
- visual request -> provider fixture -> QA;
- build -> preflight.

### UAT
Human-visible milestone acceptance.

## Golden corpus

```text
golden/
  short-story/
  middle-grade/
  illustrated-book/
  mystery/
  fantasy/
  graphic-novel/
  manga/
```

## Deliberately broken cases

- dead-character-reappears;
- object-used-after-destruction;
- knowledge-before-reveal;
- impossible-location;
- unresolved-promise;
- wrong-outfit;
- missing-glasses;
- missing-prop;
- stale-asset;
- low-resolution-image;
- missing-font;
- incorrect-reading-order;
- overlapping-balloon.

## Recorded provider fixtures

Provider adapters MUST support fixtures so CI does not require paid APIs.

A recorded fixture must include:
- normalized request;
- normalized response metadata;
- output asset/hash;
- provider identity;
- schema version.

## Skill evaluations

Skills SHOULD include evals checking:
- correct artifact created;
- required fields;
- correct skill selection;
- failure-mode behavior.

Do not score creative quality with unit tests.
