# Spec — m10-2-1-verification-audit-harness (slice H0→H6)

**Cycle**: `p-7c4aff45199a2069/m10-2-1-verification-audit-harness`
**Fuente canónica del change**: `docs/reactive-narrative-studio-openspec-evolutives/changes/m10-2-1-verification-audit-harness/{proposal,design,spec,tasks}.md`
**Este documento**: recorte del spec VAH-001..VAH-025 al slice H0→H6, con criterios de aceptación verificables.

## Scope del slice

H0 Bootstrap → H1 Traceability → H2 Evidence Core → H3 Drivers → H4 Oracles → H5 Debug Plane → H6 M10.1 Audit (UAT-M10-04 real).

**Fuera de scope**: H7 (M10.2 Audit), H8 (baseline M0–M10.2), H9 (CI Audit Gate), H10 (hardening). Quedan para ciclos sucesores antes de M10.3.

## Requisitos en scope (del change spec)

| REQ | Enunciado | Horizonte |
|---|---|---|
| VAH-001 | El runtime productivo MUST NOT depender de `verification/` | H0 |
| VAH-002 | IDs estables para Requirement/UAT/Scenario/Oracle/Evidence/Waiver | H1 |
| VAH-003 | Requisito sin scenario = `UNMAPPED`; estado trazable por requisito | H1 |
| VAH-004 | UAT automatizable vinculado a scenarios ejecutables | H1, H6 |
| VAH-005 | Todo scenario declara `proves`/`doesNotProve` | H0 |
| VAH-007 | Evidence registra Git SHA; dirty tree indicado con diff/listado | H2 |
| VAH-008 | Environment capture: OS, Node, pnpm, Python, browser | H2 |
| VAH-009 | Proceso externo: command, cwd, exit code, stdout, stderr, timeout, secrets redactados | H3 |
| VAH-010 | Browser failure conserva trace, screenshot, console/page errors | H3, H5 |
| VAH-011 | UAT que crean proyectos permiten before/after comparison | H3 |
| VAH-012 | Equivalencia cross-runtime exige ejecutar ambos productores reales | H4, H6 |
| VAH-013 | Toda diferencia ignorada declarada y justificada | H4 |
| VAH-014 | Reejecución = nuevo runId; evidence histórica inmutable | H2 |
| VAH-021 | Scenario UI↔CLI que compara manifest, skeleton, profiles, packs, skills y publishing targets reales | H6 |
| VAH-022 | Entorno fresco por scenario (temp workspace) | H3 |
| VAH-023 | FAIL identifica requirement, scenario, step, oracle, expected, actual, evidence refs | H2 |
| VAH-025 | Hash criptográfico SHA-256 de artefactos relevantes | H2 |

## Requisitos de corrección de producción (fuera del Harness, exigidos por VAH-001/VAH-012)

El H6 destapa el estado real de UAT-M10-04. La corrección se hace en producción:

- **PR-1**: `CreateWizard.tsx` debe renderizar el skeleton con el template engine TS y emitir plan vía `RecipePlanEmitter` (manifest real, skeleton renderizado, `recipeLockSha256`, `createPlanSha256`); prohibido `require()` en código de browser.
- **PR-2**: `FileSystemAccessSink.ts` debe escribir el contenido renderizado y el plan emitido por el emisor, no plantillas crudas.
- **PR-3**: `equivalenceOracle.ts` debe canonicalizar con sort recursivo (equivalente a `equivalence_oracle.py`), sin normalizadores catch-all.
- **PR-4**: `templateEngine.spec.ts` debe leer los fixtures reales de `tools/narrative_recipes/tests/fixtures/mustache-subset/*.yaml` en lugar de copias a mano.
- **PR-5**: `roundtrip.spec.ts` (TS) y `test_round.py` (Python) dejan de afirmar equivalencia cross-language que no ejecutan: se reescaman como tests unitarios honestos (canonicalización local) y la equivalencia real pasa a ser responsabilidad del scenario `SCN-M10-04-001` del Harness.
- **PR-6** *(añadido tras la ejecución before del Harness)*: el rootRoute del router TanStack renderiza `SourcePicker` sin `<Outlet/>`, por lo que **ninguna ruta hija — incluida `/create` — llega a montarse**. El wizard es inalcanzable en la app real. Fix: layout de root con `<Outlet/>` y `SourcePicker` como ruta índice `/`. Evidencia: `evidence/before-run-fail-wizard-unreachable/` (screenshot `ui.navigate.png` muestra "Load Project" en `/create`; step `ui.fill` timeout).

## Requisitos nuevos definidos por este slice

- **REQ-VAH-BOOTSTRAP**: El Harness ejecuta steps reales contra un entorno temporal y emite un evidence bundle inmutable con verdict, events.jsonl y hashes SHA-256, sin depender del runtime productivo.
- **REQ-RECIPE-EQUIVALENCE**: Dadas las mismas respuestas (title, projectId, audience), el plan emitido por el wizard UI (Control Plane/TypeScript) y el plan emitido por el CLI (Python) son semánticamente equivalentes en todos los campos recipe-owned (manifest, skeleton: paths + contenidos renderizados, perfiles, packs, skills, publishing targets); la equivalencia se demuestra ejecutando ambos productores reales (VAH-012/VAH-021).

## Criterios de aceptación del slice

- **AC-1 (H0)**: `verification/` corre un scenario trivial y emite `run.json` con runId, verdict y evidence refs. Producción no importa nada de `verification/` (grep de imports = 0).
- **AC-2 (H1)**: Traceability Registry Git-native lista los requisitos M0–M10.2 conocidos; UAT existentes vinculados; IDs rotos detectados; coverage matrix generada con estados `MAPPED`/`UNMAPPED`.
- **AC-3 (H2)**: Cada run produce bundle inmutable con SHA-256, environment probe (OS/Node/pnpm/Python/browser), git probe (SHA + dirty), events.jsonl, verdict.json con refs de evidence; rerun = runId nuevo.
- **AC-4 (H3)**: Drivers Process/Cli/Filesystem/Git/Browser operativos con timeout y redaction; browser driver captura trace/screenshot/console errors en fallo.
- **AC-5 (H4)**: Oracles Schema/SemanticJson/Golden/FilesystemTree/FileContent/Browser/CrossLanguage con clasificación y claims (`proves`/`doesNotProve`).
- **AC-6 (H5)**: FAIL de cualquier step produce diff expected-vs-actual + artifacts de debug (trace, screenshots, console errors, stdout/stderr).
- **AC-7 (H6, el objetivo)**: `SCN-M10-04-001` ejecuta el CLI Python real y el wizard `/create` real (Playwright Chromium), compara manifest recipe-owned (semantic-json) + skeleton tree + file content, y emite verdict PASS o FAIL con evidence completa. El resultado (cualquiera que sea) queda registrado como baseline before/after de la corrección de producción.
- **AC-8**: Si el audit H6 devuelve FAIL por defectos de producción (esperado según exploración), se corrigen PR-1..PR-5 y se re-ejecuta conservando evidence before/after; el false-green queda documentado en el informe del ciclo.
