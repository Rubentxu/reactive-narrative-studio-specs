# Control Plane Extension Model

## Goal

Allow features to contribute UI/search/graph/docs capability without building
Backstage-scale plugin infrastructure.

## Principle

Start internal and statically linked.

```text
control-plane/
  src/
    core/
    features/
      catalog/
      story/
      visual/
      docs/
      search/
      uat/
```

Only extract packages after genuine external consumers appear.

## Extension kinds

### PageExtension
Top-level page.

### EntityTabExtension
Adds a tab/content region to matching entity kinds.

### EntityCardExtension
Adds a summary card.

### HomeWidgetExtension
Contributes Studio Home widgets.

### WorkbenchWidgetExtension
Contributes project-current-work widgets.

### GraphLensExtension
Transforms Narrative Graph projection into a scoped visual graph.

### SearchCollatorExtension
Produces normalized search documents.

### SearchResultExtension
Renders a specific result type.

### DocsAddonExtension
Adds safe read-only docs enrichments.

### RecipeWidgetExtension
Customizes schema-driven recipe fields when JSON Schema alone is insufficient.

## Matching

Example:

```ts
type EntityPredicate = (entity: CatalogEntity) => boolean
```

An extension declares:
- stable ID;
- feature owner;
- slot;
- predicate;
- priority;
- lazy component loader.

## No dynamic remote code

V1 MUST NOT:
- download plugin JS from projects;
- `eval()` extensions;
- import arbitrary project modules.

Projects provide data; application build provides executable features.

## Extension configuration

User/project config may enable/disable known features:

```json
{
  "extensions": {
    "visual:entity-tab": { "enabled": true }
  }
}
```

Unknown IDs are ignored with diagnostics.

## Feature discovery

Initial:

```ts
const features = [
  catalogFeature,
  storyFeature,
  visualFeature,
  ...
]
```

Future:
- workspace package discovery at build time.

Do not implement runtime package discovery until an actual plugin ecosystem
exists.

## Compatibility

Every extension contract carries API version.

Example:

```ts
interface EntityTabExtensionV1 {
  apiVersion: "control-plane.extensions/v1"
  ...
}
```

## Error isolation

A failing non-core extension SHOULD:
- render an error boundary;
- report diagnostics;
- not crash the shell/catalog.

## Design influence from Backstage

Reuse:
- extension kinds/blueprint thinking;
- entity page contribution;
- search result contribution;
- home widgets.

Reject:
- full plugin packaging requirement in V1;
- backend plugin APIs;
- runtime remote plugin ecosystem.
