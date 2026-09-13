# Proposal — m10-2-1-verification-audit-harness (slice H0→H6)

**Cycle**: `p-7c4aff45199a2069/m10-2-1-verification-audit-harness`

El change completo está autorado en `docs/reactive-narrative-studio-openspec-evolutives/changes/m10-2-1-verification-audit-harness/proposal.md` (fuente canónica). Este ciclo ejecuta el **slice H0→H6**:

- Problema: false-green demostrado en exploración — tests "roundtrip" que no ejecutan ambos runtimes (`control-plane/test/recipes/roundtrip.spec.ts`, `tools/narrative_recipes/tests/test_roundtrip.py`), wizard `/create` que emite planes vacíos (`CreateWizard.tsx:44-66,112-118`) y sinks que escriben plantillas sin renderizar (`FileSystemAccessSink.ts:42-51`). UAT-M10-04 es hoy no ejecutable end-to-end.
- Solución: Verification & Audit Harness independiente (`verification/`, TS+Playwright) con traceability, evidence bundles y oracles explícitos que ejecuta `SCN-M10-04-001` contra CLI y UI reales; corrección de producción PR-1..PR-5 fuera del Harness; evidence before/after conservada.
- Éxito: AC-1..AC-8 de `spec.md` (slice). El primer gran objetivo del roadmap: cerrar el false-green de Creation Recipes antes de M10.3.
