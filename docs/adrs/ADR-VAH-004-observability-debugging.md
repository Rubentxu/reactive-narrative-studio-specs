# ADR-VAH-004 — Observabilidad centrada en el Harness

## Status
Proposed.

## Decision
Event stream/tracing viven en Harness. Producción no necesita OpenTelemetry para satisfacer este change. Correlación: run→scenario→step→oracle→artifact. Browser debugging usa trace/screenshots/console.
