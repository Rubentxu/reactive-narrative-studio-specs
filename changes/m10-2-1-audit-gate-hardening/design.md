# Design — m10-2-1-audit-gate-hardening (H9 + H10)

## D1 — Audit Gate (`src/audit/audit.ts`)

Entradas: registry (H8) + evidencia histórica + waivers + niveles declarados.

```
audit milestone <id>      → requisitos del milestone
audit range <a>..<b>      → milestones del rango (inclusive)
audit flakiness           → clasificación histórica por scenario
audit retention           → integridad de bundles retenidos
```

Status por requisito (decisión explícita, sin heurísticas ocultas):
- `PROVEN`: nivel `functional` → existe scenario con último verdict `PASS` (o `PASS_WITH_WAIVER` con waiver registrado); nivel `fitness` → tiene testRefs.
- `PARTIALLY_VERIFIED`: nivel `functional` con solo testRefs.
- `WAIVED`: sin evidencia suficiente pero con waiver que cubre el requisito.
- `FAILED`: último verdict de un scenario suyo es `FAIL` sin waiver.
- `UNMAPPED`: sin refs.

Veredicto del gate: `PASS` (0 bloqueantes) | `PASS_WITH_WAIVER` (todos los bloqueantes waived) | `FAIL`. Exit 0/0/1 (el segundo con aviso en stdout). Salida: JSON machine + markdown (`verification/audit/<target>.json|.md`).

## D2 — `requirement-levels.json`

```json
{ "REQ-VAH-BASELINE": { "level": "fitness", "rationale": "..." }, ... }
```
Default `functional` para no listados (estricto). Validación: nivel válido + requisito existente en registry + rationale no vacío. Fichero malformado → error duro (nunca ignorar silenciosamente).

## D3 — JUnit + CI

- `runOne` escribe `junit.xml` en el bundle (`artifacts/junit.xml`) — opcional por VAH-024 pero barato; `runAll` agrega `evidence/junit-all.xml` con un testsuite por scenario.
- `.github/workflows/verification.yml`: python deps + pytest; control-plane install + tsc + vitest; verification install + tsc + vitest + playwright chromium + `verify`; upload de evidence/traceability/junit/audit como artifacts; auditorías: `audit milestone M10.2.1` bloqueante, `audit range M10.1..M10.2` `continue-on-error: true` (backlog reportado, no rompe CI histórica).

## D4 — Integridad de evidencia

- `verify-evidence <bundle>`: parsea `hashes.sha256`, recomputa SHA-256 de cada fichero listado, valida presencia de `run.json`,`verdict.json`,`events.jsonl`; reporta missing/hash-mismatch/untracked; exit 1 si hay problemas.
- `audit retention`: descubre `changes/*/evidence/*/hashes.sha256` y aplica la misma verificación; consolida resultado por release.

## D5 — Flakiness

Escanear `verification/evidence/*/artifacts/verdict.json` → agrupar por `scenarioId` → contar PASS/FAIL/PASS_WITH_WAIVER. `FLAKY` si hay ≥1 PASS y ≥1 FAIL; `STABLE_PASS`/`STABLE_FAIL`/`WAIVED_ONLY` en el resto. Reporte con `lastRunId`.

## D6 — Hardening tests (`test/hardening.spec.ts`)

- corrupt evidence: bundle → tamper artifact → `verifyEvidences([dir])` falla con hash mismatch.
- dirty tree: repo git temporal con fichero modificado → `probeGit` dirty=true + dirtyFiles.
- redaction a nivel proceso: ProcessDriver ejecuta un comando que imprime `TOKEN=...` → artifact stdout redactado.
- parallel isolation: dos ejecuciones concurrentes del bootstrap scenario (procesos separados) → ambos PASS, runIds y bundles distintos.
- flakiness: bundles sintéticos (PASS, FAIL) → FLAKY; (PASS) → STABLE_PASS.
