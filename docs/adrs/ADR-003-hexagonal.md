# ADR-003 — Hexagonal boundaries

## Status
Accepted.

## Decision
Runtime, image providers, SCM and rendering are ports/adapters.

## Consequence
Domain/application modules cannot import ActiveGraph/provider SDK types.
