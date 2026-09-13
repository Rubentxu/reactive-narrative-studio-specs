# Tasks — m10-2-1-baseline-audit (H7 + H8)

**Cycle**: `p-7c4aff45199a2069/m10-2-1-baseline-audit` · branch `feat/m10-2-1-baseline-audit` · base `0a5de69` (v0.11.0)

## Block Plan

```
B0  H7 harness: browser-content oracle + DOM capture + SCN-M10-02-001
B1  H8 harness: waivers + testRefs + baseline report
B2  Audit run: SCN-M10-02-001 real (before/after de gaps)
B3  Docs + receipts
```

## Tareas

### B0 — H7 (browser audit)
- [ ] T0.1 BrowserDriver: captura `browser.<step>.dom.json` en navigate/click/submit.
- [ ] T0.2 Oracle `browser-content` + registro + tests unitarios.
- [ ] T0.3 Action `browser.click` (click en selector + espera navegación + DOM).
- [ ] T0.4 Scenario `SCN-M10-02-001` con claims honestos.

### B1 — H8 (baseline)
- [ ] T1.1 `waivers.json` + carga/validación + verdict `PASS_WITH_WAIVER` en runner/report/CLI.
- [ ] T1.2 Registry: `testRefs` (harvest tests) + `waivedRequirements`.
- [ ] T1.3 Baseline report `baseline-m0-m10-2.md` + gaps/backlog + regeneración.
- [ ] T1.4 Tests unitarios (waiver inválido → FAIL; válido → PASS_WITH_WAIVER; baseline contiene M0–M10.2).

### B2 — Auditoría real
- [ ] T2.1 Ejecutar SCN-M10-02-001 (real browser) → evidence.
- [ ] T2.2 Regenerar registry + baseline; documentar gaps resultantes.

### B3 — Docs
- [ ] T3.1 Roadmap/glossary/README + informe del ciclo.

## Coverage Matrix

| REQ | Tasks | AC |
|---|---|---|
| REQ-VAH-BROWSER-AUDIT | T0.1–T0.4, T2.1 | AC-1 |
| REQ-VAH-FITNESS-SEPARATION | T0.4, T1.2 | AC-2 |
| REQ-VAH-WAIVER | T1.1, T1.4 | AC-4 |
| REQ-VAH-BASELINE | T1.2, T1.3, T2.2 | AC-3, AC-5 |
