# Spec — m10-2-1-audit-gate-hardening (H9 + H10)

**Cycle**: `p-7c4aff45199a2069/m10-2-1-audit-gate-hardening`
**Fuente canónica**: `docs/reactive-narrative-studio-openspec-evolutives/changes/m10-2-1-verification-audit-harness/tasks.md` (H9, H10) + spec VAH-003/015/020/024.

## Scope

- **H9** — CI Audit Gate: canonical verify, `audit milestone|range`, artifacts CI (JUnit + JSON + markdown), fail gate, retención de evidence de release.
- **H10** — Hardening: negative tests, corrupt-evidence, dirty-tree, secret redaction a nivel proceso, parallel isolation, flaky classification.
- Fuera de scope: cualquier feature de producto; M10.3.

## Requisitos en scope

| REQ | Enunciado | Horizonte |
|---|---|---|
| REQ-VAH-AUDIT-GATE | Un Audit Gate MUST derivarse de trazabilidad + evidence (no de commits ni claims): `audit milestone <id>` y `audit range <a>..<b>` agregan requisitos + último verdict por scenario + waivers; `UNMAPPED`/`PARTIALLY_VERIFIED`/`FAILED` bloquean salvo waiver aplicable; exit code refleja el veredicto (VAH-003/020). | H9 |
| REQ-VAH-VERIFICATION-LEVEL | Un requisito MUST poder declarar su nivel de verificación (`functional` exige scenario PASS; `fitness` admite test de componente). Default `functional` (estricto). Un requisito funcional verificado solo por test queda `PARTIALLY_VERIFIED` y bloquea (VAH-003/006). | H9 |
| REQ-VAH-CI-ARTIFACTS | CI MUST ejecutar los gates de calidad y `verify` (uat all) como bloqueantes, emitir JUnit + JSON + markdown, publicar los bundles como artifacts y ejecutar las auditorías de milestones (VAH-024). | H9 |
| REQ-VAH-EVIDENCE-INTEGRITY | `verify-evidence <bundle>` MUST recomputar SHA-256 vs `hashes.sha256` y validar ficheros obligatorios; corruptela o tamper MUST fallar con detalle. `audit retention` MUST verificar los bundles retenidos en `changes/*/evidence/` (VAH-025). | H10 |
| REQ-VAH-HARDENING | Deben existir tests negativos de: evidencia corrupta, dirty tree, redaction de secretos en proceso capturado, aislamiento entre ejecuciones concurrentes (bundles/runIds distintos) y clasificación de flakiness (VAH-009/014/022). | H10 |

## Criterios de aceptación

- **AC-1**: `audit milestone M10.2.1` sale **PASS** (todos sus requisitos PROVEN/WAIVED con niveles declarados); `audit milestone M10.1` sale **FAIL** con sus `REQ-CR-*` listados como UNMAPPED (backlog honesto, sin maquillar) y exit code 1.
- **AC-2**: `requirement-levels.json` valida (nivel ∈ {functional, fitness}, requisito existe en el registry) y se aplica en el veredicto del gate (fitness+test = PROVEN; functional+test = PARTIALLY_VERIFIED bloqueante).
- **AC-3**: `pnpm verify` emite JUnit XML (por run y agregado) además de verdict.json/report.md; workflow CI en `.github/workflows/verification.yml` con gates bloqueantes + auditorías + upload de artifacts.
- **AC-4**: `verify-evidence` detecta un artefacto manipulado (hash mismatch) y ficheros obligatorios ausentes; `audit retention` verifica los bundles archivados en `changes/*/evidence/`.
- **AC-5**: tests de hardening: corrupt-evidence, dirty-tree (repo temp), redaction a nivel proceso, dos scenarios concurrentes con runIds/bundles aislados, flakiness clasificada (PASS+FAIL históricos = FLAKY; solo PASS = STABLE).
- **AC-6**: quality gates verdes y `uat all` 3/3 sin regresión.
