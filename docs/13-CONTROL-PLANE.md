# Control Plane — Backstage-Inspired Refinement

## Definition

The Control Plane is:

> A serverless, local-first, extensible creative production portal that
> catalogs projects and capabilities, aggregates multiple perspectives around
> narrative entities, and provides search, documentation, graph exploration,
> creation recipes and a current-work workbench over stable projections.

It is not merely a dashboard.

## Why Backstage is relevant

Backstage demonstrates several durable portal patterns:
- catalog entities;
- entity pages;
- frontend plugins/extensions;
- software templates;
- docs-as-code;
- extensible search;
- customizable home widgets.

We reuse these concepts in a smaller browser-only architecture.

## Core subsystems

```text
ControlPlaneCore
├── AppShell
├── Catalog
├── EntityPages
├── ExtensionRegistry
├── Search
├── Docs
├── Home
├── Workbench
├── ProjectLoader
├── GraphViews
├── RecipeWizard
└── StudioSettings
```

## Narrative Catalog

Catalog responsibilities:
- what projects/capabilities exist;
- high-level lifecycle/status;
- relationships between macro entities;
- source annotations;
- navigation entry points.

It does NOT own:
- prose;
- canon;
- runtime state;
- binary assets.

## Entity envelope

Recommended:

```yaml
apiVersion: narrative.dev/v1alpha1
kind: NarrativeProject

metadata:
  name: la-biblioteca-secreta
  title: La Biblioteca Secreta
  tags:
    - mystery
    - middle-grade
  annotations:
    narrative.dev/source-path: .
    narrative.dev/git-revision: abc123

spec:
  language: es-ES
  lifecycle: visual-production
  format: illustrated-novel

status:
  checks:
    continuity: pass
    visual: warning
    uat: pending

relations:
  - type: usesProfile
    targetRef: Profile:profile-middle-grade-10-11
```

## Entity pages

A page is an aggregation point.

### Project
- Overview
- Story
- Manuscript
- Visual
- UAT
- Builds
- Docs
- Graph
- History

### Character
- Overview
- Arc
- Relationships
- Timeline
- Knowledge
- Scenes
- Visual DNA
- Illustrations
- Continuity
- UAT

### Asset
- Preview
- Provenance
- Dependencies
- QA
- Usage
- History

Each entity page is backed by one or more projection schemas defined in
`specs/cp-*.schema.json` (project, chapters, characters, assets, visual-quality,
uat, approvals, history, scm, costs).

## Studio Home

Cross-project.

Widgets:
- Continue Working
- Recent Projects
- Favorites
- Pending Approvals
- Blocking Findings
- Recent Activity
- Generation Cost
- Stale Assets

Widget layout is user-local metadata, not project canon.

## Workbench

Project-local current production focus.

```text
Current Chapter
Current Scene
Current Illustration
Active Fork
Pending Approval
Next Action
Blocking Findings
```

The Workbench is deliberately separate from Home.

## Narrative Search

Features contribute normalized search documents.

Search types:
- project;
- character;
- chapter/scene;
- asset;
- decision;
- UAT;
- docs;
- capability.

Everything operates locally in V1.

## Narrative Docs

Render Git-controlled Markdown.

Enhancements may include:
- entity-link resolution;
- backlink panel;
- asset preview;
- continuity findings;
- source location;
- Git revision.

MDX execution is prohibited for project-authored content.

## Graph exploration

Provide lenses:
- story;
- character;
- mystery;
- visual dependencies;
- production;
- publishing.

Do not render an undifferentiated graph by default.

## Creation Recipes

Recipes scaffold new projects and select profiles/packs.

They do NOT become a generic orchestration DSL.

One recipe drives:
- CLI interactive creation;
- frontend wizard.

## Lifecycle and status

Lifecycle example:

```text
idea
development
drafting
editorial
visual-production
proof
uat
ready
published
archived
```

Status is orthogonal:

```text
continuity: pass
visual: warning
uat: pending
publishing: blocked
```

## M10 scope

Implement:
- shell;
- directory/snapshot project loader;
- CatalogEntity;
- Project catalog;
- Project/Character pages;
- internal extension registry;
- Home;
- Workbench;
- local search;
- safe docs;
- graph lenses;
- basic recipe wizard.

Defer:
- write operations;
- external plugins;
- remote catalog;
- remote search;
- centralized auth.
