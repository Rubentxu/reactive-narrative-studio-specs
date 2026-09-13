# Spec — m10-2-1-baseline-audit (H7 + H8)

**Cycle**: `p-7c4aff45199a2069/m10-2-1-baseline-audit`
**Fuente canónica**: `docs/reactive-narrative-studio-openspec-evolutives/changes/m10-2-1-verification-audit-harness/tasks.md` (H7, H8) + design.md (oracles, waivers).

## Scope

- **H7** — Auditoría M10.2: navegar rutas reales, seis kinds, entity details, cross-links, storage no mutado (separando source/component fitness de UAT funcional).
- **H8** — Baseline M0–M10.2: scenarios ejecutables, gaps/backlog, coverage report, waivers justificados.
- Fuera de scope: H9 (CI Audit Gate), H10 (hardening).

## Requisitos en scope

| REQ | Enunciado | Horizonte |
|---|---|---|
| REQ-VAH-BROWSER-AUDIT | Un UAT de UI MUST ejecutarse navegando la aplicación real (build+preview+browser) y sus PASS/FAIL MUST derivarse de oráculos sobre DOM capturado, no de tests de strings. | H7 |
| REQ-VAH-FITNESS-SEPARATION | Fitness de arquitectura/fuente (p.ej. store no mutado, prohibición de imports) MUST declararse separada de los oráculos funcionales; un scenario MUST NOT afirmar como probado lo que solo cubre un test de componente. | H7 |
| REQ-VAH-WAIVER | Un waiver MUST tener id, requisito, razón, alcance, responsable y evidencia; MUST NOT convertir FAIL en PASS — produce `PASS_WITH_WAIVER`. | H8 |
| REQ-VAH-BASELINE | MUST generarse baseline M0–M10.2 sin reescribir historia: por milestone, UATs (EXECUTABLE/MANUAL_ONLY/WAIVED), requisitos MAPPED (scenario/test) vs UNMAPPED, y gaps/backlog. | H8 |
| REQ-VAH-CROSSREF-RENDER | Un cross-reference de capacidad declarado en contenido (`[[Kind:namespace/name]]`) MUST renderizarse como anchor resuelto en la página de detalle. Gap aceptado con waiver mientras no exista contenido real con cross-refs (WVR-M10-2-1-001). | H7 |
| REQ-VAH-STORE-IMMUTABILITY | Navegar las rutas del catálogo MUST NOT mutar el projection store. Probado a nivel componente (round-trip no-op); el scenario funcional NO lo reclama (WVR-M10-2-1-002). | H7 |

## Criterios de aceptación

- **AC-1 (H7)**: `SCN-M10-02-001` ejecuta build+preview+Chromium, navega `/capabilities`, los 6 kind routes y un entity detail real, capturando DOM por step; oracles `browser-content` + `browser` health + ausencia de sintaxis `[[...]]` cruda en texto visible.
- **AC-2 (H7)**: el scenario declara explícitamente en `doesNotProve` la mutación del projection store y la cobertura positiva de cross-links; la matriz mapea el store a refs de tests de componente (separación fitness/UAT).
- **AC-3 (H8)**: `verification/traceability/registry.json` incluye `testRefs` (harvest de `control-plane/test/**` y `tools/**/tests/**`) además de scenarios.
- **AC-4 (H8)**: `waivers.json` con esquema válido (id/requirement/reason/scope/owner/evidence) + mecánica del runner: oracle fallido cubierto por waiver → verdict `PASS_WITH_WAIVER` (nunca PASS), documentado en el report.
- **AC-5 (H8)**: `verification/traceability/baseline-m0-m10-2.md` generado con estado por milestone, gaps/backlog ordenado y waivers aplicados; regenerable con `npm run traceability:build`.
- **AC-6**: quality gates verdes (verification tsc+vitest, control-plane tsc+vitest, pytest, validadores) y VAH-001 (0 imports de verification/ en producción).
