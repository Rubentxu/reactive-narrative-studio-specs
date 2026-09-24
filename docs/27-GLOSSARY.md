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

**Recipe Skeleton** — directory tree of templated starter files under `recipes/<id>/skeleton/`;
rendered by the mustache-subset engine with user-supplied parameters to produce a new project.

**Round-trip Equivalence Oracle** — canonical-JSON equality check asserting that
`canonicalJson(stripRecipeOwned(manifest_python)) === canonicalJson(stripRecipeOwned(manifest_ts))`
holds for the same recipe and parameters across the Python and TypeScript implementations.

**Canonical-JSON Equality** — JSON serialization per RFC 8785 (JCS): sorted keys, no
insignificant whitespace, UTF-8, NFC normalization. Used to compare manifests produced by
independent implementations without formatting differences.

**Mustache-subset Template Engine** — restricted template grammar supporting `{{var}}`,
`{{#each items}}...{{/each}}`, `{{#if flag}}...{{/if}}`, `{{! comment }}`, and `{{.}}`
(current item). All forbidden patterns (partials, raw HTML, dotted paths, nested variables,
function calls) are rejected at parse time with `TemplateError`.

**File System Access Sink** — browser sink for `create-plan.json` output using the
File System Access API (`showDirectoryPicker` + `getFileHandle` + `createWritable`).
Writes skeleton files to a user-selected directory; only available in Chromium-based browsers.

**Recipe Plan** — canonical JSON artifact (`create-plan.json`) produced by the wizard or CLI
containing `{ recipe, recipeLockSha256, manifest, skeleton: [{path, sha256, bytes}], createPlanSha256 }`.
Emitted by `RecipePlanEmitter` in both wizard and CLI paths.

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

### Capability Manifest

A static JSON snapshot of every discoverable studio capability (skills, packs,
profiles, workflows, providers, recipes) computed at build time and stored as
`control-plane/src/features/capability-catalog/data/manifest-data.json`. Each
entry carries `kind`, `id`, `namespace`, `name`, `path`, `origin`, and `sha256`
(the latter enables EVT-CAP-12b fixture round-trip tests). M10.2 deliverable;
see [`changes/m10-2-capability-catalog/spec.md`](changes/m10-2-capability-catalog/spec.md).

### Capability Detail Route

The `/capabilities/$kind/$namespace/$name` route pattern rendering one
specific capability via `CapabilityDetail.tsx`. Composes `EntityHeader`,
`MetadataCard`, and `RelationsList` from the m16 catalog entity Extension
Registry, with cross-references resolved via the `entityLinkPlugin`. M10.2
deliverable.

### Empty-State UX

The explicit no-data state rendered when a capability kind has zero
instances (e.g., `providers` today). Per design decision DD-4, the empty
state surfaces a header, a link to the relevant schema, and a CTA button
for future authoring — not a hidden section. M10.2 design choice; see
[`changes/m10-2-capability-catalog/design.md`](changes/m10-2-capability-catalog/design.md).

### `import.meta.glob`

Vite's first-party build-time glob importer. In M10.2 it is used with
`{ eager: true, query: '?raw', import: 'default' }` to enumerate capability
files (skills, packs, profiles, workflows, recipes) at module init,
preserving the m10 serverless invariant (no runtime `fetch()`). The
runtime never makes network calls; the manifest is pre-computed. M10.2
design choice DD-1.

### Verification & Audit Harness

The independent verification package (`verification/`, TypeScript + Playwright)
introduced by M10.2.1. It executes UAT scenarios against the real system (CLI
processes, browser, filesystem) and derives verdicts from explicit oracles over
immutable evidence bundles. Production code MUST NOT import from `verification/`
(VAH-001). See [`changes/m10-2-1-verification-audit-harness/spec.md`](changes/m10-2-1-verification-audit-harness/spec.md).

### Evidence Bundle

The immutable, per-run output directory of the Harness
(`verification/evidence/<runId>/`): `run.json`, `verdict.json`, `events.jsonl`,
environment/git probes, browser traces, filesystem snapshots, and a
`hashes.sha256` index. Every artifact is SHA-256 hashed; re-execution creates a
new `runId` and never overwrites history (VAH-007/014/025).

### Oracle

A verification component that decides PASS/FAIL over captured observations and
artifacts. Every oracle declares a classification and its epistemic claims —
what it proves and what it does NOT prove (e.g. a filesystem-tree oracle proves
structural equality, not narrative quality). Cross-language equivalence (VAH-012)
MUST be demonstrated by oracles over artifacts produced by both real runtimes.

### False Green

A green test that does not demonstrate the acceptance criterion it claims to.
Closed by M10.2.1 for Creation Recipes: the harness baseline run exposed that
`/create` never mounted in the built app and that "round-trip" tests compared
hand-written fixtures instead of executing both runtimes.

### Audit Gate

The Git-native gate (`verification/src/audit/`) that derives a milestone verdict from
traceability + evidence + waivers — never from commit text or agent claims (VAH-020).
Requirements are `PROVEN`/`WAIVED`/`PARTIALLY_VERIFIED`/`FAILED`/`UNMAPPED`; the last
three block unless an applicable waiver exists. Declared verification levels
(`requirement-levels.json`) distinguish `functional` (scenario verdict required) from
`fitness` (component test refs sufficient).

### Flakiness Classification

Historical per-scenario classification from evidence bundles: a scenario with both PASS
and FAIL runs is `FLAKY`; only FAIL is `STABLE_FAIL`; only PASS is `STABLE_PASS`.
Produced by `audit flakiness` (H10).

### Studio Registry

The IndexedDB-backed preferences database (`rns-studio`, object store `projects`)
holding recent-project metadata only: project id, title, source kind, selected
file names, last-opened timestamp and favorite flag. It never stores projections,
docs or narrative content — projects live outside the browser (local
directories / Git), so deleting the registry never deletes a project (M10.3,
UAT-M10-05, REQ-MP-2/6).

### Reader UAT Round

One completed pass of the anonymized human-reader feedback form (`/reader-uat`).
The round report is a local JSONL download (one entry per round) carrying an
anonymous session reader id, optional reader context and Likert metrics, free-text
highlights and the editorial-impact link (`revisionImpact` + `manuscriptRevision`).
Human rounds are stored separately from synthetic-reader output (ADR-019) and are
never uploaded or persisted in the browser (M11, UAT-M11-01).

### Sequential Graph Lens

The M12 Control Plane view that renders the adapted SequentialArtIR as a
sequence graph: one node per panel in reading order, edges following the
reading sequence, node weight reflecting beat importance, and visible gaps at
scene breaks. It complements the panel storyboard page (`/storyboard`) and
shares its invariant: dialogue is editable text, never part of an image.

### Comic Proof

The M13 export produced by the comic renderer from a SequentialArtIR document:
a store-mode CBZ containing one layered SVG page per IR page (art placeholder
slots tagged by shotRef + a separate lettering layer of editable `<text>`
balloons/captions) plus `ComicInfo.xml`. Dialogue text is never baked into
raster images — the art layer holds no narrative text, so lettering can be
regenerated without touching any image.
