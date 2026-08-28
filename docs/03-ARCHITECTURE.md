# Architecture

## Style

**Hexagonal architecture + reactive/event-sourced adapter + Git-native project workspace.**

The domain does not know ActiveGraph, ComfyUI, OpenAI, Gemini, FLUX, Typst, GitHub or browser APIs.

```text
                    AUTHOR / AGENT / CLI
                            |
                      Application API
                            |
        +-------------------+-------------------+
        |                   |                   |
   Narrative Ports      Visual Ports      Publishing Ports
        |                   |                   |
        v                   v                   v
  ActiveGraph Adapter  Comfy/SaaS Adapters   Typst Adapter
        |
        +---- Runtime DB / Event Log
```

## Layers

### Domain
Pure Python/Pydantic-friendly domain concepts:
- Project
- Character / CharacterState
- Location / Object
- Event / Scene / Chapter
- Arc / Promise / Reveal / Fact / Secret
- VisualIdentity / VisualState / VisualSpec
- Asset / Generation
- Page / Panel / Balloon / SFX
- Evaluation / Decision / Approval
- Profile / Capability

### Application
Use cases:
- initialize/adopt project;
- build/rebuild project state;
- register/update canon;
- create/accept candidates;
- validate;
- create visual request;
- route generation;
- approve/reject;
- project read models;
- publish.

### Ports

```python
GraphRuntimePort
EventLogPort
ProjectRepositoryPort
SkillRegistryPort
ImageProviderPort
VisionReviewerPort
AssetStorePort
LayoutRendererPort
ScmPort
ProjectionWriterPort
ClockPort
```

### Adapters

Initial:
- `ActiveGraphRuntimeAdapter`
- `FilesystemProjectRepository`
- `JsonlEventLogAdapter`
- `ComfyUIProvider`
- one SaaS provider
- `FilesystemContentAddressedAssetStore`
- `TypstRenderer`
- `GitCliAdapter`
- `JsonProjectionWriter`

## ActiveGraph boundary

ActiveGraph is chosen for:
- event-sourced reactive model;
- object/relation graph;
- behaviors and relation behaviors;
- policies/approvals;
- replay;
- fork/diff/promote;
- packs;
- SQLite persistence.

Risk: upstream remains relatively young. Therefore:

```text
domain/*          MUST NOT import activegraph
application/*     MUST NOT expose activegraph types
adapters/runtime/activegraph/* owns translation
```

Pin the runtime in `narrative.lock`.

## Three kinds of truth

### Canonical truth
Version-controlled author/project source:
- Markdown;
- YAML/JSON;
- accepted assets;
- decisions;
- human UAT.

### Evidence truth
Auditable, append-oriented evidence:
- JSONL events;
- receipts;
- provenance;
- validator results.

### Derived truth
Rebuildable:
- SQLite runtime;
- graph projections;
- dashboards;
- caches;
- thumbnails;
- reports;
- build outputs.

Generated candidates are **not canonical** until approved.

## Project data flow

```text
Git source
   |
   v
Project Loader
   |
   +----> Domain validation
   |
   v
ActiveGraph adapter
   |
   +----> runtime.sqlite
   +----> JSONL events
   |
   v
Projection builder
   |
   +----> control-plane/*.json
   |
   v
Static Control Plane
```

## Reactive flow example

```text
character.visual.updated
          |
          v
dependency behavior
          |
          v
asset.stale
          |
          v
repair planner
          |
          v
generation.requested
          |
     provider router
          |
     image candidate
          |
    visual QA fanout
          |
       approval
```

## No central mega-orchestrator

The product SHOULD prefer bounded reactive behaviors over a monolithic pipeline.

Use a director/orchestrator only for:
- user-facing goal selection;
- high-level branching;
- synthesis of multiple review lenses.

Packs coordinate through domain objects/events, not direct agent-to-agent calls.

## Architecture constraints

1. Domain-first.
2. Ports before providers.
3. Text source before DB source.
4. Events before opaque mutable state.
5. Candidate before accepted.
6. Human authority before automated canon promotion.
7. Explicit capability routing before provider-specific branching.
8. Incremental invalidation before full regeneration.
9. Static projections before control-plane backend.
10. Architecture emerges only after observed pain.
