# Visual IR

## Goal

Treat illustration as a structured production domain, not `prompt -> image`.

## Character Visual DNA

```yaml
id: visual-nora-v1
character: nora

immutable:
  apparent_age: 11
  hair:
    color: dark-brown
    length: shoulder
    texture: slightly-wavy
  eyes: green
  face:
    freckles: true

signature:
  - round-red-glasses
  - asymmetric-fringe

mutable:
  outfit: school-v2
  injuries: none

references:
  front: asset:sha256:...
  side: asset:sha256:...
  expressions: asset:sha256:...
```

## Location DNA

Stores stable spatial/visual anchors:
- entrance;
- window/door placement;
- signature props;
- palette;
- architectural cues.

## Prop DNA

For narratively important recurring objects:
- shape;
- material;
- dimensions/proportions;
- markings;
- current state.

## Style Bible

Describe properties instead of “in the style of living artist X”.

Dimensions:
- medium;
- line quality;
- palette;
- texture;
- lighting;
- camera tendencies;
- composition;
- detail;
- prohibited traits.

## Scene Visual Contract

```yaml
scene: scene-024

required_visible:
  - nora
  - irene
  - silver-key
  - lantern

relations:
  - subject: nora
    action: holds
    object: silver-key

composition:
  shot: medium-wide
  emphasis: silver-key

continuity:
  nora.visual_version: adventure-v2
  irene.visual_version: library-v1
```

## Candidate lifecycle

```text
requested
 -> generated
 -> technical_qa
 -> semantic_qa
 -> human_review
 -> accepted | rejected | repair_requested
```

## Visual unit tests

Invariants can be represented:

```yaml
character: nora
requires:
  glasses: true
  hair_color: dark-brown
relative_height:
  shorter_than:
    - irene
```

A VLM result is heuristic evidence, not mathematical proof.

## Layer model

Comic/complex illustration MAY split:
- background;
- character layers;
- effects;
- lettering.

This enables minimal regeneration.

## Cross-references

The `asset:sha256:[a-f0-9]{64}` notation is enforced by `specs/visual-ir.schema.json` (see `$defs.Reference.properties.target.pattern`) and `specs/visual-spec.schema.json` (see `properties.continuity.properties.characterRefs.items.pattern` and `properties.continuity.properties.locationRefs.items.pattern`).
