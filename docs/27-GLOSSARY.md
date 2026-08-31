# Glossary — Updated

**Agent Skill** — portable task knowledge in `SKILL.md`.

**Pack** — runtime/domain bundle of types, behaviors, tools and policies.

**Narrative Graph** — detailed graph of story/runtime entities inside a
project.

**Narrative Catalog** — high-level Control Plane projection of projects,
capabilities and selected navigable entities.

**Catalog Entity** — versioned portal projection envelope with metadata, spec,
status, annotations and relations.

**Entity Page** — Control Plane aggregation page that combines several
feature perspectives around one catalog entity.

**Annotation** — metadata linking a catalog entity to an authoritative source
or technical resource.

**Extension** — statically registered Control Plane contribution such as an
entity tab, home widget, graph lens or search collator.

**Feature** — logical frontend capability grouping extensions.

**Creation Recipe** — declarative scaffold/profile preset used by both CLI and
frontend wizard.

**Narrative Docs** — safe docs-as-code rendering of project Markdown.

**Search Collator** — feature that emits normalized local search documents.

**Graph Lens** — focused transformation/view of the detailed Narrative Graph.

**Studio Home** — cross-project landing page.

**Workbench** — project-local current-work/next-action view.

**Catalog Provider** — client-side adapter that supplies catalog entities from
an explicitly opened project source.

**Snapshot** — portable read-only package of projections/docs/thumbnails for
serverless Control Plane loading.

**Projection** — rebuildable read model.

**Runtime DB** — project-local ActiveGraph persistence, not canonical source.

**Candidate** — proposal not yet accepted as canon.

**Decision/Receipt** — acceptance/action evidence.

### V1 substring index

Pure in-memory substring full-text search over catalog entities, cp-\* projections, and
Markdown docs. No IndexedDB, no Orama, no network calls. 5-level ranker: exact-id=100
> Kind:ns/name=80 > multi-token-hit=60 > single-token-hit=40 > snippet-only=20.
See [`docs/32-NARRATIVE-DOCS-SEARCH.md`](docs/32-NARRATIVE-DOCS-SEARCH.md). Per
[Amendment 1](changes/m16-cp-studio-search-docs/spec.md#amendment-1).

### kind: 'docs'

Additive discriminator field on `EntityTabExtension` (`kind?: 'docs'`), introduced in
Amendment 1. Marks a tab as a docs tab; required on `DocTab`, optional on all other
m15 tabs (overview, arc, scenes, metadata, continuity-status, visual-dna, etc.). The
field is metadata only — `apiVersion: 'control-plane.extensions/v1'` is preserved verbatim.
See [`docs/30-CONTROL-PANE-EXTENSIONS.md`](docs/30-CONTROL-PLANE-EXTENSIONS.md) §REQ-EXR-1.

### Safe Narrative Docs

Git-controlled Markdown rendered inside entity/project context via `react-markdown` +
`rehype-sanitize` + `remark-gfm` + `entityLinkPlugin`. GFM-safe allow-list strips
OWASP XSS vectors (script tags, javascript:/data:/vbscript: URLs, iframe, object/embed,
style, inline event handlers). Entity-link syntax `[[Kind:namespace/name]]` maps to
internal links via `parseEntityRef`. See
[`docs/32-NARRATIVE-DOCS-SEARCH.md`](docs/32-NARRATIVE-DOCS-SEARCH.md).

### Decision projection

`cp-decisions.json` envelope (`schema: "control-plane/decisions/v1"`) with
`Decision[]` entries `{ id, action, targetRef (Kind:namespace/name), date (isoTimestamp),
status ∈ {accepted,rejected,pending,superseded} }`. New file per REQ-DEC-1
(AC-INV-schema binding — `specs/cp-decisions.schema.json` is NEW, not a modification
of any existing schema). See [`docs/32-NARRATIVE-DOCS-SEARCH.md`](docs/32-NARRATIVE-DOCS-SEARCH.md)
§Decision projection.

### scene-chapter

Search result type; ONE entry per chapter from `bundle.chapters[]` (Amendment 1).
id `scene-chapter:<chapter-id>`; entityRef `Chapter:cp/<chapter-id>`; title from
`ch.title`; sourcePath from `ch.docRef` when present. Scene granularity is
future-extensible via a separate cycle + ADR; the chapter IS the projected
narrative unit in the Control Plane. Per
[Amendment 1](changes/m16-cp-studio-search-docs/spec.md#amendment-1).

**Visual DNA** — stable visual identity contract.

**Scene Visual Contract** — required visual evidence for an illustration.

**Synthetic Reader** — advisory model simulation, never human UAT.

**Status (canonical vocabulary)** — Control Plane check-status values are
lowercase: `pass | warning | blocked | pending | unknown`. Source of truth:
specs/control-plane.schema.json checks enum. Any other casing is rejected.

**debt carry-over** — LOW/P3 finding deferred from one cycle to a future cycle's backlog, tracked via vault findings_closed entries referencing the closing requirement and scenario.

### CatalogEntity Store

The `catalogEntities: readonly CatalogEntity[]` slice of the projection store
(`useProjectionStore`). Populated by `SnapshotProjectSource.loadCatalogEntities()`
from YAML/JSON files in the catalog directory. Consumed by `catalogSelectors`
(`byKind`, `byEntityRef`, `byNamespace`, `count`). See
[`docs/29-NARRATIVE-CATALOG.md`](docs/29-NARRATIVE-CATALOG.md).

### Extension Registry

The module-singleton `extensionRegistry` that mediates cross-feature composition in
the Control Plane. Features register at module-init via `register(feature)`. The
sole consumers are `EntityPage.tsx` which calls `resolveEntityTabs` and
`resolveEntityCards` per entity. See
[`docs/30-CONTROL-PLANE-EXTENSIONS.md`](docs/30-CONTROL-PLANE-EXTENSIONS.md).

### Entity Page

The `/entity/$kind/$namespace/$name` Control Plane page that aggregates feature
tabs and cards around one catalog entity. Orchestrates Radix Tabs for tab panels,
uses `catalogSelectors.byEntityRef` to locate the entity, and calls
`extensionRegistry.resolveEntityTabs/resolveEntityCards` to discover and render
feature contributions.

### Feature Extension

A `ControlPlaneFeature` — a statically registered tab (`EntityTabExtension`) or
card (`EntityCardExtension`) that contributes UI to an entity page. Feature
extensions are registered in feature folders under `control-plane/src/features/`
at module-init time. Each extension carries `apiVersion:
'control-plane.extensions/v1'`, a `predicate`, a `priority`, and a `render(ctx)`
function. See [`docs/30-CONTROL-PLANE-EXTENSIONS.md`](docs/30-CONTROL-PLANE-EXTENSIONS.md).

### Entity Reference

An `EntityRef` is a `{ kind: string; namespace: string; name: string }` triple
used to locate a catalog entity. `parseEntityRef` parses `Kind:namespace/name`
strings; `formatEntityRef` serialises back. `toEntityRef` derives an
`EntityRef` from a `CatalogEntity`'s metadata. See
[`docs/34-CONTROL-PLANE-DATA-CONTRACTS.md`](docs/34-CONTROL-PLANE-DATA-CONTRACTS.md).
