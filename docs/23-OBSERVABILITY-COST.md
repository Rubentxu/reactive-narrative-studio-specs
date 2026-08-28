# Observability, Resources and Control Plane Projection — Updated

## Runtime observability

Keep prior metrics:
- runs;
- model calls;
- image generation;
- latency/cost;
- cache hits;
- QA failures;
- accepted/rejected candidates.

## Portal observability

Expose through projections, never direct runtime coupling.

### Project
- lifecycle;
- blockers;
- pending approvals;
- recent checkpoint;
- projection freshness.

### Visual
- generation count;
- accepted ratio;
- stale assets;
- provider routing;
- repair count.

### Capability catalog
For skills/packs/workflows:
- version;
- projects using capability;
- evaluation status;
- workflow hash;
- optional acceptance/cost aggregates.

## UI diagnostics

Local diagnostics panel may show:
- schema errors;
- stale projection;
- source permission errors;
- search index status;
- graph render size;
- extension failures.

## Privacy

Cross-project Home must not accidentally surface raw private manuscript text.
Home cards should use bounded summaries/projection fields.
