# Product Requirements Document — Updated

## Product definition

Reactive Narrative Studio is a local-first production environment where
authors and agents collaboratively create, validate, illustrate, revise and
publish narrative works while retaining Git-native project ownership.

## Major product areas

1. Narrative workspace
2. Reactive runtime
3. Agent Skills
4. Visual production
5. Quality/UAT
6. Publishing
7. Serverless Control Plane

## Control Plane product requirements

### CP-FR-001 Narrative Catalog
The frontend MUST create a catalog from project projection entities rather
than querying ActiveGraph internals.

### CP-FR-002 Entity Pages
The frontend MUST aggregate multiple feature perspectives around a single
catalog entity.

Reference entity kinds:
- NarrativeProject
- Character
- Chapter
- Edition
- Build
- UATRun
- Skill
- Pack
- Profile
- Recipe
- Workflow
- ProviderCapability

Not all kinds need to be implemented in M10.

### CP-FR-003 Extension points
The UI MUST provide typed internal extension points for:
- pages;
- entity tabs;
- entity cards;
- home widgets;
- graph lenses;
- search collators/result renderers;
- docs addons;
- recipe form widgets.

### CP-FR-004 Studio Home
The Control Plane MUST offer a cross-project landing view with:
- recent projects;
- favorites;
- blocked work;
- pending approvals;
- recent activity;
- optional cost/resource widgets.

### CP-FR-005 Workbench
Each opened project MUST expose a current-work view:
- current focus;
- next deterministic action;
- blockers;
- active chapter/scene;
- visual queue;
- approvals;
- active fork.

### CP-FR-006 Narrative Search
Search MUST operate locally over normalized search documents contributed by
features. Search MUST NOT require Elasticsearch or a remote search service.

### CP-FR-007 Narrative Docs
The UI MUST render project Markdown safely and may enrich it with:
- entity links;
- backlinks;
- visual previews;
- continuity findings;
- Git history.

Arbitrary executable MDX is forbidden for untrusted project content.

### CP-FR-008 Creation Recipes
A recipe MUST be usable by both:
- CLI;
- Control Plane wizard.

The recipe defines scaffolding/configuration, not a generic runtime workflow.

### CP-FR-009 Multi-project catalog
The browser MAY maintain a local index of explicitly opened projects without
introducing a central project DB.

### CP-FR-010 Catalog providers
Catalog ingestion MUST be abstracted behind client-side providers. M10 ships:
- Directory provider;
- Snapshot provider.

Future providers MAY include Git-hosted read-only snapshots.

### CP-FR-011 Serverless operation
The normal Control Plane MUST function as static assets. No persistent
application server is required.

### CP-FR-012 Projection validation
Every consumed projection MUST be validated against versioned JSON Schema.

### CP-FR-013 No hidden authority
Editing local Studio metadata (favorites, UI layout, recent projects) MUST NOT
modify narrative canon.

## Non-functional Control Plane requirements

### CP-NFR-001 Security
Markdown/HTML must be sanitized. Project data is treated as untrusted input.

### CP-NFR-002 Performance
Large graph rendering must use a WebGL-oriented graph renderer and scoped
lenses instead of rendering a universal graph.

### CP-NFR-003 Offline
Previously opened snapshot projects SHOULD remain inspectable offline.

### CP-NFR-004 Accessibility
Keyboard navigation, focus management and semantic components are required.

### CP-NFR-005 Browser support
Target current evergreen desktop browsers. Directory access is progressive
enhancement; snapshot loading is the compatibility fallback.

### CP-NFR-006 Stability
Extension contracts and projection schemas are versioned independently of
frontend implementation details.

## Out of scope

- central SaaS portal;
- user/group directory;
- backend plugin API;
- arbitrary remote plugin execution;
- cross-user collaborative writes;
- server-hosted search;
- catalog DB as project authority.
