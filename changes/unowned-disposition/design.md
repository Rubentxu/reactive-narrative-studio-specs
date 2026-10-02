# Design — unowned-disposition (disposición normativa de los 109 gaps `requirement-unowned` + mapeo REQ-M11-5/REQ-M11-6 con evidencia real)

**Ciclo**: `p-de82af3e9774d9a0/unowned-disposition` · **Rama**: `feat/unowned-disposition` · **Base**: `82b660a0015565f57982f8ad0ec9748329d6165e` (v0.24.1)
**Entradas**: `specification.md` (REQ-DEI-9, REQ-DEI-10, AC-1..AC-5/AC-1..AC-4, nota de alcance) y `exploration-report.md` §1–§7 de este ciclo. Cada hecho citado aquí fue verificado en esta sesión de diseño leyendo el código real o ejecutando comandos; se indica `fichero:línea`.

---

## 1. Decisiones de diseño (y por qué)

**D1 — Mapa por ÁREA consumido por `buildRegistry` (exploración §4-A), no por requisito.** La disposición vive en `verification/traceability/requirement-dispositions.json` (clave = segmento de área del REQ id) y se inyecta en el `detail` del gap. Un mapa por requisito (109 entradas) envejece mal ante cambios de cosecha y no aporta nada sobre el mapa por área + procedencia en el doc hermano. No se introducen módulos, orquestadores ni almacenes nuevos: el loader replica el criterio ya probado de `loadRequirementLevels` (`verification/src/audit/audit.ts:43-58`) y el consumo ocurre en el único punto que ya construye gaps (`verification/src/traceability/build.ts:239-250`).

**D2 — El enriquecimiento NO toca `findUnownedRequirements`.** La función pura exportada (`build.ts:370-379`) conserva su firma `{reqId, sources}[]`; el sufijo de disposición se aplica en el `.map()` de ensamblado del gap (`build.ts:239-250`) mediante un nuevo helper puro exportado `unownedGapDetail`. Así `verification/test/unowned-requirements.spec.ts` queda en verde **sin cambios de aserciones** (REQ-DEI-9 AC-3 del spec) y la lógica del sufijo es testeable sin tocar el repo real.

**D3 — Taxonomía cerrada y validada en carga.** Las 4 claves (`cycle-prose-unmapped`, `deliberate-inventory-exclusion`, `implemented-out-of-inventory`, `mapped-with-evidence`) se convierten en enum normativo: el loader rechaza con error explícito cualquier otra clave. Sin esto, una clave mal escrita enriquecería el gap con una disposición inexistente sin señal — exactamente la clase de silencio que REQ-DEI-9 prohíbe.

**D4 — Fallo duro si el mapa falta o es malformado** (spec REQ-DEI-9 AC-2). A diferencia de `loadRequirementLevels` (que devuelve Map vacío si el fichero no existe, `audit.ts:44`), aquí la ausencia ES error: el mapa es infraestructura obligatoria del guard una vez existente REQ-DEI-9; una ausencia silenciosa degradaría el guard sin señal.

**D5 — Derivación de área única.** La extracción de área para el lookup (`reqId.replace(/^REQ-/, '').replace(/-\d+.*$/, '')`, hoy en `build.ts:337`) se extrae a un helper exportado `areaOfRequirement` reutilizado por `reqBelongsToMilestone` y por el enriquecimiento. Elimina la duplicación en vez de añadirla (una línea, mismo fichero, comportamiento idéntico).

**D6 — Corrección del comentario falso en `build.ts:245-246`.** El comentario `// LOW: these are historical declarations outside every milestone inventory (pre-M10 eras mostly)` atribuye la procedencia a eras pre-M10, lo que la exploración §2.3 refutó con evidencia (ninguna área procede de changes m2–m9). Se corrige para referenciar el doc de disposiciones. Es un comentario, no comportamiento, pero dejarlo contradiría el artefacto normativo que este ciclo crea.

**D7 — Hallazgo de diseño no listado en la exploración: el test de INC-015 necesita una línea de CI.** `.github/workflows/verification.yml:33` ejecuta pytest sobre una lista explícita: `PYTHONPATH=tools:tools/narrative-cli pytest tools/narrative_recipes/tests tools/narrative-cli/tests -q`. Sin añadir `tools/validate-recipes/tests` a esa lista, el test nuevo (REQ-DEI-10 AC-3) no correría en T4/CI. Es un fichero de CI (harness), no código de producto — compatible con la restricción del ciclo.

**D8 — El test de INC-015 es de subprocess, no de import.** `validate.py` es un script con `main()` y estado de módulo (REPO_ROOT, `sys.exit(main())` en `:516`); el patrón probado del repo para CLI Python es subprocess con `sys.executable` (`tools/narrative-cli/tests/test_cli.py:10-20`). Al invocarlo con ruta absoluta de target, `(repo_root / args.path).resolve()` (`validate.py:405`) resuelve al path absoluto por semántica de `pathlib` — el test no depende del cwd ni del REPO_ROOT del script.

---

## 2. Componentes y ficheros a crear o tocar

| # | Fichero | Acción | Contenido exacto |
|---|---|---|---|
| F1 | `verification/src/traceability/build.ts` | Editar | (a) nuevo `export const DISPOSITION_KEYS = ['cycle-prose-unmapped','deliberate-inventory-exclusion','implemented-out-of-inventory','mapped-with-evidence'] as const;` + `export interface DispositionEntry { disposition: (typeof DISPOSITION_KEYS)[number]; note: string }`; (b) nuevo `export async function loadRequirementDispositions(repoRoot: string): Promise<Map<string, DispositionEntry>>` (contrato en §3.1); (c) nuevo `export function areaOfRequirement(reqId: string): string` (cuerpo exacto de `build.ts:337`), reutilizado en `reqBelongsToMilestone` (`:337`) y en el enriquecimiento; (d) nuevo `export function unownedGapDetail(entry: { reqId: string; sources: string[] }, dispositions: Map<string, DispositionEntry>): string` (contrato en §3.2), invocado desde el `.map()` de gaps en `:239-250`; (e) `'REQ-M11-5': 'M11', 'REQ-M11-6': 'M11',` añadidos a `REQ_MILESTONE_OVERRIDES` (`:322-330`, tras `'REQ-M11-4'`); (f) comentario `:245-246` corregido (D6) y comentario `:315-321` extendido con referencia a `verification/traceability/requirement-dispositions.md`; (g) `export function reqBelongsToMilestone` (pasa de local a exportada, sin cambio de cuerpo) para el test de REQ-DEI-10 |
| F2 | `verification/traceability/requirement-dispositions.json` | NUEVO | Mapa de las 25 áreas (contenido completo en §3.3) |
| F3 | `verification/traceability/requirement-dispositions.md` | NUEVO | Doc hermano normativo (estructura en §3.4) |
| F4 | `verification/scenarios/scn-m11-01-001.yaml` | Editar línea 3 | `requirements: [REQ-M11-1, REQ-M11-2, REQ-M11-3, REQ-M11-4, REQ-M11-6]` (hoy: `scn-m11-01-001.yaml:3` sin M11-6; verificado esta sesión) |
| F5 | `control-plane/test/extension-isolation.spec.ts` | Editar :60 (solo comentario) | `// Extended to include docs, capability-catalog, recipes and human-reader (M11/INC-008) — REQ-M11-5` — la cita literal `REQ-M11-5` en el fichero genera el testRef vía `build.ts:189` (include `control-plane/test/*.ts`) |
| F6 | `tools/validate-recipes/tests/test_validate.py` | NUEVO | Test pytest del fallback INC-015 con cabecera citando `REQ-M11-5` (contrato en §3.5). El path casa el include del harvester `tests?\/.*\.py$` (`build.ts:190`) |
| F7 | `.github/workflows/verification.yml` | Editar :33 | `PYTHONPATH=tools:tools/narrative-cli pytest tools/narrative_recipes/tests tools/narrative-cli/tests tools/validate-recipes/tests -q` (D7) |
| F8 | `verification/test/requirement-dispositions.spec.ts` | NUEVO | Tests de componente que citan `REQ-DEI-9` y `REQ-DEI-10` en el fichero (contrato en §3.6). Los ids literales en el fichero generan testRefs vía `build.ts:191` |
| F9 | `verification/traceability/requirement-levels.json` | Editar (solo añadir) | Tras la entrada `REQ-DEI-8` (`:338-341`), añadir `REQ-DEI-9` y `REQ-DEI-10` con `"level": "fitness"` y rationale ≥ 10 chars (validado por `audit.ts:49-55`). **Sin tocar** las entradas existentes — REQ-M11-5 (`:90-93`, fitness) y REQ-M11-6 (`:94-97`, functional) ya están declaradas (exploración §2 #10) |
| F10 | Regeneración (no editados a mano) | `node verification/src/index.ts traceability build` escribe `registry.json`, `coverage-matrix.md`, `baseline-m0-m10-2.md` (`verification/src/index.ts:245-256`); después `node verification/src/index.ts audit all` escribe `audit/all.json` + `audit/all.md` tras el guard de frescura (`index.ts:151-167`, `audit.ts:244-266`) |

**Explícitamente NO se toca**: `control-plane/src` (ningún fichero); cualquier otro yaml de escenario; `verification/traceability/waivers.json`; las 11 evidencias `verification/evidence/run-*` (reutilizadas sin re-ejecución); `docs/` (el doc normativo vive en `verification/traceability/`, fuera de los árboles cosechados `changes/**.md` + `docs/**.md`, `build.ts:151-152` — REQ-DEI-9 AC-4).

---

## 3. Contratos exactos

### 3.1 `loadRequirementDispositions(repoRoot)` — carga y validación (F1b)

- Lee `join(repoRoot, 'verification', 'traceability', 'requirement-dispositions.json')`.
- **Fichero ausente** → `throw new Error(`${path}: requirement-dispositions.json is missing — REQ-DEI-9 requires the area disposition map`)`. (D4; distinto de `loadRequirementLevels` en este punto, deliberadamente.)
- **JSON inválido** → `throw` con mensaje que nombra `path` e incluye el mensaje de parseo (mismo criterio que `audit.ts:252-253` para registry.json).
- **Cada entrada** `Record<area, {disposition, note}>`:
  - `disposition` no incluido en `DISPOSITION_KEYS` → `throw new Error(`${path}: area ${area} has invalid disposition "${String(cfg.disposition)}" (expected one of: ${DISPOSITION_KEYS.join('|')})`)`.
  - `note` ausente o vacío tras `trim()` → `throw new Error(`${path}: area ${area} needs a non-empty note`)`.
  - Claves extra del mapa sin gaps vigentes (p. ej. `M11` tras el mapeo) son legítimas: documentan estado, no error.
- Éxito → `Map<string, DispositionEntry>`.

### 3.2 `unownedGapDetail(entry, dispositions)` — sufijo del detail (F1d)

- Base verbatim (el texto actual de `build.ts:248`): `` `harvested from ${entry.sources.join(', ')} but no reqBelongsToMilestone area/override maps it to a milestone` ``.
- Si `dispositions.get(areaOfRequirement(entry.reqId))` existe → base + sufijo exacto:
  `` `; disposition: ${d.disposition} (${d.note}) — see verification/traceability/requirement-dispositions.md` ``
- Si no existe → base sin sufijo (REQ-DEI-9: áreas sin entrada conservan el detail actual; el guard REQ-DEI-8 conserva su sentido).
- Sin formato intermedio: el sufijo se compone de los literales `; disposition: `, ` (`, `) — see verification/traceability/requirement-dispositions.md`. La nota es breve (≤ ~160 chars; el texto normativo completo vive en el .md).
- Oráculo negativo ya verificado: ningún test aserta el texto del detail de gaps (grep `harvested from|no reqBelongsToMilestone` en `verification/test/`, `control-plane/test/`, `tools/` = solo 2 comentarios sin relación con aserciones) — el sufijo no rompe aserciones existentes.

### 3.3 `requirement-dispositions.json` — contenido de las 25 áreas (F2)

Formato: `{ "<AREA>": { "disposition": "<key>", "note": "<breve>" }, ... }`. Recuento verificado esta sesión con jq sobre `verification/traceability/registry.json`: **109 gaps, 25 áreas** (CPS=3 DEC=3 DOC=3 EVT=5 EXR=3 EXT=2 FEX=3 GFC=6 INV=5 LOA=2 M11=2 MP=6 PAC=3 PLP=5 PROJ-VAL=6 RDP=6 ROU=5 SA=7 SAS=7 SID=4 SKILL=4 SVP=3 TC=6 VAULT=5 VOCAB=5).

| Áreas | disposition | note (exacta) |
|---|---|---|
| **CPS** | `deliberate-inventory-exclusion` | `exclusion deliberada del inventario (build.ts:315-321): una regla de area CPS pondria REQ-CPS-* como UNMAPPED; el control de REQ-CPS-1..3 son los AC-14.1..14.3 de cp-foundation` |
| **DEC** | `implemented-out-of-inventory` | `implementados en m16 (specs/cp-decisions.schema.json; SnapshotProjectSource lee cp-decisions.json) sin documento de deferral previo; control fuera del inventario` |
| **DOC** | `cycle-prose-unmapped` | `REQ-DOC-6 es artefacto de prosa (backlog-contract-hygiene); REQ-DOC-1/2 implementados con testRefs vigentes; solo REQ-DOC-3/4/5 tienen overrides individuales` |
| **M11** | `mapped-with-evidence` | `REQ-M11-5/6 mapeados al inventario en el ciclo unowned-disposition con evidencia real (INC-008/INC-015 y SCN-M11-01-001); ejercita DEBT-DEI-1` |
| **SA** | `cycle-prose-unmapped` | `prosa de m12-sequential-art-core; scn-m12-01-001.yaml cita REQ-SA-1..4/6 con PASS retenido; mapeo pendiente de decision de inventario` |
| **MP** | `cycle-prose-unmapped` | `prosa de m10-3-multi-project-studio; scn-m10-05-001.yaml cita REQ-MP-1/3/4/5 con PASS retenido; mapeo pendiente de decision de inventario (M10.3 no existe en MILESTONE_LABELS)` |
| **Las 19 restantes** (SAS, PROJ-VAL, RDP, TC, GFC, EVT, INV, PLP, ROU, VAULT, VOCAB, SID, PAC, SKILL, EXR, SVP, EXT, FEX, LOA) | `cycle-prose-unmapped` | `declarado en prosa de ciclo (spec/design/tasks) sin mapeo de area; entrega aceptada por el proceso del ciclo; no es deuda accionable del roadmap vigente` |

(Notas en ASCII para evitar sorpresas de encoding en el JSON; acentuación se usa en el .md.) La clase prohibida por el spec ("eras pre-harness m2–m9") NO aparece: la procedencia real por área está en el .md (exploración §2.3: todas las fuentes son ciclos m10–m16, `debt-resolution-process` y `spec-completion`).

### 3.4 `requirement-dispositions.md` — doc hermano normativo (F3)

Estructura obligatoria: (1) propósito — hijo normativo de REQ-DEI-9, referenciado desde el detail de cada gap `requirement-unowned` (REQ-DEI-8, `changes/debt-evidence-integrity/spec.md:150-165`); (2) tabla de la taxonomía: las 4 claves con su definición honesta; (3) **tabla de las 25 áreas**: Área · Disposición · Procedencia real (changes/docs concretos que citan cada área — la tabla de la exploración §2.3) · Nota; (4) notas específicas con enlaces: CPS → `build.ts:315-321` y `changes/cp-foundation/spec.md:267-269` (AC-14.1..14.3); DOC → `changes/backlog-contract-hygiene/spec.md:7` (REQ-DOC-6) y `changes/m10-2-1-crossref-render/spec.md:38` (deferral real de DOC-1/2) y testRefs vigentes `control-plane/test/docs-sanitization.spec.ts:6,78,156` + `control-plane/test/search.spec.tsx:9`; DEC → estado real "implementados en m16", sin citar deferral inexistente (R5); M11 → `changes/m11-human-reader-uat/spec.md:20-21` y `changes/debt-evidence-integrity/spec.md:21,34` (DEBT-DEI-1); SA/MP → `verification/scenarios/scn-m12-01-001.yaml:3` y `scn-m10-05-001.yaml:3`, con la advertencia explícita de que mapear sin evidencia produce UNMAPPED/PARTIALLY_VERIFIED blocking (`audit.ts:137-146,196`) y que M10.3 no existe en `MILESTONE_LABELS` (`build.ts:66-88`) — R7. El doc reside en `verification/traceability/` → **no es cosechado** como fuente de REQ (`build.ts:151-152`): sus menciones a ids no crean fuentes espurias.

### 3.5 `tools/validate-recipes/tests/test_validate.py` — oráculos INC-015 (F6)

Cabecera: comentario `# Tests for the INC-015 fallback of tools/validate-recipes/validate.py (negative-fixtures recursive search). Requirements: REQ-M11-5`. Patrón subprocess (`sys.executable`, `VALIDATE = Path(__file__).parent.parent / 'validate.py'`, tmp_path de pytest, `subprocess.run(..., capture_output=True, text=True)`), como `tools/narrative-cli/tests/test_cli.py:10-20`.

Fixtures de prueba: receta inválida mínima modelada en el fixture real `recipes/middle-grade-illustrated/tests/negative-fixtures/missing-required.yaml` (verificado esta sesión: `schema: creation-recipe/v1` + `metadata` sin `title` → ≥1 diagnóstico error).

| Test | Setup (tmp_path) | Oráculo |
|---|---|---|
| `test_fallback_single_nested_dir` | `<tmp>/recipes/one/tests/negative-fixtures/bad.yaml` (inválida); **sin** `<tmp>/tests/negative-fixtures` | exit **0** (`validate.py:451`); stdout contiene `correctly fails` (`:443`) |
| `test_fallback_reports_expected_error` | el mismo árbol del anterior | exit 0; stdout contiene `-> ` (código de diagnóstico impreso, `:445`) — demuestra el comportamiento del validador sobre la fixture (spec REQ-DEI-10 AC-3) |
| `test_fallback_multiple_dirs_ambiguous` | dos árboles `recipes/one/...` y `recipes/two/...` con negative-fixtures | exit **2** (`validate.py:429`); stderr contiene `Multiple negative-fixtures directories` (`:426-429`) |
| `test_direct_path_still_works` | `<tmp>/tests/negative-fixtures/bad.yaml` (rama no-fallback, `validate.py:417`) | exit 0; stdout contiene `correctly fails` |

Cobertura mínima exigida por el spec AC-3 (fallback no ambiguo + comportamiento del validador) queda cubierta por los dos primeros; los otros dos cierran las ramas vecinas por coste marginal. Sin dependencias más allá de pytest (ya instalado en CI, `verification.yml:30`).

### 3.6 `verification/test/requirement-dispositions.spec.ts` — tests de componente (F8)

Citados en el fichero: `REQ-DEI-9` (describe del enriquecimiento + loader) y `REQ-DEI-10` (describe de ownership). Importan desde `../src/traceability/build.ts`:

- **`unownedGapDetail` (REQ-DEI-9)**: (1) entrada del área → base + sufijo literal `; disposition: cycle-prose-unmapped (...) — see verification/traceability/requirement-dispositions.md`; (2) área sin entrada → base verbatim sin sufijo (AC-3); (3) req id con sufijo numérico complejo (p. ej. `REQ-PROJ-VAL-6`) deriva área `PROJ-VAL` vía `areaOfRequirement` (misma expresión que `build.ts:337`).
- **`loadRequirementDispositions` (REQ-DEI-9 AC-2)**, sobre `repoRoot` temporal (tmp dir de vitest con `verification/traceability/` sintético): (4) fichero ausente → throw nombrando el path; (5) JSON inválido → throw; (6) entrada con disposition fuera de la taxonomía → throw nombrando área y claves válidas; (7) entrada sin note → throw; (8) mapa válido → Map poblado.
- **`reqBelongsToMilestone` (REQ-DEI-10 AC-1, componente)**: (9) `('REQ-M11-5','M11') === true` y `('REQ-M11-6','M11') === true`; (10) regresión del patrón: `('REQ-M11-1','M11') === true` (el override existente no se rompe) y `('REQ-M11-5','M12') === false` (no se filtra a otro milestone).
- **Fichero real del mapa (REQ-DEI-9, integración ligera)**: (11) `loadRequirementDispositions` sobre el repo real carga las 25 áreas sin throw (ancla el contenido de §3.3 a la taxonomía validada).

No se testea aquí la forma del registry completo (eso son los oráculos jq de la regeneración, §4.3): los tests de componente prueban las unidades puras; el freshness guard (`audit.ts:244-266`) obliga a que el registry comprometido case con el rebuild, y el audit all valida el conjunto.

### 3.7 Contratos de cita (testids/oráculos de cosecha)

- `REQ-M11-5` debe aparecer **literal** en: `control-plane/test/extension-isolation.spec.ts` (F5) y `tools/validate-recipes/tests/test_validate.py` (F6) — ambos casan los includes de `build.ts:189-190`. Un testRef por fichero basta (`audit.ts:134-136`: fitness + ≥1 testRef → PROVEN); dos ficheros son la cita honesta de sus dos partes (INC-008 / INC-015).
- `REQ-M11-6` debe aparecer en `verification/scenarios/scn-m11-01-001.yaml:3` (F4) — `reqScenario` (`build.ts:156-165`) lo enlaza y `scenarioVerdictsFor` (`audit.ts:98-107`) le atribuye el veredicto PASS vigente (`run-2026-10-01T12-04-44-962Z-633bc35a`) por nombre de fichero. Edición segura: ningún test ni el audit cruzan el campo `requirements` del `verdict.json` contra el yaml (exploración §2.2, verificado con grep); los hashes de bundles no incluyen los yamls (R4).
- `REQ-DEI-9` y `REQ-DEI-10` deben aparecer en `verification/test/requirement-dispositions.spec.ts` (F8) — obligatorio (spec §aritmética (b)): este spec.md y este design.md los cosechan como fuentes (`changes/**.md`, `build.ts:151`) y la regla de área DEI (`build.ts:346`) los mete al inventario M10.2.1; sin testRefs serían UNMAPPED = blocking → audit FAIL.

---

## 4. Estrategia de tests (quirúrgica por fase, canónica al cierre)

Perfiles según el anexo de testing incremental de AGENTS.md. Sin batería completa durante el desarrollo; canónica sobre el árbol final.

**Fase 1 — Mapa + enriquecimiento (F1, F2, F3, F8, F9)**
- T0: `pnpm --dir verification exec tsc --noEmit` (types del nuevo loader/helpers).
- T1 (RED→GREEN): `pnpm --dir verification exec vitest run test/requirement-dispositions.spec.ts` y `test/unowned-requirements.spec.ts` (regresión del guard sin cambios de aserciones).
- Criterio: 11 tests nuevos en verde + los existentes de unowned sin tocar.

**Fase 2 — Evidencia M11-5/6 (F4, F5, F6, F7)**
- T1: `pytest tools/validate-recipes/tests/test_validate.py -q` (los 4 oráculos de §3.5).
- T1: `pnpm --dir control-plane exec vitest run test/extension-isolation.spec.ts` — en verde **sin cambios de aserciones** (solo comentario :60; REQ-DEI-10 AC-3).

**Fase 3 — Regeneración y oráculos canónicos (F10)** — sobre el árbol final commiteado:
1. Commit de fuentes (F1–F9). 2. `node verification/src/index.ts traceability build`. 3. `node verification/src/index.ts audit all` (el guard de frescura falla si el disco no casa con el rebuild — `index.ts:155-167`). 4. Commit `chore(verification): regenerate ...` con los 5 artefactos (pliega el churn preexistente de `audit/all.{json,md}`).
- **Oráculos exactos** (comandos jq, comparando contra los valores del spec):
  - `jq '[.gaps[] | select(.kind=="requirement-unowned")] | length' verification/traceability/registry.json` → **107**
  - `jq '[.gaps[] | select(.kind=="requirement-unowned") | select(.detail | contains("disposition: ") and contains("requirement-dispositions.md"))] | length'` → **107** (REQ-DEI-9 AC-1)
  - `jq '[.gaps[] | select(.kind=="requirement-unowned") | select(.detail | contains("requirement-dispositions.json"))] | length'` → **0** (AC-4: el mapa no es fuente de cosecha)
  - `jq '.milestones[] | select(.id=="M11") | .requirements[] | select(.id=="REQ-M11-5" or .id=="REQ-M11-6") | {id, status, scenarios, testRefs}'` → ambos `MAPPED`; M11-5 con testRefs que incluyen `control-plane/test/extension-isolation.spec.ts` y `tools/validate-recipes/tests/test_validate.py`; M11-6 con `scenarios: ["scn-m11-01-001.yaml"]` (REQ-DEI-10 AC-1)
  - `jq '.coverage' verification/traceability/registry.json` → `{requirements: 94, mapped: 94, unmapped: 0, ...}` (REQ-DEI-10 AC-4: ningún requisito nuevo salvo M11-5/6 y DEI-9/10)
  - `jq '{overall, blocking: (.blocking|length), waived: (.waived|length), proven: (.proven|length), broken: .brokenReferences}' verification/audit/all.json` → `PASS · 0 · 0 · 94 · []`; detalle de M11-5 `fitness level: N test ref(s)` y M11-6 `scenario evidence: SCN-M11-01-001` (REQ-DEI-10 AC-2)
  - diff de `requirement-levels.json` vs v0.24.1 = solo REQ-DEI-9/REQ-DEI-10 (REQ-DEI-10 AC-4)

**Cierre (T2/canónico)**: `pnpm --dir verification test` (suite vitest completa del harness) + `pnpm --dir verification exec tsc --noEmit` + `pytest tools/validate-recipes/tests tools/narrative-cli/tests -q` + el fichero de control-plane tocado. **T3 no aplica**: no se cruza ninguna frontera de integración (cero código de producto; el único contacto con control-plane es un comentario de test — la suite completa de control-plane la cubre el T4 de CI, `verification.yml:38-44`). **T4** = el workflow `verification` de CI sobre el push (batería Python + control-plane + harness + verify canónico + audit gate). **T5** = procedimiento de release del orquestador (v0.24.2, PATCH — fuera de esta fase). Los 11 veredictos canónicos PASS se reutilizan sin re-ejecución; el verification-report debe documentar el R4 (verdict.json retenido de SCN-M11-01-001 lista REQ-M11-1..4; sin cross-check con el yaml — hecho, no defecto nuevo).

---

## 5. Evaluación de deuda (severidad / prioridad)

| Id | Deuda | Severidad | Prioridad | Tratamiento |
|---|---|---|---|---|
| D-1 | `verdict.json` retenido no se cruza contra el `requirements` del yaml de escenario (drift latente: SCN-M11-01-001 lista REQ-M11-1..4, el yaml pasará a listar también REQ-M11-6) — exploración §2.2, R4 | LOW | P3 | Preexistente. Se documenta en el verification-report (obligatorio). Hardening futuro (cruce o hash del yaml en el bundle) queda como candidato, no en este ciclo |
| D-2 | REQ-SA-1..6 y REQ-MP-1/3/4/5 tienen evidencia de escenario PASS retenida pero sin mapeo de inventario — pendiente de decisión de inventario (ningún ciclo la tomó: m12-sequential-art-core y m10-3 los declararon sin overrides; debt-evidence-integrity los dejó fuera) | LOW | P3 | Es la deuda que el propio mapa de disposiciones hace visible y auto-explicada (nota SA/MP, §3.3). Bloqueada por D-3. Mapear sin decidir produciría blocking (R1/R7) |
| D-3 | `MILESTONE_LABELS` sin `M10.3` (`build.ts:66-88`) — prerrequisito estructural para mapear los REQ-MP | LOW | P3 | Documentada en el .md (nota MP). Decisión de estructura de inventario fuera de un ciclo de triage LOW |
| D-4 | `baseline-m0-m10-2.md` con nombre legacy aunque su rango se deriva hoy de `MILESTONE_LABELS` (M0–M17; `build.ts:357-362`, writer `index.ts:251-254`) | INFO | P4 | Preexistente, cosmético. Sin acción en este ciclo |
| D-5 | Comentario `build.ts:245-246` con atribución falsa ("pre-M10 eras mostly") | — | — | **Corregido por este ciclo** (D6): no se registra como deuda nueva |

No se introduce deuda nueva por encima de LOW: la disposición es anotación por diseño (REQ-DEI-8), el mapa añade un solo punto de carga con fallo duro (mismo patrón que `loadRequirementLevels`), y la taxonomía cerrada evita claves fantasma. El doc .md es el ledger normativo de las 107 disposiciones restantes; refinar una nota futura es edición del JSON+doc, no de código (spec, qué-NO-prueba de REQ-DEI-9).

---

## 6. Coherencia arquitectónica (auto-evaluación del gate)

- **Reutiliza mecanismos existentes, no introduce abstracciones**: loader con el criterio probado de `loadRequirementLevels` (`audit.ts:43-58`); overrides en el mapa existente `REQ_MILESTONE_OVERRIDES` (`build.ts:322-330`); enriquecimiento en el flujo existente de gaps (`build.ts:239-250`); tests en las convenciones vigentes (vitest + jq en `verification/`, pytest subprocess como `tools/narrative-cli/tests/test_cli.py`); CI mediante la línea ya existente de `verification.yml:33`. Sin almacenes, orquestadores ni protocolos nuevos (AGENTS.md §5).
- **Respeta los contratos aceptados**: no mapea área alguna sin evidencia (R1 — solo REQ-M11-5/6, ejercitando la propiedad DEBT-DEI-1 `changes/debt-evidence-integrity/spec.md:21,34`); conserva el guard REQ-DEI-8 (áreas sin entrada → detail crudo); CPS/DOC siguen sin regla de área (`build.ts:315-321` intacto en comportamiento); sin waivers, sin escenarios nuevos, sin cambios de producto.
- **Honestidad documental**: la clase de disposición refleja la procedencia real verificada (exploración §2.3), corrige la atribución falsa del comentario `:245-246` y declara DEC como "implementado sin deferral" en vez de citar una deferral inexistente (R5).
- **Semver**: fix/chore/test → PATCH v0.24.2, sin impacto de API pública (R6).

Criterios de aceptación del spec → cobertura de diseño: REQ-DEI-9 AC-1→§3.2+§4.3(jq); AC-2→§3.1+§3.6(4-7); AC-3→§3.2+§3.6(2); AC-4→§3.4+§4.3(jq 0 hits); AC-5→§3.3+§3.4. REQ-DEI-10 AC-1→§3.7+F1e+§3.6(9-10); AC-2→§4.3(audit); AC-3→§3.5+Fase 2; AC-4→§4.3(diff levels + coverage).

## 7. Riesgos heredados

R1–R7 de la exploración §5 aplican con las mitigaciones ya definidas allí; los tres operativos aquí: regeneración obligatoria en el mismo cierre que el cambio de `build.ts` (R2, guard de frescura), citas solo en ficheros cosechados (R3, §3.7) y documentación del R4 en el verification-report.
