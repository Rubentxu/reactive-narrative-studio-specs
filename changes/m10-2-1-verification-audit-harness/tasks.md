# M10.2.1 — Verification & Audit Harness (slice H0→H6) — Tasks

**Cycle**: `p-7c4aff45199a2069/m10-2-1-verification-audit-harness`
**Path**: A-lite
**Branch**: `feat/m10-2-1-verification-harness`
**Base**: `3aa6b825756d5faa762dd5d1ac0770fb320649cb` (v0.10.0, m10.2 done)

---

## Block Plan

```
B0  H0+H2+H3 core   (verification/ scaffold + evidence core + process/fs/git drivers)
B1  H3+H4+H5        (browser driver + oracles + debug plane + runner CLI)
B2  H1              (traceability registry + coverage matrix)
B3  H6 before       (SCN-M10-04-001 real run → baseline FAIL/false-green evidence)
B4  PR-1..PR-5      (production fixes fuera del Harness)
B5  H6 after        (re-run SCN-M10-04-001 → PASS evidence + informe before/after)
B6  Docs            (glossary/roadmap/readme + receipts)
```

## Tareas

### B0 — Bootstrap + Evidence Core + Drivers base (H0, H2, H3 parcial)
- [ ] T0.1 `verification/` scaffold: package.json, tsconfig, vitest, scripts (`verify`, `uat`).
- [ ] T0.2 Core types (Scenario, Step, OracleResult, Verdict, EvidenceRef) + ScenarioLoader (YAML).
- [ ] T0.3 EvidenceStore: bundle layout, runId, events.jsonl, hashes.sha256, inmutabilidad.
- [ ] T0.4 EnvironmentProbe + GitProbe (VAH-007/008).
- [ ] T0.5 ProcessDriver + CliDriver + FilesystemDriver (temp workspace, tree, hashes, before/after) con timeout/redaction.
- [ ] T0.6 Runner mínimo + scenario trivial `verification/scenarios/trivial.yaml` → run.json (AC-1).
- [ ] T0.7 Tests unitarios del core + architecture test (0 imports de verification/ en producción).

### B1 — Browser + Oracles + Debug (H3/H4/H5)
- [ ] T1.1 BrowserDriver (Playwright): launch, navigate, fill/click, download capture, trace/screenshot/console/pageerror.
- [ ] T1.2 Oracles: Schema, SemanticJson (canonical recursivo NFC + ignoredPaths con reason), FilesystemTree, FileContent, Golden, Browser, CrossLanguage.
- [ ] T1.3 Verdict/report (machine JSON + markdown) con refs requirement/scenario/step/oracle (VAH-023).
- [ ] T1.4 Diff expected-vs-actual + debug plane on failure (VAH-010/011).
- [ ] T1.5 Tests unitarios oracles/drivers.

### B2 — Traceability (H1)
- [ ] T2.1 Schema del registry (IDs estables VAH-002) + builder desde roadmap/uat/changes.
- [ ] T2.2 Inventario M0–M10.2 + vinculación UAT existentes + detección de IDs rotos.
- [ ] T2.3 Coverage matrix (MAPPED/UNMAPPED) + report.

### B3 — H6 before (audit real UAT-M10-04)
- [ ] T3.1 `SCN-M10-04-001` en `verification/scenarios/` (workspace.prepare → cli.create → ui.create → oracles).
- [ ] T3.2 Ejecución real: CLI Python + preview server + Playwright Chromium.
- [ ] T3.3 Registrar verdict baseline (se espera FAIL por exploración) + evidence bundle before.
- [ ] T3.4 Documentar false-green exacto (tests que afirmaban equivalencia sin ejecutarla).

### B4 — Corrección de producción (PR-1..PR-5, fuera de verification/)
- [ ] T4.1 PR-1 CreateWizard: render real + RecipePlanEmitter (manifest/skeleton/sha reales, sin require()).
- [ ] T4.2 PR-2 FileSystemAccessSink: escribir renderizado + plan emitido.
- [ ] T4.3 PR-3 equivalenceOracle.ts: canonicalización recursiva igual a Python.
- [ ] T4.4 PR-4 templateEngine.spec.ts: leer fixtures reales.
- [ ] T4.5 PR-5 roundtrip.spec.ts / test_roundtrip.py: claims honestos (unitarios); equivalencia → Harness.

### B5 — H6 after
- [ ] T5.1 Re-ejecutar SCN-M10-04-001 → evidence bundle after.
- [ ] T5.2 Informe before/after + verdict final (PASS esperado; FAIL documentado si persiste).
- [ ] T5.3 `narrative init --plan` sobre el plan UI (productor CLI consume plan UI) verificado.

### B6 — Docs + cierre
- [ ] T6.1 Glossary/roadmap/README updates + MANIFEST regen si aplica.
- [ ] T6.2 Receipts del ciclo + handoff notes.

## Coverage Matrix

| REQ | Tasks | AC |
|---|---|---|
| VAH-001 | T0.7 | AC-1 |
| VAH-002/003 | T2.1–T2.3 | AC-2 |
| VAH-004/005 | T0.2, T0.6, T3.1 | AC-1, AC-7 |
| VAH-007/008/014/025 | T0.3, T0.4 | AC-3 |
| VAH-009/011/022 | T0.5 | AC-4 |
| VAH-010 | T1.1, T1.4 | AC-4, AC-6 |
| VAH-012/013/021 | T1.2, T3.1, T3.3 | AC-5, AC-7 |
| VAH-023 | T1.3 | AC-3, AC-6 |
| PR-1..PR-5 | T4.1–T4.5, T5.1–T5.3 | AC-8 |
