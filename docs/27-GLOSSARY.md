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

**Visual DNA** — stable visual identity contract.

**Scene Visual Contract** — required visual evidence for an illustration.

**Synthetic Reader** — advisory model simulation, never human UAT.

**Status (canonical vocabulary)** — Control Plane check-status values are
lowercase: `pass | warning | blocked | pending | unknown`. Source of truth:
specs/control-plane.schema.json checks enum. Any other casing is rejected.

**debt carry-over** — LOW/P3 finding deferred from one cycle to a future cycle's backlog, tracked via vault findings_closed entries referencing the closing requirement and scenario.
