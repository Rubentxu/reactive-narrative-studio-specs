# Narrative IR

## Purpose

Narrative IR is the structured subset of a work required for:
- continuity;
- dependency analysis;
- reactive behavior;
- adaptation;
- validation;
- projections.

It MUST NOT replace prose.

## Canonical prose remains prose

Chapters and scenes are primarily Markdown. Structured frontmatter/sidecar files carry machine-relevant semantics.

## Core structures

### Scene

```yaml
id: scene-024
chapter: chapter-07
pov: nora
location: abandoned-library
time:
  after: event-023
characters:
  - nora
  - irene
goals:
  nora: discover-key-origin
facts_revealed:
  - secret-key-origin
objects_used:
  - lantern
outcomes:
  - nora_learns_secret
```

### Promise

```yaml
id: promise-key-origin
setup_scene: scene-004
required_resolution: true
resolution_deadline: final-act
resolved_by: scene-024
```

### Fact

```yaml
id: fact-key-forged-by-librarian
visibility: secret
known_by:
  librarian: from_start
  nora: after:scene-024
```

## Dependency model

A downstream artifact can depend on:
- a scene;
- character state;
- visual identity;
- location;
- style;
- publishing profile.

This powers incremental staleness.

## Genre extensions

### Mystery
Add:
- clue;
- suspect;
- red herring;
- reveal;
- knowledge availability.

### Fantasy
Add:
- rule;
- capability;
- cost;
- limitation.

### Science fiction
Add:
- technology capability;
- limitation;
- causal constraint.

Extensions SHOULD map back to generic fact/state/event/constraint concepts.

## Semantic impact

A change should be analyzable:

```text
change: character:nora.age 11 -> 12

impact:
  narrative:
    scenes: 32
  visual:
    assets: 18
  publishing:
    cover: 1
```

Do not promise perfect impact analysis in V1. Start with explicit dependency relations and evolve.
