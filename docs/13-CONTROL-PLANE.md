# Static Control Plane

## Goal

Provide a rich project observability interface without introducing a server-side product architecture.

## V1 invariant

**The Control Plane is a static read-only SPA/PWA consuming stable projections.**

It does not connect directly to ActiveGraph SQLite.

## Projection contract

Runtime/application writes:

```text
.narrative/projections/
  project.json
  progress.json
  graph.json
  workflow.json
  chapters.json
  characters.json
  assets.json
  visual-quality.json
  uat.json
  approvals.json
  costs.json
  history.json
  scm.json
```

These files are rebuildable.

## Why not read SQLite

Direct SQLite coupling would expose runtime internals and make the UI dependent on ActiveGraph schema evolution.

The stable contract is:

```text
Runtime -> Projection Schema -> Static UI
```

## Modes

### Directory mode
Use browser File System Access API where supported, after explicit user selection.

### Snapshot mode
Open:
- ZIP;
- exported projection folder;
- static embedded snapshot.

### Standalone dashboard
`narrative dashboard build` MAY create an immutable static snapshot artifact.

## Initial pages

1. Overview
2. Story/Canon
3. Manuscript
4. Characters
5. World
6. Timeline/Arcs
7. Visual production
8. Storyboard
9. Graph
10. Workflow
11. Quality
12. Reader UAT
13. Approvals
14. Publishing
15. History
16. SCM
17. Costs/resources

## Moldable views

The same graph SHOULD support multiple lenses:
- Story view;
- Character view;
- Mystery view;
- Visual dependency view;
- Publishing view.

Avoid one universal hairball graph.

## Progress

Progress MUST be derived from explicit artifacts/gates:

```text
chapters approved / chapters planned
assets approved / assets required
UAT rounds completed / required
```

Avoid opaque AI-generated `health_score=84`.

Use dimensions:
- PASS;
- WARNING;
- BLOCKED;
- PENDING.

## Future V2 write capabilities

DEFER:
- approve;
- reject;
- comment.

Possible implementation: write decision files into project directory with explicit browser permission.

## Future V3 command queue

DEFER:
- request regeneration;
- request agent review;
- request build.

Could be filesystem commands consumed by a local runner, still without a permanent backend.
