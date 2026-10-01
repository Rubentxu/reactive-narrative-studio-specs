# Design — debt-evidence-integrity (inventario M11, sha256 build-time, dead code y dedup del trigger de descarga)

**Ciclo**: `p-de82af3e9774d9a0/debt-evidence-integrity` · **Rama**: `feat/debt-evidence-integrity` · **Base**: `e2f33bbd0416497c81b6daea765dba7a1938c2ba` (v0.23.0; verificado con `git rev-parse HEAD` en esta sesión de diseño)
**Entradas**: `specification.md` del ciclo (REQ-DEI-1..7, 23 ACs, todos nivel `fitness`) · `exploration-report.md` (work items M1–M5, L1/L3/L5 confirmados + hallazgos N1–N6)
**Fecha**: 2026-10-01
**Naturaleza**: sin features nuevas — fix/refactor/test/chore → v0.23.1.

---

## 0. Principio de diseño

Mínima invasión y reutilización de mecanismos existentes (mandato del ciclo). Verificado fichero a fichero en esta sesión:

- **Cero abstracciones nuevas**: el único fichero NUEVO de producto es `control-plane/src/lib/download.ts` — dedup, no abstracción (un único mecanismo reemplaza 5 copias locales, dos de ellas verbatim; exploration M1). La guard de frescura (REQ-DEI-7) es una función exportada en `audit.ts` consumida por la rama CLI `audit all` existente (`index.ts:150-157`): sin daemon, sin auto-regeneración, sin almacén nuevo.
- **Patrones ya probados que se reutilizan tal cual**: (i) overrides individuales en `REQ_MILESTONE_OVERRIDES` (`build.ts:305-309`, patrón REQ-DOC-3/4/5 aplicado por 0ac432a); (ii) label en `MILESTONE_LABELS` (patrón M16, entre M10.2.1 y M12); (iii) hash en build time por el generador existente (`generate-capability-manifest.mjs`, mismo patrón que `generate-recipe-assets.mjs`, determinista por diseño — cabecera del script); (iv) `src/lib` como capa de aislamiento (precedente `features/epub/epub.ts:14` → `../../lib/store-zip`, verificado); (v) errores duros ante evidencia silenciosamente degradada (precedente `audit.ts:39-42`: «A malformed file is a hard error: silent downgrades would weaken the gate invisibly»).
- **Producción intacta por construcción**: el composer FSA→download (`CommandComposer.tsx:106-109`, try/catch verificado), `validateCommandRecord` (`features/decisions/validate.ts:19`), el oráculo schema Ajv2020, `store-zip.ts` internals y los sinks `fileSystemAccessCommandSink`/`downloadCommandSink` no cambian de comportamiento.

---

## 1. Componentes y ficheros a crear o tocar

| # | Fichero | Acción | Alcance exacto | Evidencia de estado actual (leído en esta sesión) |
|---|---|---|---|---|
| 1 | `verification/src/traceability/build.ts` | **MODIFICAR** (M3+L1) | (a) `MILESTONE_LABELS` (:66-87): añadir `M11: 'Human Reader UAT'` **entre `'M10.2.1'` (:80) y `M12` (:81)** — el orden de inserción define `MILESTONE_ORDER` (:90), posición cronológica correcta. (b) `REQ_MILESTONE_OVERRIDES` (:305-309): añadir `'REQ-M11-1': 'M11'` … `'REQ-M11-4': 'M11'` (4 entradas individuales; patrón exacto REQ-DOC). (c) Eliminar el mapa muerto `areaToMilestone` (:317-325) y su supresor `void areaToMilestone;` (:339) — **sin reconectar** (el if-chain :326-338 queda intacto). (d) Títulos derivados: `renderCoverageMatrix` :345 y `renderBaseline` :378 sustituyen el literal `'M0–M10.2'` por `milestoneRangeLabel(registry)` (C1.3). (e) Actualizar los comentarios que quedarían engañosos: doc-comment :108-114 («M0–M10.2 (H1)») y :372-374 («Baseline M0–M10.2 (H8)») → redacción sin rango hardcodeado; comentario :299-304, cuya cola «CPS stays dead code» deja de ser cierta al borrar el mapa → reformulado (C1.4). | Confirmado: M11 ausente de labels (:80-81 saltan M10.2.1→M12); mapa muerto :317-325 + `void` :339; overrides solo REQ-DOC-5/3/4 |
| 2 | `verification/test/baseline-audit.spec.ts` | **MODIFICAR** (REQ-DEI-1) | Nuevo describe `traceability inventory — M11 (REQ-DEI-1)` con los casos del §3.1 (buildRegistry sobre REPO_ROOT + asserts estructurales del inventario y de los títulos derivados). | El describe existente `baseline M0-M10.2 (H8)` (:107-121) solo aserta estructural (waived ≥1, gaps>0, M10.2 testRefs, M10.2.1 REQ-VAH-WAIVER) — no se rompe con M11; timeout 120_000 precede |
| 3 | `verification/src/audit/audit.ts` | **MODIFICAR** (REQ-DEI-7) | Añadir `checkRegistryFreshness(verificationRoot, headGitSha)` exportada (C7.1): lee `verification/traceability/registry.json`, compara `gitSha` en disco contra el HEAD (que es `report.gitSha` del registry reconstruido en memoria, `audit.ts:159,212` — sin segunda llamada a git). Sin tocar `deriveRequirementStatus`, `auditRequirements` ni `renderAuditMarkdown`. | `auditRequirements` reconstruye el registry en memoria (:159); N3: lo stale es el artefacto en disco |
| 4 | `verification/test/registry-freshness.spec.ts` | **CREAR** (REQ-DEI-7) | Casos y oráculos: §3.2. Patrón: `audit-gate.spec.ts:8-10` (mkdtemp tmpdir + writeFile) y `baseline-audit.spec.ts:32-44` (loadWaivers sobre tmpdir). | No existe hoy ningún test del registry en disco |
| 5 | `verification/src/index.ts` | **MODIFICAR** (REQ-DEI-7) | En la rama `sub === 'all'` (:150-157): tras `auditRequirements`, llamar a la guard; si `!fresh` → mensaje explícito por stderr con ambos shas + comando de reparación, **no** escribir artefactos de audit, exit ≠ 0 (C7.2). Las ramas `milestone`/`range` (:161) y el subcomando `verify` NO se tocan (el verify no llama a `auditRequirements` — verificado por grep en index.ts). | `audit all` escribe via `writeAuditArtifacts` (:151); `traceability build` escribe via `writeTraceabilityArtifacts` (:228-239) |
| 6 | `control-plane/scripts/generate-capability-manifest.mjs` | **MODIFICAR** (M2) | `import { createHash } from 'node:crypto'`; helper `sha256Hex(content)`; añadir `sha256: sha256Hex(content)` a cada item de `skills` (:69-74), `packs` (:82-88), `profiles` (:95-110), `workflows` (:116-121) y `recipes` (:130-135). `providers` sin sha (DD-4 empty-state, :124, devuelve []). `EXPECTED_COUNTS` (:43) sin cambios. Cabecera del script (:11-21): documentar el nuevo campo en el contrato. | Grep `sha256\|SHA` en el script → 0 resultados; bundle `{skills,packs,profiles,workflows,providers,recipes}` items con keys `['id','path','content']` (python sobre manifest-data.json) |
| 7 | `control-plane/src/features/capability-catalog/data/manifest-data.json` | **REGENERAR** (M2) | `node scripts/generate-capability-manifest.mjs` desde `control-plane/` → cada item lleva `sha256` hex 64. AC-1: dos ejecuciones consecutivas byte-idénticas. | Hoy: sin sha256 (verificado con python: `sha256 present: False`) |
| 8 | `control-plane/src/features/capability-catalog/parser.ts` | **MODIFICAR** (M2) | (a) Eliminar la cadena muerta: sección «SHA-256 computation» (:94-127) — `sha256Cache` :102, `computeSha256Async` :108-119, `computeSha256` :125-127. (b) Firmas: `parseSkill(content, path, sha256: string)` (:137), `parsePack(content, path, origin, sha256: string)` (:207), `parseProfile(yamlContent, path, sha256: string)` (:282), `parseWorkflow(jsonContent, path, sha256: string)` (:340), `parseRecipe(yamlContent, path, sha256: string)` (:388) — cada una emite `sha256` del parámetro (sitios :190, :266, :326, :360, :407). `parseProvider()` (:372-375) SIN cambios (no emite sha — precisión C2.3). | `grep -n "sha256: computeSha256" parser.ts` → 190, 266, 326, 360, 407; `computeSha256Async` cero callers (exploración M2) |
| 9 | `control-plane/src/features/capability-catalog/manifest.ts` | **MODIFICAR** (M2) | Llamadas pasan `item.sha256`: :56 (skill), :66 (pack), :76 (profile), :86 (workflow), :100 (recipe). Eliminar import de `computeSha256` (:20) y re-export `export { computeSha256 }` (:127-128) con su comentario. | Llamadas verificadas; re-export «for external use (e.g., fixture generation)» — cero callers externos (grep) |
| 10 | `control-plane/src/features/capability-catalog/index.ts` | **MODIFICAR** (M2) | Quitar `computeSha256` del bloque de re-export (:37). | Bloque :30-40 verificado |
| 11 | `control-plane/test/capability-parsers.spec.ts` | **MODIFICAR** (M2) | Llamadas directas reciben un hex fixture (`'a'.repeat(64)`) y añaden aserción de pass-through no vacío por parser (§3.3). | Llamadas actuales sin sha: :28, :34, :40, :56, :62, :68, :75, :98, :110, :116, :134, :150, :179 |
| 12 | `control-plane/test/capability-doc-card.spec.ts` | **MODIFICAR** (M2) | Fixture :45 `sha256: ''` → hex 64 consistente con el manifest regenerado. | Verificado :40-50 |
| 13 | `control-plane/src/schema/registry.ts` | **MODIFICAR** (M5) | (a) Borrar comentario falso :26 (`stub only … created in Block 3`) y sufijo :50 (`// stub — full schema in Block 3`) — los specs existen y el dispatch funciona; conservar el comentario real :28-30 (M17 outbound). (b) `validate<T>` (:96-119): eliminar el fallback que itera `schemaById` en orden de inserción (:100-112); si `schemaIdFor` no despacha → error explícito (C3.1). | Comentarios :26/:50 falsos (ls de specs verificado en exploración); fallback :102-110 |
| 14 | `control-plane/test/loader.diagnostics.spec.ts` | **MODIFICAR** (M5) | Port del único spec que depende del fallback (C3.2): el fixture `project-invalid-schema/cp-project.missing-schema.json` no lleva `schema` → hoy el fallback devuelve errores de cp-project por orden de inserción. Portado: `schemaIdFor(doc) === null` + `validate(doc)` inválido con el error explícito nuevo. | Fixture leído (`golden/control-plane/project-invalid-schema/cp-project.missing-schema.json`): sin campo `schema`; tests :11-33 |
| 15 | `control-plane/src/features/decisions/commandSinks.ts` | **MODIFICAR** (M4+M1) | (a) Borrar `pickCommandSink` (:75-78). (b) `downloadWrite` (:51-68) retarget: `const url = triggerDownload(json, \`${record.id}.json\`, 'application/json')` (retorno ignorado). Los sinks, `isSupported()` y `CommandWriteResult` intactos. | pickCommandSink sin uso en producción (grep; composer usa try/catch :106-109) |
| 16 | `control-plane/test/decisions-command-sinks.spec.ts` | **MODIFICAR** (M4) | Quitar `pickCommandSink` del import (:18-21) y el describe `:141-151` (2 tests). Resto intacto. | Verificado :14-21 y :141-151 |
| 17 | `control-plane/src/lib/download.ts` | **CREAR** (M1) | Único trigger de descarga (C5.1). Patrón de aislamiento `src/lib` (precedente `epub.ts:14` → `store-zip`; `src/lib/` hoy solo contiene `store-zip.ts`). | — |
| 18 | `control-plane/src/views/PublishingProof.tsx` | **MODIFICAR** (M1) | Borrar `downloadBlob` local (:18-29); import `triggerDownload` desde `../lib/download`; las llamadas `downloadBlob(bytes, filename, type)` pasan a `triggerDownload(bytes, filename, type)` (mismo orden de parámetros; retorno ignorado). | Copia verbatim de downloadBlob verificada :18-29 |
| 19 | `control-plane/src/views/ComicProof.tsx` | **MODIFICAR** (M1) | Ídem: borrar `downloadBlob` (:24-35), retarget llamadas. | Copia verbatim verificada :24-35 |
| 20 | `control-plane/src/features/recipes/DownloadPlanSink.ts` | **MODIFICAR** (M1) | `write` (:29-47): `const url = triggerDownload(json, 'create-plan.json', 'application/json'); return Promise.resolve({ downloadUrl: url })` (contrato N6). | Devuelve `downloadUrl: url` hoy (:46) |
| 21 | `control-plane/src/features/human-reader/ReaderFeedbackForm.tsx` | **MODIFICAR** (M1) | Bloque :70-79 → `triggerDownload(jsonl, filename, 'application/x-ndjson')` (retorno ignorado; `setLastDownload` intacto). | Verificado :68-81 |
| 22 | `control-plane/src/features/comic-renderer/zip.ts` | **BORRAR** (L3) | Shim back-compat re-export. | Contenido leído: `export * from '../../lib/store-zip'` |
| 23 | `control-plane/src/features/comic-renderer/cbz.ts` | **MODIFICAR** (L3) | `from './zip'` → `from '../../lib/store-zip'` (:11). | Único importador en src (grep verificado) |
| 24 | `control-plane/test/comic-renderer.spec.ts` y `comic-renderer-manga.spec.ts` | **MODIFICAR** (L3) | `../src/features/comic-renderer/zip` → `../src/lib/store-zip` (:19 y :17 respectivamente). | Importadores verificados por grep |
| 25 | `control-plane/test/fixtures/capability-manifest-snapshot.ts` | **MODIFICAR** (L5) | Comentario :4 «Expected manifest at HEAD 364571c:» → redacción sin revisión histórica (C6.3). | Verificado :1-12 |
| 26 | `docs/19-ROADMAP.md` | **MODIFICAR** (documentación) | Línea **aditiva** en el bloque de cabecera sobre v0.23.1 (C9); la línea histórica v0.23.0 «proven 79» (:7) NO se reescribe. | Cabecera leída :1-12 |
| 27 | `verification/traceability/{registry.json,coverage-matrix.md,baseline-m0-m10-2.md}` · `verification/audit/{all.json,all.md}` | **REGENERAR** (cierre) | `node verification/src/index.ts traceability build` + `node verification/src/index.ts audit all` sobre el árbol final **commiteado y limpio** (C8). El filename canónico `baseline-m0-m10-2.md` se conserva (C1.5). | registry.json @e2f33bb stale: gitSha `3071e473ae12…` ≠ HEAD `e2f33bb…`, coverage `{79,79,0,22,9,waived:1}` (python) |

**Fuera de alcance (sin cambios)**: L2 (MetadataCard reserved keys) y L4 (docsSafeMarkdown/DocTab comments) — backlog del orquestador; internals de `store-zip.ts`, svg/layout/types de comic-renderer, oráculo Ajv2020, branches m16/capability de `entityLinkPlugin`, `Decisions.tsx`, `dangerouslySetInnerHTML` de ComicProof; sinks FSA y su consolidación; los 3 specs ya-dispatch (`schema-fixtures.spec.ts`, `decision-projection.schema-fixtures.spec.ts` — sus mutaciones negativas conservan el `schema` const → camino directo del validador, sin dependencia del fallback; verificado :19-26 y :25-34) y `docs-sanitization.spec.ts` (regresión de vecinos, sin edición).

---

## 2. Contratos exactos

### C1 — Inventario de trazabilidad (REQ-DEI-1)

**C1.1 — Label y orden.** `MILESTONE_LABELS['M11'] = 'Human Reader UAT'` (nombre canónico del roadmap, `docs/19-ROADMAP.md:162` «## M11 — Human Reader UAT — DELIVERED (v0.15.0)»). Insertada entre `'M10.2.1'` y `M12` → `MILESTONE_ORDER` = `[M0…M10, M10.1, M10.2, M10.2.1, M11, M12…M17]`. Efecto colateral legítimo y aceptado: `milestoneRange('M10.2.1','M12')` (CLI `audit range`) pasa a incluir M11 — los receipts históricos siguen válidos para su revisión.

**C1.2 — Overrides individuales.** `REQ_MILESTONE_OVERRIDES` += `'REQ-M11-1'…'REQ-M11-4': 'M11'`. `reqBelongsToMilestone` (:311-341) resuelve el override ANTES que la heurística (:314-315) → REQ-M11-5/6 (sin override, sin testRefs ni scenarios — exploración N2) quedan FUERA del inventario, como CPS hoy. Cadena completa post-fix: `reqSources` recoge REQ-M11-1..6 de `changes/m11-human-reader-uat/spec.md` (:149) → los 4 overrideados entran en M11 con `scenarios: ['scn-m11-01-001.yaml']` (reqScenario del yaml :154-162, que declara `uat: UAT-M11-01` y `requirements: [REQ-M11-1..4]`, leído) → status MAPPED.

**C1.3 — Títulos derivados.** Nuevo helper privado en build.ts:

```ts
function milestoneRangeLabel(registry: TraceabilityRegistry): string {
  const populated = registry.milestones.filter((m) => m.uats.length > 0 || m.requirements.length > 0);
  const first = populated[0]?.id;
  const last = populated[populated.length - 1]?.id;
  return first && last ? `${first}–${last}` : '(empty)';
}
```

`renderCoverageMatrix` → `# Traceability Coverage Matrix (${milestoneRangeLabel(registry)})`; `renderBaseline` → `# Baseline ${milestoneRangeLabel(registry)} — Verification Coverage`. Con el árbol post-fix el rango visible es `M0–M17` (deriva del estado real, AC-3). Sin guiones raros: se conserva el en-dash `–` del literal actual. **Ningún test aserta esos headers** (exploración N4, grep «Coverage Matrix|Baseline M0|coverage:» sin asserts; `baseline-audit.spec.ts:107-121` solo aserta `## Gaps / backlog` y contenido de milestones — verificado).

**C1.4 — Comentarios honestos.** El comentario :299-304 («The DOC area has no heuristic mapping (and must not: CPS stays dead code…)») se reformula porque «CPS stays dead code» refería el mapa que L1 borra. Redacción propuesta: «…so only individually-owned requirements get inventory visibility. The DOC and CPS areas have no heuristic mapping (and must not: an area rule for CPS would pull REQ-CPS-* into the inventory as UNMAPPED).» Los doc-comments :108-114 y :372-374 pierden el rango hardcodeado («Git-native traceability inventory» / «Baseline (H8): per-milestone status, gaps/backlog and applied waivers. Regenerable from the registry — never rewrites history (VAH-019).»).

**C1.5 — Filename canónico conservado.** `baseline-m0-m10-2.md` (`index.ts:233`) NO se renombra: es nombre canónico de artefacto citado por receipts y lectores humanos; solo los títulos internos derivan del estado real. Divergencia cosmética filename↔rango registrada como deuda informativa (§5, DEBT-DEI-3).

### C2 — sha256 en build time (REQ-DEI-2)

**C2.1 — Generador.** `sha256Hex = (content) => createHash('sha256').update(content, 'utf8').digest('hex')` (node:crypto, sync — el script es sync). Cada item de skills/packs/profiles/workflows/recipes gana `sha256: sha256Hex(content)` junto a `id/path/content`. Determinismo (AC-1): mismo árbol → mismos bytes (el bundle ya ordena colecciones por path :137-140 y JSON.stringify es estable; node:crypto es determinista). Paridad con la política de reproducción del script (cabecera :16-17).

**C2.2 — Parsers portadores, no calculadores.** Las 5 firmas ganan un parámetro final **requerido** `sha256: string` (no opcional: un default `''` recrearía en silencio el defecto que este ciclo repara — tsc fuerza el pass-through en cada call site). `manifest.ts` pasa `item.sha256` (el import JSON lo tipa como string tras regenerar; con manifest-data stale tsc falla = fail-fast correcto). El tipo de los `Parsed*` no cambia (`sha256: string` ya requerido). Eliminación total: `sha256Cache`, `computeSha256Async`, `computeSha256` y los re-exports (`manifest.ts:20,127-128`, `index.ts:37`) — AC-3: `grep -rn "computeSha256" control-plane/src` → 0; `grep -rn "sha256Cache\|computeSha256Async" control-plane/` → 0.

**C2.3 — Precisión de contrato respecto a la spec (registrar en verification-report).** La spec atribuye el 5º sitio de emisión a `parseProvider` (`:407`), pero la lectura del código muestra que `:407` es la emisión de `parseRecipe` (`parseRecipe` :388-…; `parseProvider` :372-375 devuelve `[]` por DD-4 y NO emite sha). Son 5 sitios de emisión en cualquier caso (parseSkill:190, parsePack:266, parseProfile:326, parseWorkflow:360, parseRecipe:407); la intención de la spec (los 5 emisores leen el sha del manifest) se satisface íntegra. No es desviación de comportamiento; es precisión de atribución.

**C2.4 — Superficie visible.** `m16EntityBridge.tsx:40` (`sha256: entry.sha256` en baseMetadata) pasa de `<dd>` vacío a hash real — cambio de UI benigno declarado en la spec. Fixtures: `capability-doc-card.spec.ts:45` (`sha256: ''` → hex 64). Sin fixtures con sha procedente del manifest real (el doc-card construye su propia entidad) — no hay acoplamiento de tests a los hashes concretos del árbol.

### C3 — `validate<T>` sin fallback dependiente del orden (REQ-DEI-3)

**C3.1 — Contrato nuevo del camino no despachable.** Se conserva la unión de retorno (validate sigue SIENDO total, sin throw — el test «does not throw» de loader.diagnostics :15-18 se mantiene honesto):

```ts
if (!dispatch) {
  return {
    valid: false,
    schemaId: '',
    errors: [{
      keyword: 'schema-undispatchable',
      instancePath: '',
      message: 'document has no known `schema` const or `apiVersion`; dispatch with schemaIdFor() before validate()',
    }],
  };
}
```

La forma `{keyword, instancePath, message}` replica el subconjunto de AjvError que los tests ya asertan (loader.diagnostics :25-33 exige los tres campos definidos). El error es determinista (no depende del orden de inserción de `schemaById`).

**C3.2 — Port de `loader.diagnostics.spec.ts`.** El fixture `cp-project.missing-schema.json` (leído: sin `schema`, sin `apiVersion`) pasa de «errores de cp-project vía fallback» a «error explícito de no-despachable». Port: `const dispatch = schemaIdFor(doc); expect(dispatch).toBeNull();` + `result.valid === false` + `errors.some(e => e.keyword === 'schema-undispatchable')` + los tres campos definidos + not-throw. El nombre del spec sigue siendo honesto (diagnóstico de un fixture con schema ausente).

**C3.3 — Producción intacta.** `validateCommandRecord` usa la frontera AJV dedicada de decisiones (`validate.ts:19`), NO este genérico; el loader usa `validateAndLoadProjections`. Cero callers de producción del genérico (exploración M5, re-verificado: solo 3 specs).

### C4 — `pickCommandSink` fuera (REQ-DEI-4)

Borrar :75-78 (símbolo), el import del spec (:18-21) y el describe :141-151. **Sin sustituto**: el composer ya resuelve el fallback por try/catch (`CommandComposer.tsx:106-109`: `fileSystemAccessCommandSink.write(record)` → catch → `downloadCommandSink.write(record)`, razón «user abort, headless» documentada) — `isSupported()` de cada sink se conserva. AC-1: `grep -rn "pickCommandSink" control-plane/src control-plane/test` → 0.

### C5 — `triggerDownload` único (REQ-DEI-5)

**C5.1 — El helper.** `control-plane/src/lib/download.ts`:

```ts
export function triggerDownload(data: BlobPart, filename: string, mime: string): string {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return url;
}
```

Paridad exacta con las 5 copias hoy (incluido revoke a 10_000 ms) + **retorno del objectURL** (N6: `DownloadPlanSink.write` devuelve `downloadUrl: url`, :46). Sin parámetros opcionales, sin opciones, sin callbacks: no es store-writer (SHALL NOT de la spec; riesgo 5 de la exploración).

**C5.2 — Mapeo de los 5 sitios.** (1) `PublishingProof.tsx` y (2) `ComicProof.tsx`: borrar `downloadBlob` local; mismas llamadas con orden idéntico `(bytes, filename, type)`; retorno ignorado. (3) `commandSinks.downloadWrite`: `triggerDownload(JSON.stringify(record), \`${record.id}.json\`, 'application/json')`, retorno ignorado, `CommandWriteResult` sin cambios. (4) `DownloadPlanSink.write`: retorno capturado como `downloadUrl`. (5) `ReaderFeedbackForm`: `triggerDownload(jsonl, filename, 'application/x-ndjson')`, retorno ignorado, `setLastDownload({filename, jsonl})` intacto.

**C5.3 — Oráculo global (AC-1).** `grep -rn "createObjectURL" control-plane/src` → únicamente `src/lib/download.ts`. (Hoy: 5 sitios + 1 mención en doc-comment de DownloadPlanSink:5 — la mención en comentario se reescribe al retarget.)

### C6 — L1 / L3 / L5 (REQ-DEI-6)

- **L1**: `areaToMilestone` (:317-325) + `void areaToMilestone;` (:339) fuera; if-chain :326-338 intacto; comentario reformulado (C1.4). AC-1: `grep -rn "areaToMilestone" verification/src` → 0.
- **L3**: borrar `comic-renderer/zip.ts`; retarget de los 3 importadores verificados: `cbz.ts:11` → `'../../lib/store-zip'`; `test/comic-renderer.spec.ts:19` y `test/comic-renderer-manga.spec.ts:17` → `'../src/lib/store-zip'`. El roundtrip zip de REQ-CR-4 (`comic-renderer.spec.ts:100-114`) queda intacto vía `store-zip`. AC-2: el shim no existe; `grep -rn "comic-renderer/zip\|from './zip'" control-plane/` → 0.
- **L5**: comentario de `capability-manifest-snapshot.ts:4` sin sha de revisión histórica. Redacción propuesta: «Counts pinned by EXPECTED_COUNTS in control-plane/scripts/generate-capability-manifest.mjs; regenerate with `node scripts/generate-capability-manifest.mjs` (deterministic, build-time).» La lista de conteos (:5-11) se conserva (sigue siendo cierta; REQ-DEI-2 no cambia counts).

### C7 — Guard de frescura del registry (REQ-DEI-7)

**C7.1 — Función.** En `verification/src/audit/audit.ts`:

```ts
export interface RegistryFreshness { fresh: boolean; diskGitSha: string; }
export async function checkRegistryFreshness(verificationRoot: string, headGitSha: string): Promise<RegistryFreshness>;
```

Lee `join(verificationRoot, 'traceability', 'registry.json')`: (a) fichero presente y parseable → `fresh = parsed.gitSha === headGitSha`; (b) fichero ausente → `{ fresh: false, diskGitSha: '(missing)' }` (fresh clone sin build — la señal manda a `traceability build`); (c) JSON malformado o sin `gitSha` string → **throw** (error duro, patrón `audit.ts:39-42` y `loadWaivers`). El `headGitSha` lo aporta `report.gitSha` (`audit.ts:212`, del registry reconstruido en memoria a HEAD actual, :159) — no hay segunda llamada a git y la comparación es exacta por construcción.

**C7.2 — Decisión warn vs fail: FAIL.** En la rama `audit all` de `index.ts` (:150-157), si `!fresh`: stderr con `registry.json on disk is stale (gitSha <disk> ≠ HEAD <head>) — run 'node verification/src/index.ts traceability build' on the committed tree, then re-run audit all`, **sin escribir** `audit/all.json|md`, exit ≠ 0 (usar 1, mismo canal que FAIL). Justificación: (i) la motivación del defecto es que el artefacto stale quedó «sin señal alguna» — un warn es ignorable y el receipt de audit seguiría citando un PASS sobre un registro canónico que describe otra revisión (evidencia engañosa: la clase exacta que este ciclo cierra); (ii) precedentes del propio harness: niveles malformados = error duro (audit.ts:44-58), waivers malformados = error duro; (iii) el remedio es barato y determinista (regenerar). La guard NO auto-regenera (SHALL NOT de la spec: enmascararía olvidos).

**C7.3 — Alcance.** Solo `audit all` (rama :150). Los audits `milestone`/`range` (:161) son exploratorios durante el desarrollo y no fuerzan regeneración global; el `verify` canónico no llama a `auditRequirements` (grep verificado) → sin interacción. Decisión habilitada explícitamente por la spec («design decide si la guard aplica solo a all»).

**C7.4 — AC-3 (el audit no reescribe).** Por construcción, la única vía de escritura de `traceability/*` es `writeTraceabilityArtifacts` (`index.ts:228-239`, solo `traceability build`); `audit all` solo escribe `audit/all.*` (:151). Se demostrará en el verification-report por hash/mtime antes-después de los 3 ficheros alrededor de `audit all` (alternativa permitida por la spec).

### C8 — Oráculo canónico del ciclo (regeneración final)

Secuencia obligatoria sobre el árbol final **commiteado y limpio** (el contenido del registry se cosecha del worktree, pero el `gitSha` es el HEAD commit — build sobre árbol sucio produciría un sha que no nombra el contenido):

```
git status --porcelain            # vacío
node verification/src/index.ts traceability build
node verification/src/index.ts audit all
```

Oráculo (spec §aritmética, N5):
- `audit/all.md` → `overall: **PASS** — proven 83 · waived 0 · blocking 0`; 0 UNMAPPED; `brokenReferences: []`.
- `registry.json` → coverage `{requirements: 83, mapped: 83, unmapped: 0, uats: 23, executable: 10, waived: 1}`; milestone `M11` con `UAT-M11-01` EXECUTABLE (`scn-m11-01-001.yaml`) y REQ-M11-1..4 MAPPED; `gitSha` == HEAD.
- `coverage-matrix.md` / `baseline-m0-m10-2.md` → sección `M11 — Human Reader UAT`; headers sin el literal `M0–M10.2`.
- Guard sin señal (disco == HEAD tras el build).
- Los REQ-M11-1..4 salen PROVEN por los veredictos PASS retenidos de SCN-M11-01-001 (último run `run-2026-10-01T05-50-14-164Z-817e37b6`, presente en `verification/evidence/`; derivación `audit.ts:128-132`: functional + PASS → PROVEN). REQ-M11-5/6 fuera del inventario → sin efecto en el audit.
- El waiver `WVR-M10-2-1-002` permanece: `waived: 1` del registry (contador de waivers registrados) y `waived 0` del audit (contador de estados WAIVED) — contadores distintos, ambos se citan tal cual.

### C9 — Roadmap (documentación)

`docs/19-ROADMAP.md` bloque de cabecera: línea **aditiva** (no se reescribe el registro histórico v0.23.0 de :7). Sustancia propuesta: «Ciclo deuda v0.23.1 (debt-evidence-integrity): M11 Human Reader UAT restaurado al inventario de trazabilidad (+4 REQ PROVEN), guard de frescura del registry en `audit all`, sha256 build-time en capability-catalog y dead code eliminado. `audit all`: PASS — proven 83 / waived 0 / blocking 0.»

---

## 3. Estrategia de tests (quirúrgica por fase, canónica al cierre)

### 3.1. `baseline-audit.spec.ts` — describe nuevo «traceability inventory — M11 (REQ-DEI-1)»

| Caso | Setup | Oráculo exacto |
|---|---|---|
| 1. M11 en el inventario | `buildRegistry(REPO_ROOT)` (timeout 120_000, patrón :122) | `registry.milestones.some(m => m.id === 'M11')` true; el milestone tiene `uats` con `UAT-M11-01.md`, `status === 'EXECUTABLE'`, `scenarios` contiene `'scn-m11-01-001.yaml'` |
| 2. Requisitos M11 | ídem | `REQ-M11-1..4` presentes con `status === 'MAPPED'` y `scenarios: ['scn-m11-01-001.yaml']`; `REQ-M11-5`/`REQ-M11-6` **ausentes** de `m11.requirements` |
| 3. Coverage y refs | ídem | `brokenReferences` no contiene ninguna entrada de M11/UAT-M11-01/REQ-M11-* |
| 4. Títulos derivados | `renderCoverageMatrix(registry)` y `renderBaseline(registry)` | ninguno contiene el literal `'M0–M10.2'`; el header contiene el rango derivado (`toContain('M0–')`) |

El literal `REQ-DEI-1` se cita en el comentario de cabecera del describe (patrón del repo; inofensivo para coverage: el área DEI no tiene mapping, verificado en la fase spec).

### 3.2. `registry-freshness.spec.ts` (nuevo) — REQ-DEI-7

Patrón `audit-gate.spec.ts` (mkdtemp + writeFile). Raíz de verificación temporal: `mkdtemp(join(tmpdir(), 'rns-fresh-'))` + `mkdir(traceability)`.

| Caso | Setup | Oráculo exacto |
|---|---|---|
| 1. Stale | `traceability/registry.json` con `{gitSha: 'aaaa…'}` | `checkRegistryFreshness(root, 'bbbb…')` → `{ fresh: false, diskGitSha: 'aaaa…' }` |
| 2. Fresh | `gitSha` igual al head | `{ fresh: true, … }` |
| 3. Ausente | sin registry.json | `fresh === false`, `diskGitSha === '(missing)'` |
| 4. Malformado | `'{not json'` | `rejects.toThrow(/registry.json/)` (error duro) |
| 5. Sintético | registry con otros campos | la guard solo lee `gitSha` (tolera campos extra del schema real) |

### 3.3. Ajustes en specs de control-plane (M2/M5/M4 — T1)

- `capability-parsers.spec.ts`: en cada parser (skill/pack/profile/workflow/recipe) un caso nuevo `carries the manifest sha256 (REQ-DEI-2)`: llamada con `'a'.repeat(64)` → `expect(result.sha256).toBe('a'.repeat(64))` (no vacío = pass-through). Las llamadas existentes ganan el argumento hex; sus asserts actuales no cambian.
- `loader.diagnostics.spec.ts`: port C3.2 (caso 1 añade `schemaIdFor(doc) === null`; caso 3 añade aserción del keyword `'schema-undispatchable'`; not-throw se conserva).
- `decisions-command-sinks.spec.ts`: describe `pickCommandSink` eliminado; los tests de `downloadWrite` y FSA intactos (verifican el helper transitivamente vía los stubs de globals).
- `recipe-sinks.spec.ts`: sin edición — su test principal ya afirma el contrato completo de `downloadPlanSink.write` con stubs `URL.createObjectURL/revokeObjectURL` (resultado `downloadUrl === 'blob:fake-0'`, anchor, blob con el JSON): es el oráculo del retorno N6 a través del helper.
- `comic-renderer.spec.ts` / `comic-renderer-manga.spec.ts`: solo cambia la ruta del import (L3); asserts intactos, incluido el roundtrip REQ-CR-4.

### 3.4. Calendario de ejecución por fase (testing incremental)

**Fase B1 — M3+L1 (build.ts) [T1/T2]:**
1. RED: describe M11 (§3.1) → falla (hoy no hay M11).
2. GREEN: label + overrides + títulos derivados + borrado del mapa muerto + comentarios (C1). T0: `pnpm typecheck` en verification/.
3. T2 acotado: `pnpm vitest run test/baseline-audit.spec.ts test/audit-gate.spec.ts test/scenarios.spec.ts` en verification/ (los consumidores del registry).

**Fase B2 — M2 sha256 [T0/T1/T2]:**
1. RED: asserts sha en `capability-parsers.spec.ts`.
2. Generador + parsers + manifest + index (C2) → `node scripts/generate-capability-manifest.mjs` (2 veces + `diff` para AC-1) → GREEN. T0: `pnpm typecheck` (fallaría con manifest-data stale → fail-fast esperado).
3. T2: `pnpm vitest run test/capability-parsers.spec.ts test/capability-doc-card.spec.ts test/capability-cross-ref.spec.ts` + fixture L5 sin efecto (`capability-manifest-snapshot` no aserta hashes).

**Fase B3 — M5+M4 [T0/T1/T2]:**
1. Port loader.diagnostics + error explícito (C3) — RED/GREEN.
2. Borrar `pickCommandSink` + describe (C4) — el spec queda verde sin el describe.
3. T2: `pnpm vitest run test/loader.diagnostics.spec.ts test/schema-fixtures.spec.ts test/decision-projection.schema-fixtures.spec.ts test/decisions-command-sinks.spec.ts` + `pnpm typecheck`.

**Fase B4 — M1+L3+L5 [T0/T2]:**
1. `src/lib/download.ts` + 5 retargets (C5) — refactor puro; T2: `pnpm vitest run test/recipe-sinks.spec.ts test/decisions-command-sinks.spec.ts` (transitivo) + specs de vistas si existen (grep: no hay specs de PublishingProof/ComicProof/ReaderFeedbackForm — verificado por ausencia en el listado de test/).
2. L3: retarget + borrado del shim → `pnpm vitest run test/comic-renderer.spec.ts test/comic-renderer-manga.spec.ts`.
3. L5: comentario del fixture → suite de fixtures del manifest verde (ya en T2 de B2).
4. Greps de cierre por AC (createObjectURL/pickCommandSink/areaToMilestone/comic-renderer/zip/computeSha256/stub) — evidencia para el verification-report.

**Fase V — verificación del ciclo (canónica):**
1. `control-plane`: `pnpm typecheck` + batería afectada completa: los 8 specs de exploración §8 + `loader.diagnostics` + `schema-fixtures` + `decision-projection.schema-fixtures` (11 specs). Batería completa `pnpm vitest run` solo si la selección deja dudas o la exige un gate posterior (impacto acotado: los módulos tocados tienen los consumidores listados arriba).
2. `verification`: `pnpm typecheck && pnpm test` (batería completa del harness — pequeña y es la que protege el registry; incluye los describes nuevos).
3. Commit final → `git status --porcelain` vacío → `node verification/src/index.ts traceability build` → `node verification/src/index.ts audit all` → **oráculo canónico C8**. Este comando es la evidencia primaria del verification-report.
4. `node verification/src/index.ts verify` canónica sin regresión (11/11 escenarios PASS; no se añaden escenarios ni waivers).
5. Hash antes/después de `audit all` sobre `registry.json`/`coverage-matrix.md`/`baseline-m0-m10-2.md` (AC-3 de REQ-DEI-7) → registrado en el verification-report.

---

## 4. Plan de ejecución para Build (resumen de delegación)

| Fase | Responsable | Entregables verificables |
|---|---|---|
| B1 | Implementador | build.ts (M11+overrides+títulos+L1+comentarios) + describe M11 verde + typecheck verification |
| B2 | Implementador | generador+parsers+manifest+index (M2) + manifest-data regenerado determinista + capability-parsers/doc-card verdes + fixture L5 |
| B3 | Implementador | registry.ts (C3) + port loader.diagnostics + pickCommandSink fuera (C4) + 4 specs verdes + typecheck |
| B4 | Implementador | `src/lib/download.ts` + 5 retargets + shim zip fuera + comic-renderer specs verdes + greps AC |
| V | Verificador | 11 specs control-plane verdes + batería verification verde + `traceability build` + `audit all` con C8 (PASS, proven 83, 0 UNMAPPED) + `verify` 11/11 + hashes AC-3 + verification-report con la precisión C2.3 y los greps de cierre |

---

## 5. Evaluación de deuda (severidad / prioridad)

| ID | Deuda | Severidad | Prioridad | Disposición en este ciclo |
|---|---|---|---|---|
| M3 | Milestone sin label se cae silenciosamente del inventario canónico (M11: UAT + 4 REQ fuera; ni gaps ni brokenReferences lo detectan — omisión estructural). Defecto de integridad de evidencia. | **Alta** | 1 (este ciclo) | **Reparada** (C1) + guard de REQ-DEI-7 impide que el artefacto en disco vuelva a quedar stale sin señal. |
| M2 | Cadena sha256 muerta: `computeSha256` devuelve `''` SIEMPRE (cero callers de `computeSha256Async`) → catalog emite hashes vacíos surfaced a MetadataCard. | Media (evidencia de contenido falsa/ vacía) | 2 | **Reparada** (C2): sha real en build time, cadena muerta eliminada. |
| M5 | Comentarios falsos de stub + fallback de `validate` dependiente del orden de inserción (error arbitrario, no determinista). | Media | 3 | **Reparada** (C3): comentarios fuera, error explícito determinista, specs portados. |
| M4 | `pickCommandSink` producción-muerto (el composer usa try/catch explícito) — sugiere un selector vigente que no existe en la ruta real. | Baja | 4 | **Reparada** (C4). |
| M1 | Trigger de descarga duplicado en 5 sitios (2 verbatim) — divergencia futura probable ante cualquier cambio del patrón blob→anchor→revoke. | Media (mantenibilidad) | 5 | **Reparada** (C5): único helper en `src/lib/download.ts`. |
| L1/L3/L5 | Mapa muerto + shim back-compat obsoleto + comentario con sha histórico — ruido que engaña al lector/agente. | Baja | 6 | **Reparada** (C6). |
| DEBT-DEI-1 | REQ-M11-5/6 quedan fuera del inventario (carry-forward INCs de M11 v0.15.0, sin test/scenario que los cite — N2). | Media (visibilidad) | — | **Aceptada y documentada** (espec, aritmética): mapearlos exigiría waivers nuevos (decisión de autoridad de gaps) o citarlos en el yaml canónico (altera evidencia ejecutada). Igual trato que CPS. Propiedad del orquestador si alguna vez quiere inventariarlos. |
| DEBT-DEI-2 | Niveles `functional` de REQ-M11-1..4 dependen de veredictos retenidos de SCN-M11-01-001; no se re-ejecuta el escenario en este ciclo. | Baja | — | Aceptada (espec: «Qué NO prueba»); re-ejecución es decisión del verificador; los 3 veredictos PASS están en `verification/evidence/`. |
| DEBT-DEI-3 | El filename canónico `baseline-m0-m10-2.md` conserva el rango histórico mientras los títulos derivan del estado real (`M0–M17`). | Info (cosmética) | — | No se toca: renombrar rompería referencias a artefacto canónico; decisión de nombrado pertenece al orquestador. |
| DEBT-DEI-4 | `parseProvider` no emite sha256 (empty-state DD-4); cuando exista el primer provider yaml, el generador deberá añadir su fuente + sha. | Info | — | Nota de diseño registrada (C2.3); no bloquea. |
| DEBT-DEI-5 | L2 (MetadataCard reserved keys) y L4 (docsSafeMarkdown/DocTab comments) permanecen en backlog. | Baja | — | Fuera de scope (espec); propiedad del orquestador. |

Ninguna deuda abierta bloquea la transición a Build: las reparadas se cierran con los contratos C1–C7 y las aceptadas están registradas con su razón y propietario.

---

## 6. Autoevaluación del gate `architecture-consistent`

1. **Reutiliza mecanismos existentes, no introduce abstracciones**: overrides individuales (patrón REQ-DOC, `build.ts:305-309`), label map (patrón M16), hash en el generador build-time existente (patrón generate-recipe-assets; node:crypto stdlib, sin dependencias nuevas), `src/lib` (precedente store-zip/epub.ts:14), guard como función exportada consumida por la rama CLI existente (patrón error-duro de `audit.ts:39-42`). El único fichero nuevo de producto es el helper de dedup M1 que la spec exige.
2. **Coherente con los contratos vigentes**: producción de control-plane sin cambios de comportamiento (composer try/catch, `validateCommandRecord`, sinks FSA, roundtrip zip REQ-CR-4); `validate<T>` conserva su unión de retorno y su no-throw; el audit conserva su contracto de solo-escritura de `audit/*` y jamás auto-regenera; la unión de paths de descarga conserva paridad exacta (incluido revoke 10 s) salvo la unificación declarada.
3. **Alcance mínimo demostrable**: 1 fichero nuevo de producto (~14 líneas), ~12 ficheros modificados con ediciones acotadas a las líneas citadas, 1 spec nuevo de verification + 1 describe, regeneración canónica. Todo lo demás queda fuera explícitamente (§1 «Fuera de alcance», §7).
4. **Honestidad**: la precisión de atribución C2.3 (parseProvider vs parseRecipe) se registra para el verification-report en lugar de reescribir la spec silenciosamente; los cambios de conteos canónicos (79→83) se declaran como efecto legítimo documentado; el roadmap se actualiza de forma aditiva; las decisiones habilitadas por la spec (fail-vs-warn, alcance de la guard, títulos derivados, comentario del fixture, línea de roadmap) están tomadas y justificadas en C1.3, C7.2-C7.3, C6 y C9.

---

## 7. Qué NO hace este diseño (heredado de la spec)

- No reconecta el área CPS→M16 ni inventaria REQ-M11-5/6; no añade waivers ni escenarios nuevos.
- No extiende `triggerDownload` a abstracción store-writer ni consolida los sinks FSA.
- No auto-regenera el registry desde el audit; la guard no aplica a `audit milestone`/`range` ni al `verify`.
- No renombra `baseline-m0-m10-2.md` ni toca internals de `store-zip.ts`, svg/layout/types, oráculo Ajv2020, `entityLinkPlugin`, `Decisions.tsx`.
- No re-ejecuta SCN-M11-01-001 ni eleva niveles de REQ-DEI-* (todos `fitness`, fuera del inventario).
- No toca L2/L4 (backlog del orquestador) ni tramita tagging/release v0.23.1 (procedimiento del orquestador).
