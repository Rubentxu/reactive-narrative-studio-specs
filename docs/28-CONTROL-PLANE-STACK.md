# Control Plane Technology Stack

## Decision summary

The Control Plane is a **static TypeScript/React PWA-style application**.
It is not Next.js, Remix, a Node backend or Backstage.

## Baseline as of 2026-08-28

| Concern | Choice | Baseline |
|---|---|---|
| Runtime for tooling | Node.js | 24 LTS |
| Package manager | pnpm | pinned via `packageManager`/Corepack |
| Language | TypeScript | strict mode |
| UI | React | 19.2 |
| Build | Vite | 8.1 |
| Routing | TanStack Router | current compatible stable |
| Styling | Tailwind CSS | 4.3 |
| Accessible primitives | Radix UI | pinned stable |
| Icons | Lucide | pinned stable |
| Client state | Zustand | pinned stable |
| Persistent Studio metadata | Dexie + IndexedDB | Dexie 4.x |
| Schema validation | Ajv | 8.x, JSON Schema 2020-12 |
| Schema-driven recipe forms | RJSF | 6.8.x + AJV8 validator |
| Search | Orama | local in-browser index |
| Graph model | Graphology | stable |
| Graph rendering | Sigma.js | stable 3.x |
| Markdown | react-markdown/unified | sanitized |
| Code highlighting | Shiki | lazy-loaded |
| Unit/component tests | Vitest + Testing Library | pinned |
| Browser UAT | Playwright | pinned |
| PWA | Vite PWA plugin or equivalent | optional, capability-gated |

Exact patch versions MUST be pinned in the implementation lockfile.

## Why React

Reasons:
- strong ecosystem for entity-page composition;
- mature accessibility primitives;
- excellent JSON Schema form ecosystem;
- graph/search integration;
- familiar plugin-like composition patterns;
- direct conceptual mapping from Backstage without importing Backstage.

React is not allowed to leak into projection/domain contracts.

## Why Vite 8.1

Vite 8 is the current stable generation and uses Rolldown as its unified
bundler. Vite 8.1 is the current documented stable line in this specification
baseline.

The application is a pure static bundle.

## Why not Next.js

We do not need:
- server rendering;
- server routes;
- server actions;
- application backend.

Next.js would create the wrong architectural gravity.

## Routing — TanStack Router

Use route types and nested layouts for:
- `/`
- `/catalog`
- `/create`
- `/search`
- `/project/$projectId`
- `/entity/$kind/$namespace/$name`
- `/docs/...`
- `/workbench/...`

Route loaders operate over local stores, not remote APIs.

## Styling

### Tailwind CSS 4.3
Use design tokens through CSS variables.

### Radix primitives
Use for:
- dialogs;
- dropdowns;
- tabs;
- tooltip;
- popover;
- menus;
- accessible overlays.

Do not create an internal component framework prematurely.

`shadcn/ui` patterns MAY be used as source inspiration/generated components,
but the architecture MUST not depend on a remote component registry at
runtime.

### Radix Tabs pin (m15 slice 2)

The `@radix-ui/react-tabs` package is pinned at **exactly `1.1.21`** (no `^` or `~`).
This is the baseline executable via `@radix-ui/react-tabs` accessible primitives for
the entity-page tab composition. Compatible with React 19.2.8 per peer dependency
range `^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc`.

## State strategy

### Zustand
Only for transient application state:
- current project;
- filters;
- selected graph lens;
- ephemeral UI state.

### Dexie/IndexedDB
For local Studio metadata:
- recently opened projects;
- favorites;
- widget layout;
- search cache;
- snapshot metadata;
- non-canonical preferences.

Never store canonical narrative state only in IndexedDB.

## Filesystem access

Create a `ProjectSourcePort` with implementations:
- `DirectoryProjectSource`;
- `SnapshotProjectSource`.

Directory mode uses File System Access API as progressive enhancement.

Snapshot mode is mandatory fallback.

## JSON Schema

All project/catalog/projection input MUST validate before entering stores.

Use JSON Schema draft 2020-12 consistently.

Ajv validator configuration:
- strict;
- allErrors for diagnostics;
- known formats explicitly registered;
- no arbitrary remote schema fetching.

## Recipes/forms

RJSF 6.8.x is selected because it maps JSON Schema to React forms and supports
AJV8 validation.

Use recipe-specific `uiSchema` only for presentation.

The recipe schema remains UI-framework-neutral.

## Search — Orama

V1 search is:
- fully local;
- full text;
- typed;
- feature-collated.

No cloud/AI search service is required.

Initial indexed fields:
- title;
- text;
- type;
- project;
- tags;
- entity reference;
- source path.

Vector search is explicitly deferred.

## Graphs — Graphology + Sigma.js

Graphology provides graph data structures.
Sigma stable 3.x provides WebGL rendering for thousands of nodes/edges.

Do NOT adopt Sigma 4 alpha in production baseline.

Use graph lenses and subgraph extraction before rendering.

Layout:
- deterministic stored coordinates when useful;
- ForceAtlas2 worker for exploration;
- domain-specific layouts for timeline/hierarchy.

## Docs pipeline

Use:
- `react-markdown` or unified;
- `remark-gfm`;
- sanitizing rehype layer;
- Shiki for code only.

Do not execute MDX from project files.

Entity-link syntax can be transformed by a safe custom remark plugin.

## Extension registry

V1 is compile-time/internal:

```ts
interface ControlPlaneFeature {
  id: string
  extensions: Extension[]
}
```

No runtime `eval`, no dynamic remote JavaScript.

## Testing

### Unit
Vitest.

### React component
Testing Library.

### Schema contract
AJV fixtures.

### Browser UAT
Playwright with:
- directory-source mock adapter;
- snapshot fixtures;
- offline mode;
- large graph fixture.

### Visual regression
Optional Playwright screenshots after M10 stabilizes.

## Security headers/deployment

Static hosting SHOULD set:
- strict CSP;
- no inline arbitrary script;
- no remote plugin code;
- appropriate COOP/COEP only if a future WASM capability requires it.

## Browser target

Modern evergreen desktop browsers.

Directory mode:
- progressive enhancement.

Snapshot mode:
- required compatibility mode.

## Dependency governance

Frontend dependencies MUST follow:
- lockfile committed;
- Renovate/Dependabot optional;
- major upgrades via ADR or migration note when architectural;
- avoid packages used by a single trivial helper;
- bundle-size budget after M10 first usable build.
