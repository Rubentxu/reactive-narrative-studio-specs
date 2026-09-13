# Spec — m11-human-reader-uat (M11)

**Cycle**: `p-7c4aff45199a2069/m11-human-reader-uat` (fase specify retomada del ciclo abierto el 2026-08-31)
**Fuentes**: `uat/UAT-M11-01.md`; `docs/19-ROADMAP.md` § M11; `docs/17-QUALITY-VALIDATION.md` (subjective/human class); `docs/22-SECURITY-RIGHTS.md` (child-reader privacy: IDs anónimos, sin PII, feedback borrable); `docs/adrs/ADR-019-synthetic-readers.md` (synthetic ≠ human UAT, almacenamiento separado); `docs/18-UAT-STRATEGY.md` (familia Reader UAT ausente en CP); propose previo `cycle-artifacts/m11-human-reader-uat/proposal.md`.

## Scope

Formulario anónimo de feedback de lector humano en `/reader-uat` (feature folder nº 8 `features/human-reader/`) con export JSONL de ronda; cierre de los INCs de carry-forward (INC-015, INC-008 residual, INC-016 verificado); UAT-M11-01 **ejecutable** vía el harness (SCN-M11-01-001).

**Fuera de scope**: persistencia de feedback (el JSONL descargado ES el artefacto), paneles sintéticos (ADR-019), multi-proyecto, skills `reader_uat` (sigue siendo design-intent), escritura al proyecto.

## Requisitos

| REQ | Enunciado |
|---|---|
| REQ-M11-1 | El formulario `/reader-uat` MUST aceptar envío sin ningún campo PII: ningún campo personal es requerido y un submit completamente vacío MUST producir una entrada válida. |
| REQ-M11-2 | El submit MUST producir un round-report JSONL descargable (Blob + `<a download>`, sin fetch) con `schema`, `roundId`, `readerId` anónimo, métricas Likert 1..5 opcionales, `freeTextHighlights`, `revisionImpact`, `manuscriptRevision` opcional y `submittedAt`; el report MUST quedar ligado a la decisión de revisión (`revisionImpact` + `manuscriptRevision`). |
| REQ-M11-3 | La persistencia MUST limitarse a `useState` (estado de página) + `sessionStorage` para el `readerId` efímero; prohibidos `localStorage`, IndexedDB, Dexie y Orama; el feature folder MUST NOT importar `useProjectionStore` (no escribe al proyecto). |
| REQ-M11-4 | El feedback humano MUST mantenerse separado del output de lectores sintéticos (ADR-019): la UI lo etiqueta explícitamente como Human Reader UAT y el artefacto lleva marcador de origen humano; no se escribe en ninguna base de datos. |
| REQ-M11-5 | Carry-forward INCs: INC-015 — `validate.py --negative-fixtures` sin argumento MUST encontrar los fixtures (fallback recursivo); INC-008 residual — los greps de `extension-isolation.spec.ts` MUST cubrir `recipes` y `human-reader`; INC-016 — verificado ya resuelto por v0.11.0 (PR-1) y cerrado con evidencia en el vault. |
| REQ-M11-6 | UAT-M11-01 MUST ser ejecutable: scenario real (build+preview+browser) que complete una ronda, capture el JSONL descargado y verifique su forma + ausencia de PII requerida + separación de sintéticos + cero bases de datos creadas. |

## Criterios de aceptación

- **AC-1**: `SCN-M11-01-001` PASS: navegar `/reader-uat`, verificar etiqueta Human Reader UAT, enviar el formulario **vacío** (submit válido), capturar la descarga JSONL y validar la entrada (roundId/readerId anónimos, revisionImpact, sin campos PII).
- **AC-2**: Segunda ronda en el mismo tab conserva el `readerId` de sesión; el JSONL de ambas rondas usa el mismo `readerId` (probe por evaluate).
- **AC-3**: Tras usar `/reader-uat` no existe ninguna base IndexedDB (probe `indexedDB.databases()` vacío) y el feature folder no importa `useProjectionStore` ni APIs prohibidas (grep oracle + test de isolación).
- **AC-4**: Una entrada con Likert parcial/freeText/highlights y `manuscriptRevision` serializa correctamente (tests unitarios del serializador JSONL).
- **AC-5**: `python tools/validate-recipes/validate.py --negative-fixtures` sin argumento sale 0 (INC-015); `extension-isolation.spec.ts` cubre `recipes|human-reader` (INC-008); INC-016 cerrado en el vault con referencia a v0.11.0.
- **AC-6**: Quality gates verdes y `verify` sin regresión (4 scenarios previos siguen PASS).
