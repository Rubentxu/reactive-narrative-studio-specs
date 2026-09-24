# Spec — m10-traceability-closure (deuda técnica, regla CIERRE REAL)

**Cycle**: `p-7c4aff45199a2069/m10-traceability-closure`
**Fuente**: deuda técnica acumulada — requisitos implementados pero no verificables por el registry (UNMAPPED/PARTIALLY_VERIFIED en audit all) + un gap real de defaults que el cierre destapó.

## Requisitos

| REQ | Enunciado |
|---|---|
| REQ-TC-01 | El harvest de trazabilidad no emite ids fantasma por prosa wildcard ("REQ-XX-*"). |
| REQ-TC-02 | `SCN-M10-01-001` ejecutable: contrato de recetas end-to-end (validate.py, plan con defaults, pytest, scan AST anti-script, greps no-write/no-fetch, /create en navegador) citando REQ-CR-7/8/10/11/12. |
| REQ-TC-03 | Tests estructurales de los schemas de proyección CP citando REQ-CP-001..007 (incl. $ref reachability — que destapó que cp-decisions no estaba en $defs). |
| REQ-TC-04 | `narrative inspect --json` implementado según specs/inspect.schema.json + tests de contrato CLI citando REQ-CLI-001..007. |
| REQ-TC-05 | Defaults de parámetros declarados (REQ-CR-10) aplicados en AMBOS runtimes (Python apply_schema_defaults + TS applySchemaDefaults) — el oráculo de equivalencia cross-runtime de SCN-M10-04-001 lo exige byte a byte. |
| REQ-TC-06 | Niveles de verificación declarados y honestos para todos los requisitos cerrados. |

## Criterios de aceptación
- audit all: PASS_WITH_WAIVER — proven 66 / waived 1 (waiver preexistente) / blocking 0 / cero UNMAPPED o PARTIALLY.
- canonical verify 10/10 (incluye SCN-M10-01-001 y SCN-M10-04-001 con defaults en ambos runtimes).
- control-plane 275/275 · pytest 56/56 · harness 56/56 · tsc limpio.
