# Domain Model

## Core ontology

The initial ontology MUST remain deliberately small.

### Narrative
- `NarrativeProject`
- `StoryCanon`
- `Character`
- `CharacterState`
- `Relationship`
- `Location`
- `NarrativeObject`
- `Event`
- `Scene`
- `Chapter`
- `Arc`
- `Fact`
- `Secret`
- `Promise`
- `Reveal`
- `Clue`
- `Rule`

### Visual
- `VisualIdentity`
- `VisualState`
- `StyleBible`
- `LocationVisualDNA`
- `PropVisualDNA`
- `VisualSpec`
- `VisualEvidenceContract`
- `Asset`
- `AssetCandidate`
- `GenerationRequest`
- `GenerationResult`
- `QualityResult`

### Sequential art
- `SequentialWork`
- `Page`
- `Panel`
- `Shot`
- `Dialogue`
- `Caption`
- `Balloon`
- `SoundEffect`
- `LetteringLayer`

### Workflow/governance
- `Candidate`
- `Decision`
- `Approval`
- `Evaluation`
- `Finding`
- `Profile`
- `Capability`
- `Receipt`

## Relation vocabulary

Examples:

```text
APPEARS_IN
LOCATED_AT
OWNS
KNOWS
LEARNS_IN
REVEALS
CAUSES
BEFORE
AFTER
DEPENDS_ON
ILLUSTRATED_BY
VERSION_OF
SETUP_FOR
RESOLVES
CONTRADICTS
SUPPORTS
USES
DESTROYS
WEARS
```

Relations MUST remain domain vocabulary, not provider vocabulary.

## Temporal state

Do not mutate a character into an untraceable final blob.

A query must be able to answer:

```text
state(character="nora", at="scene-024")
```

Representative state:

```yaml
character: nora
at_scene: scene-024
location: abandoned-library
knows:
  - secret-key-origin
owns:
  - lantern
lost:
  - silver-key
emotional:
  trust_irene: 0.35
  fear_library: 0.72
```

## Canon levels

- `CANON`
- `SOFT_CANON`
- `DRAFT`
- `RETIRED`

Runtime behaviors MUST NOT silently promote `DRAFT` to `CANON`.

## Narrative constraints

Constraints are facts the deterministic validator can reason about.

Examples:
- `alive(character, range)`
- `owns(character, object, range)`
- `knows(character, fact, after_event)`
- `object_state(object, destroyed)`
- `magic.max_distance = 100m`

Genre packs MAY add vocabulary, but the core engine SHOULD reason using generic:
- entity;
- state;
- relation;
- event;
- constraint.

## Story Canon vs Presentation

A key design separation:

```text
              STORY CANON
                  |
       +----------+----------+
       |          |          |
     Prose      Comic      Manga
```

Events, characters, facts and arcs can be preserved while presentation-specific adaptation changes scene granularity, dialogue density, panelization and exposition.

This is not a promise of one-click adaptation. It is a model that avoids duplicating the entire narrative universe per medium.
