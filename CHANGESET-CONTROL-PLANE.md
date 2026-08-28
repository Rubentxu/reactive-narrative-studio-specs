# Changeset — Backstage-Inspired Control Plane

## Replaced documents

- `README.md`
- `docs/02-PRD.md`
- `docs/03-ARCHITECTURE.md`
- `docs/13-CONTROL-PLANE.md`
- `docs/18-UAT-STRATEGY.md`
- `docs/19-ROADMAP.md`
- `docs/20-SPIKES.md`
- `docs/21-EMERGENT-ARCHITECTURE.md`
- `docs/23-OBSERVABILITY-COST.md`
- `docs/24-TESTING-GOLDEN-DATASET.md`
- `docs/25-IMPLEMENTATION-STARTER.md`
- `docs/27-GLOSSARY.md`
- `docs/SOURCES.md`
- `specs/control-plane.schema.json`

## Added documents

- `docs/28-CONTROL-PLANE-STACK.md`
- `docs/29-NARRATIVE-CATALOG.md`
- `docs/30-CONTROL-PLANE-EXTENSIONS.md`
- `docs/31-CREATION-RECIPES.md`
- `docs/32-NARRATIVE-DOCS-SEARCH.md`
- `docs/33-STUDIO-HOME-WORKBENCH.md`
- `docs/34-CONTROL-PLANE-DATA-CONTRACTS.md`
- `docs/35-CATALOG-PROVIDERS.md`
- `docs/adrs/ADR-021-narrative-catalog-projection.md`
- `docs/adrs/ADR-022-control-plane-extension-model.md`
- `docs/adrs/ADR-023-creation-recipes.md`
- `docs/adrs/ADR-024-client-side-federated-catalog.md`
- `docs/adrs/ADR-025-home-workbench-separation.md`
- `specs/catalog-entity.schema.json`
- `specs/creation-recipe.schema.json`
- `specs/control-plane-extension.schema.json`
- `examples/catalog-project.yaml`
- `examples/creation-recipe-middle-grade.yaml`
- `uat/UAT-M10-02-catalog-entity-pages.md`
- `uat/UAT-M10-03-local-search-docs.md`
- `uat/UAT-M10-04-creation-recipe.md`
- `uat/UAT-M10-05-multi-project-catalog.md`

## Architectural outcome

The Control Plane is now defined as:

> A serverless, local-first, extensible creative production portal that catalogs
> projects and capabilities, aggregates multiple perspectives around narrative
> entities, and provides search, docs, graph exploration, recipes and workbench
> views over stable project projections.
