# Emergent Architecture — Updated

## Existing principle

Pain before abstraction.

## Control Plane-specific constraints

### No Backstage dependency
We reuse ideas, not runtime/framework packages.

### No plugin marketplace before plugins
V1 extensions are internal modules.

Promote to NPM packages only when:
- a second repository needs to author an extension;
- independent versioning is required.

### No central catalog DB
Multi-project catalog is browser-local ingestion from explicit sources.

### No vector search before full text fails
Orama full-text first.

### No GraphQL/API backend
Projection schemas are sufficient for M10.

### No universal graph
Build focused graph lenses.

### No Next.js/SSR
Static Vite application meets requirements.

### No executable project UI extensions
Project data cannot ship JavaScript into the Studio.

### No arbitrary recipe scripting
Recipe scaffolding is declarative.

### No rich Series/Universe hierarchy before M16
Catalog kinds emerge from real cross-book use.

## Fitness functions

CI should eventually assert:
- Control Plane has no dependency on ActiveGraph Python package;
- no network fetch required for fixture project;
- catalog entity schema validates all fixtures;
- project Markdown cannot execute script;
- domain projection contract is React-independent;
- extensions cannot bypass typed store boundaries;
- multi-project Studio has no central narrative DB;
- recipe output validates as project manifest.
