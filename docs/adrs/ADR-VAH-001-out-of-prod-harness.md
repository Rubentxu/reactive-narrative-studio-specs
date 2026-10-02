# ADR-VAH-001 — Verification Harness fuera del runtime productivo

## Status
Proposed.

## Decision
`verification/` será tooling/bounded context separado. Producción no depende del Harness. Interacción preferente black-box vía CLI, browser, filesystem y process boundary.

## Rejected
`if TEST_MODE`, APIs artificiales o ramas productivas dedicadas al test.
