# Observability, Resource Use and Cost

## Why observability matters

Creative AI workflows fail in expensive, non-obvious ways:
- repeated model calls;
- regenerated images;
- hidden forks;
- stale assets;
- manual correction loops.

## Track per run

- frame/run ID;
- source commit;
- active profile;
- packs/skills;
- model/provider;
- tokens where available;
- image generation count;
- latency;
- estimated/known cost;
- cache hits;
- accepted/rejected candidates;
- validation findings.

## Image efficiency metrics

Useful:
- cost per generated asset;
- cost per accepted asset;
- regeneration ratio;
- QA failure rate;
- local vs SaaS proportion.

## Narrative metrics

Display as information:
- chapter word count;
- dialogue ratio;
- POV distribution;
- character presence;
- unresolved promise count;
- readability signals;
- synthetic/human feedback.

Do not optimize literature to maximize one KPI.

## Control Plane

Show:
- current phase;
- work blocked;
- recent activity;
- stale assets;
- pending approvals;
- costs/resource use;
- provider failures;
- UAT status.

## Event volume

If event logs become noisy, introduce:
- event classes;
- compacted projections;
- retention policy for low-value diagnostic events.

Do not prematurely remove evidence needed for replay/debugging.
