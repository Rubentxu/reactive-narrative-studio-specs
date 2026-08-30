# Narrative Catalog

## Purpose

The Narrative Catalog answers:

> What creative projects and production capabilities exist, what state are
> they in, and how do I navigate to the authoritative information?

It is inspired by Backstage Software Catalog semantics, but is a **read-model
projection**.

## Catalog vs Narrative Graph

Do not confuse:

```text
Narrative Catalog
  macro entities / portal navigation

Narrative Graph
  detailed story/world/runtime semantics
```

## Initial entity kinds

### V1/M10
- `NarrativeProject`
- `Character`
- `Chapter`
- `Build`
- `UATRun`

### Capability catalog, M10.2
- `Skill`
- `Pack`
- `Profile`
- `Recipe`
- `Workflow`
- `Provider`

### Future
- `Universe`
- `Series`
- `Edition`

## Entity envelope

```yaml
apiVersion: narrative.dev/v1alpha1
kind: Character

metadata:
  namespace: la-biblioteca-secreta
  name: nora
  title: Nora
  tags:
    - protagonist
  annotations:
    narrative.dev/source-path: canon/characters/nora.yaml
    narrative.dev/graph-ref: character:nora

spec:
  projectRef: NarrativeProject:la-biblioteca-secreta

status:
  canon: CANON
  checks:
    continuity: pass

relations:
  - type: partOf
    targetRef: NarrativeProject:la-biblioteca-secreta
```

## Metadata

Stable generic metadata:
- namespace;
- name;
- title;
- description;
- tags;
- labels;
- annotations.

Do not place huge domain payloads in metadata.

## Annotations

Annotations connect the portal entity to authoritative data.

Recommended namespace:
`narrative.dev/*`

Examples:
- `narrative.dev/source-path`
- `narrative.dev/git-revision`
- `narrative.dev/graph-ref`
- `narrative.dev/asset-ref`
- `narrative.dev/workflow-hash`

## Relations

Catalog relations are intentionally high-level:

```text
partOf
contains
usesProfile
usesPack
usesSkill
producedBy
derivedFrom
latestBuild
latestUAT
```

Detailed story semantics stay in the Narrative Graph.

## Entity provider input

Project projection builders SHOULD produce catalog entities directly.

The frontend should not infer complex catalog semantics from arbitrary files.

## Entity aggregation

Entity pages query feature projection stores using entity references.

Example `Character:Nora` aggregates:
- canonical metadata;
- runtime state projection (see `specs/cp-project.schema.json`);
- visual assets projection (`specs/cp-assets.schema.json`);
- UAT projection (`specs/cp-uat.schema.json`);
- Git history projection (`specs/cp-history.schema.json`);
- chapter-level projection (`specs/cp-chapters.schema.json`);
- character-level projection (`specs/cp-characters.schema.json`).

The chapter and character projections are first-class entity pages that
follow the same shape as `cp-project`: they carry a `kind`, an `entityRef`
back into the runtime graph, and a stable `lifecycle` token drawn from
the same enum used by `catalog-entity.schema.json`.

The entity is a navigation/join point.

## Lifecycle

Project lifecycle:

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

## Status

Status is dimensional:
- continuity;
- editorial;
- visual;
- reader UAT;
- publishing.

Do not derive one magic health number.

## Capability Catalog

Capabilities are useful macro entities.

Example workflow page:

```text
Workflow: illustration-v4

Capabilities
- multi-reference
- pose control
- 2K output

Usage
- 23 generations
- 81% first-pass acceptance

Current hash
- sha256:...
```

This enables the Control Plane to explain not only books, but the tooling
available to create them.

## Catalog as implemented (m15 slice 2)

The `CatalogEntity` slot is a `readonly CatalogEntity[]` in the projection store.
It is populated by `SnapshotProjectSource.loadCatalogEntities()` which reads all
`.yaml` and `.json` files in the catalog directory that carry the
`narrative.dev/schemas/catalog-entity-v1alpha1` schema identifier.

The `/catalog` page renders entities grouped by `kind` (NarrativeProject,
Character, Build, UATRun) using `catalogSelectors.byKind` and
`catalogSelectors.count`. Each row links to `/entity/$kind/$namespace/$name`.

The `/entity/$kind/$namespace/$name` page composes feature tabs and cards via
the internal Extension Registry (`extensionRegistry.resolveEntityTabs` /
`resolveEntityCards`). Feature folders (`story/character`, `visual/character`,
`catalog/entity`, `continuity/character`) register at module-init. Tab/card
priority ordering is ascending; predicate filtering uses `kindIs` and combinators.
Radix Tabs 1.1.21 provides the accessible tab primitive.

The Extension Registry is a module singleton backed by a `ControlPlaneFeature[]`
array literal. No cross-folder imports exist between feature source directories
— isolation is enforced by `extension-isolation.spec.ts` grep oracle.
