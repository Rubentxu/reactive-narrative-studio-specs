# ADR-021 — Narrative Catalog is a projection

## Status
Accepted.

## Context
Backstage's catalog pattern is highly valuable, but making catalog entities
the domain would distort the narrative model.

## Decision
Narrative Catalog entities are derived read models.

```text
Domain/Runtime -> Catalog Projector -> CatalogEntity[]
```

## Consequences
- portal schema can evolve independently;
- no catalog DB becomes authoritative;
- detailed Narrative Graph remains separate;
- catalog can be rebuilt.
