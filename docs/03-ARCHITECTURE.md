# Architecture — Updated

## System architecture

```text
AUTHOR / AGENT / CLI
        |
        v
Application layer
        |
 +------+---------------------+
 |                            |
 v                            v
Domain                    Project files
 |                            |
GraphRuntimePort               | Git
 |                            |
ActiveGraph Adapter            |
 |                            |
runtime.sqlite + events --------+
        |
        v
Projection Builders
        |
        +------------------------------+
        |                              |
        v                              v
Project projections              Catalog entities
        |                              |
        +---------------+--------------+
                        |
                        v
                 STATIC CONTROL PLANE
```

## Hexagonal boundaries

The domain does not know:
- ActiveGraph;
- React;
- Backstage;
- ComfyUI;
- image providers;
- GitHub;
- Typst;
- IndexedDB.

## Control Plane architecture

The frontend is its own hexagonal/client architecture:

```text
                    UI Shell
                      |
           +----------+----------+
           |                     |
     Feature Extensions      Entity Pages
           |                     |
           +----------+----------+
                      |
              ControlPlane API
                      |
       +--------------+---------------+
       |              |               |
 CatalogStore   SearchIndex     StudioSettings
       |              |               |
       v              v               v
CatalogProviders   Collators       IndexedDB
       |
       v
Projection loaders
       |
       v
Project directory / snapshot
```

## Important separation: two graphs

### Narrative Graph
Fine-grained domain graph inside a project:
- Character
- Scene
- Fact
- Secret
- Asset
- Panel
- relations/state

Potentially thousands of nodes.

### Narrative Catalog
Macroscopic portal model:
- Project
- Edition
- Build
- UATRun
- Skill
- Pack
- Profile
- Recipe
- Workflow

The Catalog MUST NOT duplicate the complete Narrative Graph.

## Catalog authority

```text
Narrative domain/runtime
        |
        v
Catalog Projector
        |
        v
CatalogEntity[]
```

Never reverse the direction.

## Frontend feature model

Backstage inspires the extension model but is not a dependency.

Internal V1 features:

```text
features/
  home/
  catalog/
  story/
  manuscript/
  visual/
  docs/
  search/
  graph/
  uat/
  publishing/
  history/
```

Each feature can contribute typed extensions.

Do not split into independently published NPM packages until a real external
extension case exists.

## Serverless rule

Normal flow:

```text
Browser -> directory/snapshot -> JSON schema validation -> stores -> UI
```

No mandatory HTTP API.

A development server from Vite does not count as application architecture.

## Catalog federation

A local Studio may aggregate several project handles:

```text
DirectoryProvider -> entities
SnapshotProvider  -> entities
FutureProvider    -> entities
                    |
                    v
                CatalogStore
```

The provider is merely an ingestion port.

## Stable contracts

Version separately:
- project manifest;
- projection schema;
- catalog entity envelope;
- recipe schema;
- extension contract.

Do not serialize React component details into project projections.
