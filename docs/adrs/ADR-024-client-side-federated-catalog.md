# ADR-024 — Client-side federated catalog providers

## Status
Accepted.

## Decision
The Studio may aggregate multiple explicitly opened projects through
client-side CatalogProvider adapters.

Initial:
- local directory;
- snapshot.

## Consequences
- no central catalog service;
- every book retains independent DB/Git;
- cross-project Home remains local-first.
