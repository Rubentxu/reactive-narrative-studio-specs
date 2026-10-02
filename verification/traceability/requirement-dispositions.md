# Requirement dispositions — mapa normativo de los gaps `requirement-unowned`

## 1. Propósito

Este documento es el hijo normativo de **REQ-DEI-9** (ciclo `unowned-disposition`): define la
disposición de cada área de requisitos cosechada que ningún mapeo de área ni override individual
asigna a un milestone del inventario. El mapa machine-readable hermano
(`requirement-dispositions.json`) se carga en `verification/src/traceability/build.ts`
(`loadRequirementDispositions`) y se inyecta en el `detail` de cada gap `requirement-unowned`
producido por el guard de silent-drop (**REQ-DEI-8**, `changes/debt-evidence-integrity/spec.md:150-165`),
con el sufijo `; disposition: <clave> (<nota>) — see requirement-dispositions.md`.

Principios:

- **Visible pero auto-explicado (REQ-DEI-8):** la disposición es una anotación en el `detail` del
  gap, no cobertura. Ninguna área se mapea al inventario salvo con evidencia real; un mapeo sin
  evidencia produciría `UNMAPPED`/`PARTIALLY_VERIFIED` (blocking) y haría fallar el audit gate
  (`verification/src/audit/audit.ts:137-146,196`).
- **Taxonomía cerrada:** solo las 4 claves de la §2 son válidas; el loader rechaza cualquier otra
  con error explícito, y el mapa ausente o malformado es un fallo duro de `traceability build`.
- **Procedencia real, no atribución de comodín:** la clasificación refleja de dónde procede cada
  área según el análisis de fuentes del ciclo `unowned-disposition` (exploración §2.3). **Ninguna
  área procede de las eras pre-harness m2–m9**: todas las fuentes son ciclos m10–m16,
  `debt-resolution-process` y `spec-completion`.
- **No cosechado:** este documento y su JSON viven en `verification/traceability/`, fuera de los
  árboles de cosecha (`changes/**.md` + `docs/**.md`, `build.ts:151-152`); sus menciones a ids REQ
  no crean fuentes espurias ni gaps nuevos.

## 2. Taxonomía de disposición

| Clave | Definición honesta |
|---|---|
| `cycle-prose-unmapped` | Requisito declarado en prosa de ciclo (spec/design/tasks o evidencia de ciclo) sin mapeo de área en el inventario UAT-gated; su entrega fue aceptada por el proceso del propio ciclo (AC/escenarios propios). No es deuda accionable del roadmap vigente; se mantiene visible como gap LOW para que ninguna reaparición silenciosa pase inadvertida. |
| `deliberate-inventory-exclusion` | Exclusión deliberada y documentada del inventario: mapear el área introduciría ruido (p. ej. requisitos como UNMAPPED) o duplicaría un control que ya vive en otro contrato. La exclusión está justificada en el código o en el ciclo que la decidió. |
| `implemented-out-of-inventory` | El requisito está implementado y su control existe fuera del inventario (schema, componente, prueba), pero no se registró un deferral documentado previo en su momento; la disposición declara ese estado real en lugar de citar una deferral inexistente. |
| `mapped-with-evidence` | Requisito mapeado al inventario en el ciclo `unowned-disposition` (REQ-DEI-10) con evidencia real verificable (test refs de componente y/o veredicto PASS de escenario retenido). Ejercita la propiedad del orquestador DEBT-DEI-1 (`changes/debt-evidence-integrity/spec.md:21,34`). |

## 3. Disposición por área (25 áreas, 107 gaps vigentes)

Recuento de gaps `requirement-unowned` por área tras aplicar REQ-DEI-10 (REQ-M11-5/6 mapeados):
CPS 3 · DEC 3 · DOC 3 · EVT 5 · EXR 3 · EXT 2 · FEX 3 · GFC 6 · INV 5 · LOA 2 · MP 6 · PAC 3 ·
PLP 5 · PROJ-VAL 6 · RDP 6 · ROU 5 · SA 7 · SAS 7 · SID 4 · SKILL 4 · SVP 3 · TC 6 · VAULT 5 ·
VOCAB 5. El área M11 queda sin gaps vigentes (los 2 mapeados).

| Área | Disposición | Procedencia real (ciclo/documento que la cita) | Nota |
|---|---|---|---|
| CPS | `deliberate-inventory-exclusion` | `cp-foundation`, `cp-catalog-entities` (M10/M10.2) | Exclusión deliberada del inventario (`build.ts:315-321`): una regla de área CPS pondría REQ-CPS-* como UNMAPPED; el control de REQ-CPS-1..3 son los AC-14.1..14.3 de `changes/cp-foundation/spec.md:267-269`. |
| DEC | `implemented-out-of-inventory` | `m16-cp-studio-search-docs` (+ `docs/19-ROADMAP.md`, `docs/27-GLOSSARY.md`, `docs/32-NARRATIVE-DOCS-SEARCH.md` para DEC-1) | Implementados en m16: `specs/cp-decisions.schema.json` existe y `control-plane/src/loader/SnapshotProjectSource.ts:207,222` lee `cp-decisions.json`; sin documento de deferral previo, control fuera del inventario. |
| DOC | `cycle-prose-unmapped` | `m16-cp-studio-search-docs` + `backlog-contract-hygiene` + `m10-2-1-crossref-render` + `m16-doc-entity-links` | REQ-DOC-6 es artefacto de prosa (ver §4); REQ-DOC-1/2 implementados con testRefs vigentes; solo REQ-DOC-3/4/5 tienen overrides individuales (`build.ts:322-325`). |
| EVT | `cycle-prose-unmapped` | `spec-completion` | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| EXR | `cycle-prose-unmapped` | `m16-cp-studio-search-docs` | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| EXT | `cycle-prose-unmapped` | `m16-cp-studio-search-docs` | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| FEX | `cycle-prose-unmapped` | `cp-foundation`, `cp-catalog-entities` (M10/M10.2) | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| GFC | `cycle-prose-unmapped` | `cp-foundation` + `m16-cp-studio-search-docs` | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| INV | `cycle-prose-unmapped` | `spec-completion` | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| LOA | `cycle-prose-unmapped` | `m16-cp-studio-search-docs` | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| MP | `cycle-prose-unmapped` | `m10-3-multi-project-studio` | Prosa de `m10-3-multi-project-studio`; `verification/scenarios/scn-m10-05-001.yaml:3` cita REQ-MP-1/3/4/5 con PASS retenido; mapeo pendiente de decisión de inventario (ver §4 — M10.3 no existe en `MILESTONE_LABELS`). |
| PAC | `cycle-prose-unmapped` | `debt-resolution-process` (v0.24.x) | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| PLP | `cycle-prose-unmapped` | `cp-foundation`, `cp-catalog-entities` (M10/M10.2) | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| PROJ-VAL | `cycle-prose-unmapped` | `spec-completion` | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| RDP | `cycle-prose-unmapped` | `debt-resolution-process` (v0.24.x) | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| ROU | `cycle-prose-unmapped` | `m16-cp-studio-search-docs` | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| SA | `cycle-prose-unmapped` | `m12-sequential-art-core` (M12) | Prosa de `m12-sequential-art-core`; `verification/scenarios/scn-m12-01-001.yaml:3` cita REQ-SA-1..4/6 con PASS retenido; mapeo pendiente de decisión de inventario (ver §4). |
| SAS | `cycle-prose-unmapped` | `cp-foundation`, `cp-catalog-entities` (M10/M10.2) | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| SID | `cycle-prose-unmapped` | `m16-cp-studio-search-docs` | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| SKILL | `cycle-prose-unmapped` | `spec-completion` | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| SVP | `cycle-prose-unmapped` | `cp-foundation`, `cp-catalog-entities` (M10/M10.2) | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| TC | `cycle-prose-unmapped` | `m10-traceability-closure` | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| VAULT | `cycle-prose-unmapped` | `spec-completion` | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| VOCAB | `cycle-prose-unmapped` | `spec-completion` | Declarado en prosa de ciclo (spec/design/tasks) sin mapeo de área; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente. |
| M11 | `mapped-with-evidence` | `m11-human-reader-uat` + `debt-evidence-integrity` | REQ-M11-5/6 mapeados al inventario en el ciclo `unowned-disposition` con evidencia real (INC-008/INC-015 y SCN-M11-01-001); ver §4. |

## 4. Notas específicas por área

### CPS — exclusión deliberada

La regla es normativa en el código: `verification/src/traceability/build.ts:315-321` — *"The DOC and
CPS areas have no heuristic mapping (and must not: an area rule for CPS would pull REQ-CPS-* into
the inventory as UNMAPPED)"*. El control real de los requisitos del área es el propio ciclo
`cp-foundation`: sus AC-14.1..14.3 (`changes/cp-foundation/spec.md:267-269`) verificación del
contrato, anterior a la adopción del inventario UAT-gated. Mapear el área hoy convertiría
REQ-CPS-1..3 en UNMAPPED (blocking) sin añadir ninguna garantía nueva.

### DOC — prosa, implementados y overrides conviven

- **REQ-DOC-6** es un artefacto de prosa: el ciclo `backlog-contract-hygiene` desaconsejó
  expresamente declararlo (`changes/backlog-contract-hygiene/spec.md:7` — declararlo crearía un gap
  `requirement-unowned` LOW nuevo que ensuciaría el audit); el harvester recogió la mención
  explicativa y por eso aparece como gap.
- **REQ-DOC-1 y REQ-DOC-2** están implementados con testRefs vigentes
  (`control-plane/test/docs-sanitization.spec.ts:6,78,156` y `control-plane/test/search.spec.tsx:9`)
  pero sin mapeo de área, porque solo existen overrides individuales REQ-DOC-3/4/5
  (`build.ts:322-325`).
- El deferral documentado de DOC-1/2 vive en `changes/m10-2-1-crossref-render/spec.md:38`.

### DEC — implementados en m16, sin deferral previo (honestidad documental)

REQ-DEC-1..3 fueron declarados por `m16-cp-studio-search-docs` (`spec.md:155,167,178`) y están
**implementados**: `specs/cp-decisions.schema.json` existe y
`control-plane/src/loader/SnapshotProjectSource.ts:207,222` lee `cp-decisions.json`. No existe un
documento de deferral previo; esta disposición declara el estado real ("implementado, control fuera
del inventario") en lugar de citar una deferral inexistente.

### M11 — mapeado con evidencia real (REQ-DEI-10)

REQ-M11-5 (fitness) y REQ-M11-6 (functional) se mapean al inventario M11 en el ciclo
`unowned-disposition`, ejercitando la propiedad del orquestador DEBT-DEI-1
(`changes/debt-evidence-integrity/spec.md:21,34`). Evidencia:

- REQ-M11-5 — cierres de INC del ciclo `m11-human-reader-uat`
  (`changes/m11-human-reader-uat/spec.md:20`): INC-008 (oráculo de aislamiento, citado en
  `control-plane/test/extension-isolation.spec.ts`) e INC-015 (fallback de negative-fixtures,
  ejercitado por el nuevo `tools/validate-recipes/tests/test_validate.py`). Nivel `fitness`
  (`requirement-levels.json`): PROVEN por test refs.
- REQ-M11-6 — el propio requisito exige un escenario ejecutable
  (`changes/m11-human-reader-uat/spec.md:21`): `verification/scenarios/scn-m11-01-001.yaml` lo cita
  y el veredicto PASS vigente (bundle retenido, sin re-ejecución) lo prueba.

### SA y MP — evidencia de escenario retenida, mapeo pendiente de decisión de inventario

`verification/scenarios/scn-m12-01-001.yaml:3` cita REQ-SA-1..4/6 y
`verification/scenarios/scn-m10-05-001.yaml:3` cita REQ-MP-1/3/4/5, con veredictos PASS retenidos.
A pesar de esa evidencia, este ciclo NO los mapea: (a) mapear los REQ-MP exigiría crear el label
`M10.3` en `MILESTONE_LABELS` (`build.ts:66-88`), que no existe — decisión estructural del
inventario fuera de un ciclo de triage LOW; (b) mapear REQ-SA-1..6 a M12 sería viable en evidencia,
pero ningún ciclo ha tomado esa decisión de inventario. **Advertencia (REQ-DEI-9 AC-5):** mapear
sin decidir y sin test refs/escenario registrado produciría UNMAPPED/PARTIALLY_VERIFIED (blocking)
y haría fallar el audit gate (`audit.ts:137-146,196`); la decisión futura parte de esta tabla, no
de una premisa corregida.

## 5. Mantenimiento

Refinar la disposición de un área es una edición de `requirement-dispositions.json` + este
documento, no de código (el loader valida la taxonomía y la nota no vacía en cada
`traceability build`). Una área nueva que aparezca como gap sin entrada en el mapa conserva el
`detail` crudo: el guard REQ-DEI-8 conserva su sentido y la ausencia de disposición es visible.
