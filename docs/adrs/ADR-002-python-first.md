# ADR-002 — Python-first implementation

## Status
Accepted.

## Decision
Implement the product in Python 3.12 initially.

## Rationale
The dominant work is agent orchestration, model/API integration, validation, file/project processing and image workflows. Python provides the strongest ecosystem and fastest iteration.

## Consequences
Rust is deferred until profiling demonstrates a real hotspot.
