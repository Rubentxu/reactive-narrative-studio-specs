# Vision

## Problem

Current AI book-generation workflows are fragmented. One tool writes prose, another generates images, another lays out a PDF, and continuity lives mostly in prompts or human memory. This causes:

- character drift;
- contradictory canon;
- lost creative decisions;
- expensive full-page regeneration;
- vendor lock-in;
- opaque agent workflows;
- weak reproducibility;
- difficulty revisiting a project months later;
- poor traceability of AI-generated assets;
- no meaningful acceptance gates.

## Vision

Build a **Reactive Narrative Studio** where a creative work behaves like a maintainable project:

- the **story canon** is explicit and versioned;
- agents use reusable **Agent Skills**;
- domain packs react to graph events;
- deterministic validators protect invariants;
- visual generation is local/SaaS and provider-neutral;
- human approval governs creative canon;
- every project is portable as a Git repository;
- a static Control Plane shows progress, health, resources, costs, graph state and pending decisions;
- the same canonical story can later be projected into prose, illustrated fiction, graphic novel, manga or webtoon forms.

## Product philosophy

### Author-first, not generator-first

The system MUST maximize human creative agency. AI proposes, explores, drafts, critiques and renders. Humans decide what becomes canonical.

### Narrative compiler metaphor

Treat the project as source:

```text
story canon + manuscript + visual bible + storyboard
                        |
                        v
               validation + graph
                        |
                        v
           PDF / EPUB / CBZ / snapshots
```

The compiler metaphor is useful for:

- dependency tracking;
- stale-asset detection;
- incremental rebuild;
- reproducible publication;
- structured errors.

It MUST NOT imply that literature can be reduced to numerical correctness.

### Living graph metaphor

The graph is a live projection of:

- characters;
- places;
- objects;
- facts;
- secrets;
- scenes;
- arcs;
- promises;
- visual assets;
- editorial evaluations;
- UAT feedback;
- dependencies.

Reactive behavior allows a change in canon to invalidate only the affected downstream artifacts.

### Local-first by default

A project MUST remain usable without a SaaS control plane. Providers MAY be remote, but the workspace, source, evidence and project history remain local and portable.

## Initial focus

The product is general-purpose, but the reference profiles and first UAT corpus focus on:

- Spanish (`es-ES`);
- ages 8–12;
- fantasy, mystery, adventure and humor;
- illustrated novels / chapter books;
- optional darker themes handled through intensity profiles rather than simplistic blacklists.

The platform MUST avoid equating “children’s” with “simplistic”.

## Long-term possibilities

DEFER until the core proves itself:

- series-wide canon;
- collaborative multi-author editing;
- audio drama adaptation;
- interactive fiction;
- animated storyboards;
- translation/localization packs;
- plugin marketplace;
- remote team control plane;
- semantic asset search;
- cross-book knowledge graph.
