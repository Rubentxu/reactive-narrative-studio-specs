# ADR-022 — Typed internal Control Plane extension model

## Status
Accepted.

## Decision
Adopt Backstage-like extension points but implement them initially as static
TypeScript modules in one application.

Initial kinds:
- entity card/tab;
- home widget;
- graph lens;
- search collator/result;
- docs addon.

## Rejected
- remote dynamic plugins;
- NPM package per feature from day one;
- backend plugin API.

## Evolution trigger
Extract package boundaries only after an independent external extension use
case exists.
