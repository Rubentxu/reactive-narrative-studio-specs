# Spikes — Updated

Existing runtime/visual spikes remain valid.

## New Control Plane spikes

### SPK-013 Catalog Entity Projection
Question:
Can macro catalog entities remain useful without duplicating the Narrative
Graph?

Success:
Project/Character/Build pages can navigate to detail while catalog payloads
remain bounded.

### SPK-014 Extension Registry
Compare:
- simple typed registry;
- package-per-feature.

Success:
Choose the smallest mechanism supporting entity tabs/cards/home/search.

Expected outcome:
simple internal registry.

### SPK-015 Search Engine
Compare on representative snapshot:
- Orama;
- MiniSearch or equivalent.

Measure:
- index time;
- bundle impact;
- query quality;
- filtering;
- persistence.

Current architectural preference: Orama.

### SPK-016 Large Graph Lens
Use 1k, 10k and realistic scoped graph fixtures.

Measure:
- parse;
- layout;
- interaction;
- memory.

Validate Sigma.js stable + Graphology and lens/subgraph strategy.

### SPK-017 Directory vs Snapshot UX
Validate permissions and reload behavior for:
- Chromium directory access;
- snapshot fallback.

Success:
Snapshot path is first-class, not an error fallback.

### SPK-018 Recipe Wizard
Use one JSON Schema through:
- CLI prompts;
- RJSF frontend.

Success:
Normalized output is semantically identical.

### SPK-019 Safe Narrative Docs
Attack fixtures:
- script tags;
- javascript URLs;
- HTML injection;
- malformed wikilinks.

Success:
No code execution; useful diagnostics.

### SPK-020 IndexedDB Studio Registry
Validate storing only:
- recent project metadata;
- favorites;
- UI layout.

Success:
Deleting IndexedDB never deletes project canon.
