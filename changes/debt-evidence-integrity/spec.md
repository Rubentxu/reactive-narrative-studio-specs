# Specification — debt-evidence-integrity (cierre de deuda: integridad de evidencia de trazabilidad, sha256 muerto, dead code y dedup del trigger de descarga)

**Ciclo**: `p-de82af3e9774d9a0/debt-evidence-integrity` · **Rama**: `feat/debt-evidence-integrity` · **Revisión base**: `e2f33bbd0416497c81b6daea765dba7a1938c2ba` (v0.23.0; verificada con `git rev-parse HEAD` en esta fase)
**Fuentes**: `exploration-report.md` del ciclo (6 work items de deuda confirmados sobre e2f33bb: M3, M2, M5, M4, M1, L1/L3/L5, + hallazgos N1–N6); `verification/src/traceability/build.ts`; `verification/src/audit/audit.ts`; `verification/src/index.ts`; `control-plane/src/features/capability-catalog/parser.ts`; `control-plane/src/schema/registry.ts`; `control-plane/src/features/decisions/commandSinks.ts`; `control-plane/src/features/recipes/DownloadPlanSink.ts`; `docs/19-ROADMAP.md`; `verification/traceability/requirement-levels.json:74-97`; `verification/traceability/registry.json` (leído en esta fase).
**Naturaleza del ciclo**: sin features nuevas — fix/refactor/test/chore → v0.23.1. Todos los requisitos son propiedades del generador de trazabilidad, refactors de control-plane y eliminación de código muerto.

**Niveles** (convención del repo, `audit.ts:126-150` — `deriveRequirementStatus`): `functional` exige veredicto PASS de escenario mapeado (solo testRefs → PARTIALLY_VERIFIED, blocking); `fitness` acepta test refs de componente (→ PROVEN). Los 7 REQ-DEI se declaran a nivel **`fitness`** (exploración §7): son propiedades verificables por tests de componente, greps y regeneración auditada; ninguno exige escenario E2E nuevo — el escenario M11 (`SCN-M11-01-001`) ya existe y sus veredictos PASS están retenidos (N5). **Nota de visibilidad de inventario**: los REQ-DEI-* de este spec NO entran al inventario de trazabilidad — la cosecha los recoge en `reqSources` (`build.ts:149-156`), pero el área `DEI` no tiene mapping en `reqBelongsToMilestone` (`build.ts:312-341`) ni override, y el audit solo itera los requisitos de milestones (`audit.ts:159-175`); verificado en esta fase que no producen UNMAPPED ni alteran coverage.

## Alcance

**In scope**: (1) M3 — restaurar M11 Human Reader UAT al inventario de trazabilidad (label, overrides individuales REQ-M11-1..4, títulos derivados) + guard de frescura del registry en disco (N3); (2) M2 — sha256 real calculado en build time por el generador del capability-catalog y eliminación de la cadena sha muerta en `parser.ts`; (3) M5 — comentarios falsos de stub y fallback dependiente del orden en `registry.ts`; (4) M4 — `pickCommandSink` producción-muerto; (5) M1 — deduplicar el trigger de descarga (5 sitios, 2 verbatim) en `src/lib/download.ts`; (6) L1/L3/L5 — mapa muerto `areaToMilestone`, shim `comic-renderer/zip.ts`, comentario con sha antiguo; (7) regeneración de artefactos canónicos (`traceability build` + `audit all`) sobre el árbol final commiteado.

**Fuera de scope** (exploración §5, §6): L2 (MetadataCard reserved keys) y L4 (docsSafeMarkdown/DocTab comments) — backlog del orquestador; internals de `store-zip.ts`, comic-renderer svg/layout/types, oráculo schema Ajv2020, branches m16/capability de `entityLinkPlugin`, `Decisions.tsx` dual composer, `dangerouslySetInnerHTML` de ComicProof (verificados por el agente de deuda, no se tocan); reconnectar el mapa de áreas CPS→M16 (`build.ts:302-304`: exclusión deliberada); waivers nuevos para REQ-M11-5/6 (decisión de autoridad de gaps, innecesaria — N2); abstracción store-writer o consolidación de sinks FSA (riesgo 5 de la exploración: NO extender la dedup M1); auto-regeneración del registry dentro del audit (N3: enmascararía olvidos); re-ejecución del escenario SCN-M11-01-001 (evidencia PASS vigente; re-ejecutar es decisión del verificador); tagging/release v0.23.1 (procedimiento del orquestador).

---

### REQ-DEI-1 — El inventario de trazabilidad incluye el milestone M11 con su UAT y requisitos

**Nivel**: `fitness` — evidencia obligatoria: tests de componente del registry (verification/test) + regeneración auditada de artefactos canónicos.

**Afirmación**: `buildRegistry` SHALL incluir el milestone `M11` con label `'Human Reader UAT'` (nombre canónico del roadmap, `docs/19-ROADMAP.md:162`) añadiéndolo a `MILESTONE_LABELS` (`build.ts:66-87`, hoy salta de M10.2.1 a M12), de modo que: (a) `UAT-M11-01` (`uat/UAT-M11-01.md`, existente) entre al registry como `EXECUTABLE` — `milestoneOfUat` (`build.ts:104-105`) ya deriva `'M11'` del nombre del fichero, pero hoy el filtro de milestones (`build.ts:199`) lo descarta silenciosamente por falta de label; (b) los requisitos `REQ-M11-1..4` entren al inventario de M11 vía **overrides individuales** `'REQ-M11-1': 'M11'` … `'REQ-M11-4': 'M11'` en `REQ_MILESTONE_OVERRIDES` (`build.ts:305-309`, patrón exacto REQ-DOC-3/4/5). Los requisitos `REQ-M11-5` y `REQ-M11-6` SHALL NO entrar al inventario (sin override: no aparecen en ningún test ni scenario — exploración N2, grep verificado; un mapping de área completo los dejaría UNMAPPED = +2 gaps MEDIUM → audit FAIL; quedan fuera como ya ocurre con CPS, decisión documentada en `build.ts:302-304`). Los títulos de `coverage-matrix.md` y `baseline-m0-m10-2.md` SHALL derivarse de `MILESTONE_LABELS` (o constante compartida) en lugar del literal hardcodeado `"M0–M10.2"` (`build.ts:345`, `build.ts:378`).

**Criterios de aceptación**:
- **AC-1**: tras `node verification/src/index.ts traceability build` sobre el árbol final commiteado, `verification/traceability/registry.json` contiene el milestone `M11` con label `'Human Reader UAT'`, `UAT-M11-01` con `status: EXECUTABLE` (referenciado por `verification/scenarios/scn-m11-01-001.yaml:1-3`) y `REQ-M11-1..4` con `status: MAPPED` y `scenarios: [scn-m11-01-001.yaml]`.
- **AC-2**: coverage del registry regenerado: `requirements 83 · mapped 83 · unmapped 0 · uats 23 · executable 10`; `waived: 1` sin cambio (waiver registrado WVR-M10-2-1-002, requisito PROVEN por testRefs); `brokenReferences: []`.
- **AC-3**: los headers de `coverage-matrix.md` y `baseline-m0-m10-2.md` regenerados no contienen el literal `"M0–M10.2"` hardcodeado; el rango visible se deriva del estado real. Ningún test de `verification/test/` aserta esos headers (exploración N4, grep verificado).
- **AC-4**: con los veredictos PASS retenidos de `SCN-M11-01-001` (último: `run-2026-10-01T05-50-14-164Z-817e37b6`), `node verification/src/index.ts audit all` produce `overall: PASS — proven 83 · waived 0 · blocking 0` (los REQ-M11-1..4 son `functional` con escenario PASS → PROVEN, `audit.ts:131-135`; sus niveles ya declarados en `requirement-levels.json:74-97` — N1 — se conservan sin cambios).

**Escenario (regeneración)**:
- GIVEN el árbol final del ciclo commiteado (fixes M3/M2/M5/M4/M1/L1/L3/L5 aplicados)
- WHEN se ejecuta `traceability build` y después `audit all`
- THEN registry.json, coverage-matrix.md y baseline-m0-m10-2.md muestran `M11 — Human Reader UAT` con UAT-M11-01 EXECUTABLE y REQ-M11-1..4 MAPPED, y el audit all reporta `PASS — proven 83 · waived 0 · blocking 0`, 0 UNMAPPED

**Qué NO prueba**: la ejecución del navegador del escenario SCN-M11-01-001 (los veredictos PASS retenidos son evidencia vigente en `verification/evidence/run-*`; este requisito prueba el INVENTARIO, no el comportamiento de la UI); los cierres de INC de REQ-M11-5/6 (verificados históricamente en M11 v0.15.0 y quedan fuera del inventario por decisión N2); el contenido de `changes/m11-human-reader-uat/spec.md` (fuente de reqSources, sin cambios).

**Nota de trazabilidad**: el defecto que repara este requisito es de integridad de evidencia: un milestone sin label en `MILESTONE_LABELS` se cae silenciosamente del registro canónico (ni gap ni brokenReference lo detectan — `build.ts:272-276` solo flaggea referencias rotas, y la omisión es estructural). El override es individual y NO de área (N2). `docs/19-ROADMAP.md:7` («proven 79 / waived 0 / blocking 0») es registro histórico del hito v0.23.0 — design decide si la línea se actualiza o se añade la nueva junto a ella (N4).

---

### REQ-DEI-2 — El capability-catalog emite sha256 real calculado en build time

**Nivel**: `fitness` — evidencia obligatoria: capability-parsers / capability-doc-card / capability-cross-ref specs + determinismo del generador.

**Afirmación**: el generador del manifest (`control-plane/scripts/generate-capability-manifest.mjs`, hoy sin cálculo de hash — grep verificado) SHALL calcular el sha256 hex (64 chars) del contenido de cada entry con `node:crypto` y escribirlo en `control-plane/src/features/capability-catalog/data/manifest-data.json` de forma determinista. Los 5 parsers (`parser.ts:190` parseSkill, `:266` parsePack, `:326` parseProfile, `:360` parseWorkflow, `:407` parseProvider) SHALL emitir el `sha256` leído del manifest en lugar del valor de `computeSha256` (que hoy devuelve `''` SIEMPRE: `parser.ts:125-127` lee `sha256Cache`, nunca poblada porque `computeSha256Async` — `:108-119` — tiene CERO callers, exploración M2). La cadena muerta `sha256Cache` (`:102`), `computeSha256Async` (`:108-119`), `computeSha256` (`:125-127`) y sus re-exports sin uso (`manifest.ts:20` import, `manifest.ts:127-128` re-export, `index.ts:37` re-export) SHALL eliminarse.

**Criterios de aceptación**:
- **AC-1**: `manifest-data.json` regenerado contiene `sha256` hex de 64 caracteres por entry; dos ejecuciones consecutivas del generador sobre el mismo árbol producen ficheros byte-idénticos (determinismo, paridad con la política de reproducción — exploración riesgo 3).
- **AC-2**: `capability-parsers.spec.ts` verde con assertions sobre sha no vacío; el hash surfaced a MetadataCard vía `m16EntityBridge.tsx:33-40` (`sha256: entry.sha256` en baseMetadata) muestra un hash real (cambio de UI benigno declarado).
- **AC-3**: `grep -rn "computeSha256" control-plane/src` → sin resultados (incluye re-exports); `grep -rn "sha256Cache\|computeSha256Async" control-plane/` → sin resultados.
- **AC-4**: `test/capability-doc-card.spec.ts:45` (fixture con `sha256: ''`) y fixtures afines actualizados a hashes consistentes con el manifest regenerado; `tsc` de control-plane en verde.

**Qué NO prueba**: la integridad del manifest contra manipulación en runtime (el sha es evidencia de contenido calculada en build time, no un mecanismo de seguridad en runtime); la Web Crypto API (se elimina con la cadena muerta); consumidores del manifest fuera de control-plane; el contenido de los skills/packs/profiles/workflows/providers en sí (solo el campo sha256).

---

### REQ-DEI-3 — registry.ts sin comentarios falsos de stub y sin fallback dependiente del orden

**Nivel**: `fitness` — evidencia obligatoria: los 3 specs que consumen `validate<T>` portados + greps.

**Afirmación**: `control-plane/src/schema/registry.ts` SHALL eliminar los comentarios falsos de stub en `:26` (`CP_DECISIONS_ID stub only — full schema file created in Block 3`) y `:50` (`// stub — full schema in Block 3`): `specs/cp-decisions.schema.json` y `specs/cp-commands.schema.json` existen y el dispatch funciona desde ciclos (exploración M5, ls verificado). El `validate<T>()` genérico SHALL eliminar el fallback que itera `schemaById` en orden de inserción cuando `schemaIdFor` no despacha (`:96-119`, hoy devuelve el primer error dependiente del orden, no del fit) y SHALL fallar con un error explícito de "schema no despachable" cuando `schemaIdFor` (`:83-94`) no resuelve por `schema` const o `apiVersion`.

**Criterios de aceptación**:
- **AC-1**: `grep -n "stub" control-plane/src/schema/registry.ts` → sin resultados; los comentarios de `:26` y `:50` ya no existen.
- **AC-2**: los 3 únicos specs que importan el `validate` genérico (`test/loader.diagnostics.spec.ts:3`, `test/schema-fixtures.spec.ts:2`, `test/decision-projection.schema-fixtures.spec.ts:16`) están portados a dispatch explícito vía `schemaIdFor` (dos de ellos ya lo importan) o a sus validaciones dedicadas; la batería afectada en verde.
- **AC-3**: un payload que `schemaIdFor` no despacha produce el error explícito nuevo (no un error de un schema arbitrario según orden de inserción); test de componente que lo demuestra.
- **AC-4**: producción intacta: `validateCommandRecord` (`features/decisions/validate.ts:19`) y `validateAndLoadProjections` (loader) sin cambios de comportamiento.

**Qué NO prueba**: los esquemas JSON en `specs/*.schema.json` (solo cambian los comentarios del registro TS); la frontera AJV dedicada de decisiones; el contenido semántico de los schemas despachados (regresión por los 3 specs portados).

---

### REQ-DEI-4 — pickCommandSink eliminado (código producción-muerto)

**Nivel**: `fitness` — evidencia obligatoria: decisions-command-sinks.spec verde sin el describe + grep de ausencia.

**Afirmación**: `pickCommandSink()` (`control-plane/src/features/decisions/commandSinks.ts:76-78`, isSupported-gated) SHALL eliminarse: cero uso en producción (grep verificado — el composer usa try/catch explícito `fileSystemAccessCommandSink.write` → catch `downloadCommandSink.write`, `CommandComposer.tsx:~104-114`, razón documentada: user abort/headless). Su describe en `test/decisions-command-sinks.spec.ts` (`:20` import, `:141-151` describe con 2 tests) SHALL eliminarse junto al símbolo. Los sinks `fileSystemAccessCommandSink`, `downloadCommandSink` y `downloadIsSupported` SHALL permanecer intactos.

**Criterios de aceptación**:
- **AC-1**: `grep -rn "pickCommandSink" control-plane/src control-plane/test` → sin resultados.
- **AC-2**: `decisions-command-sinks.spec.ts` en verde sin el describe eliminado; el resto del spec (tests de `downloadWrite` y FSA) intacto.

**Qué NO prueba**: el fallback FSA→download del composer (intacto por diseño; este requisito solo elimina el selector muerto); el comportamiento de `isSupported()` en los sinks individuales (se conservan).

---

### REQ-DEI-5 — Un único trigger de descarga en src/lib/download.ts usado por los 5 sitios

**Nivel**: `fitness` — evidencia obligatoria: recipe-sinks + decisions-command-sinks specs + grep de ausencia de duplicación.

**Afirmación**: SHALL existir un único módulo `control-plane/src/lib/download.ts` (patrón de aislamiento `src/lib`, precedente `features/epub/epub.ts:14` → `../../lib/store-zip`) que exporte `triggerDownload(data: BlobPart, filename: string, mime: string): string`: crea el `Blob`, el `URL.createObjectURL`, dispara el anchor `download` oculto, programa el `revokeObjectURL` (10 s, paridad con el comportamiento actual) y **devuelve el objectURL** (N6: `DownloadPlanSink.write` devuelve `downloadUrl: url`, `DownloadPlanSink.ts:47`; los sitios que no lo usan lo ignoran). Los 5 sitios SHALL usar el helper y SHALL eliminar sus copias locales: `views/PublishingProof.tsx:18-29` y `views/ComicProof.tsx:24-35` (copias verbatim de `downloadBlob` — cuerpos idénticos leídos en la exploración), `features/decisions/commandSinks.ts:51-68` (`downloadWrite`), `features/recipes/DownloadPlanSink.ts:29-47`, `features/human-reader/ReaderFeedbackForm.tsx:~70-79`. El helper SHALL NOT convertirse en abstracción store-writer ni consolidar los sinks FSA (riesgo 5 de la exploración).

**Criterios de aceptación**:
- **AC-1**: `grep -rn "createObjectURL" control-plane/src` → únicamente `src/lib/download.ts`.
- **AC-2**: los 5 sitios importan y llaman al helper (sin copias locales de la lógica blob→anchor→revoke); `PublishingProof`, `ComicProof`, `ReaderFeedbackForm` y `commandSinks` ignoran el retorno; `DownloadPlanSink` lo retorna como `downloadUrl`.
- **AC-3**: `recipe-sinks.spec.ts` y `decisions-command-sinks.spec.ts` en verde — los stubs de globals (`document`, `URL`) existentes aplican igual al helper porque vive en `src/lib` y se ejercita vía los mismos consumidores (N6); specs de las vistas afectadas en verde si existen.

**Qué NO prueba**: la descarga real en navegador (jsdom stubs; el escenario E2E de M11 ya cubre la descarga JSONL del formulario); la eliminación de `downloadCommandSink` o del patrón FSA (ambos intactos); el comportamiento del revoke diferido más allá de la paridad con el código actual.

---

### REQ-DEI-6 — Dead code y comentarios engañosos eliminados (L1, L3, L5)

**Nivel**: `fitness` — evidencia obligatoria: comic-renderer specs verdes + greps.

**Afirmación**: (a) el mapa muerto `areaToMilestone` (`build.ts:317-325`, declarado dentro de `reqBelongsToMilestone` y jamás leído) y su supresor `void areaToMilestone` (`build.ts:339`) SHALL eliminarse SIN reconectar el mapa (el entry `CPS: 'M16'` permanece deliberadamente muerto para mantener REQ-CPS-* fuera del inventario — `build.ts:302-304`); (b) el shim back-compat `control-plane/src/features/comic-renderer/zip.ts` (re-export `../../lib/store-zip`) SHALL eliminarse con retarget de sus 3 importadores: `cbz.ts:11` (`from './zip'` → `from '../../lib/store-zip'`), `test/comic-renderer.spec.ts:19` y `test/comic-renderer-manga.spec.ts:17` (`'../src/features/comic-renderer/zip'` → `'../src/lib/store-zip'` — importadores verificados en esta fase); (c) el comentario con sha de commit antiguo en `test/fixtures/capability-manifest-snapshot.ts:4` (`Expected manifest at HEAD 364571c:`) SHALL actualizarse o eliminarse (el sha de referencia de fixtures no puede apuntar a una revisión histórica sin vigencia).

**Criterios de aceptación**:
- **AC-1**: `grep -rn "areaToMilestone" verification/src` → sin resultados (incluye el `void`).
- **AC-2**: `control-plane/src/features/comic-renderer/zip.ts` no existe; `grep -rn "comic-renderer/zip\|from './zip'" control-plane/` → sin resultados; `comic-renderer.spec.ts` y `comic-renderer-manga.spec.ts` en verde (el roundtrip zip de REQ-CR-4, `comic-renderer.spec.ts:100-114`, queda intacto vía `store-zip`).
- **AC-3**: `capability-manifest-snapshot.ts` ya no referencia el sha `364571c`; la suite de fixtures del manifest en verde.

**Qué NO prueba**: los internals de `store-zip.ts` (fuera de alcance, ask); la lógica cbz/svg/layout de comic-renderer (solo cambia el origen del import); la decisión de inventario CPS→M16 (permanece como está, comentario `build.ts:302-304` intacto en su sustancia).

---

### REQ-DEI-7 — Guard de frescura del registry en disco durante `audit all`

**Nivel**: `fitness` — evidencia obligatoria: test de componente del audit + demostración en la regeneración final.

**Afirmación**: `audit all` SHALL comparar el `gitSha` grabado en `verification/traceability/registry.json` en disco (escrito por `traceability build` con `git rev-parse HEAD`, `build.ts:116`/`:283`) contra el HEAD actual del repositorio y SHALL surfacear la divergencia cuando exista (como mínimo un aviso visible en la salida; design decide warn vs fail — N3). El audit SHALL NOT auto-regenerar el registry ni ningún artefacto canónico dentro de la ejecución del audit (enmascararía olvidos: `auditRequirements` ya reconstruye el registry en memoria para sus cómputos, `audit.ts:159` — la guard vigila el artefacto canónico en disco, que es lo que consumen los lectores humanos y los receipts). Motivación demostrada en esta fase: `registry.json` en disco @e2f33bb lleva `gitSha 3071e473ae12` mientras HEAD es `e2f33bb…` — el defecto de la clase que este ciclo repara (M11 cayó del inventario y el artefacto en disco quedó stale sin señal alguna).

**Criterios de aceptación**:
- **AC-1**: con un `registry.json` cuyo `gitSha` difiere de HEAD, la ejecución de `audit all` surfacea la divergencia de forma observable en su salida (severidad warn/fail según design).
- **AC-2**: con el árbol final commiteado y los artefactos regenerados por `traceability build`, `audit all` no emite la señal de divergencia y termina PASS.
- **AC-3**: la ejecución de `audit all` no reescribe `registry.json`, `coverage-matrix.md` ni `baseline-m0-m10-2.md` (la regeneración sigue siendo exclusivamente explícita vía `traceability build`, `index.ts:230-239`); test de componente que lo demuestra o verificación por mtime/hash antes-después en el verification-report.

**Qué NO prueba**: la exactitud del contenido del registry (eso es REQ-DEI-1); el comportamiento del audit con scope `--milestones` parcial (design decide si la guard aplica solo a `all`); la detección de drift en `audit/*.json` (fuera de alcance — solo el registry de trazabilidad).

---

## Aritmética de trazabilidad y audit (honestidad del objetivo)

- **Base verificada en esta fase**: `verification/audit/all.md` @e2f33bb — `overall: **PASS** — proven 79 · waived 0 · blocking 0` (línea citada también en `docs/19-ROADMAP.md:7`). `registry.json` en disco: coverage `{requirements: 79, mapped: 79, unmapped: 0, uats: 22, executable: 9, waived: 1}` (el `waived: 1` del registry cuenta el waiver registrado `WVR-M10-2-1-002` — requisito PROVEN por testRefs; el `waived 0` del audit cuenta estados WAIVED de requisitos: contadores distintos, ambos citados tal cual).
- **Crecimiento esperado (N5)**: +REQ-M11-1..4 bajo M11 con escenario PASS retenido → `proven 83 · waived 0 · blocking 0`; coverage `83/83 mapped, 0 UNMAPPED, uats 23, executable 10`; `brokenReferences: []`. Nueva sección `M11 — Human Reader UAT` en matrix y baseline. Los REQ-DEI-* de este spec no alteran coverage (sin mapping — ver arriba).
- **Regeneración obligatoria con el árbol final commiteado** (REQ-DEI-1 AC-1/AC-4, REQ-DEI-7 AC-2): `node verification/src/index.ts traceability build` + `node verification/src/index.ts audit all`. El `registry.json` en disco está hoy stale respecto de HEAD (gitSha `3071e473ae12` ≠ `e2f33bb…` — verificado en esta fase): la regeneración final lo corrige y la guard de REQ-DEI-7 impide que vuelva a ocurrir sin señal.
- **Conteos canónicos que cambian**: 79→83 requirements (inventario), 22→23 UATs, 9→10 executable, proven 79→83. Efecto legítimo de M3, no manipulación: los requisitos y el UAT ya existían (`changes/m11-human-reader-uat/spec.md`, `uat/UAT-M11-01.md`, `scn-m11-01-001.yaml` con veredictos PASS retenidos) y fueron excluidos por el defecto estructural del label.

## Criterios de aceptación del ciclo (resumen para el gate)

1. REQ-DEI-1..7 con sus criterios de aceptación verdes a nivel `fitness` (tests de componente + greps + regeneración auditada; sin escenarios nuevos).
2. Canónica `node verification/src/index.ts verify` sin regresión: los 11 escenarios PASS vigentes se mantienen; no se añaden escenarios ni waivers.
3. Batería afectada de control-plane en verde (`tsc` + los 8 specs de la exploración §8: capability-parsers, capability-doc-card, capability-cross-ref, recipe-sinks, decisions-command-sinks, docs-sanitization, comic-renderer, comic-renderer-manga) + los 3 specs portados de registry (loader.diagnostics, schema-fixtures, decision-projection.schema-fixtures) + batería de verification/test.
4. `traceability build` + `audit all` regenerados sobre el árbol final commiteado: `overall: PASS — proven 83 · waived 0 · blocking 0`, 0 UNMAPPED; M11 visible en matrix/baseline con UAT-M11-01 EXECUTABLE; guard de REQ-DEI-7 sin señal de divergencia.
5. Sin features nuevas: fix/refactor/test/chore → v0.23.1 (tagging y release conforme al procedimiento del orquestador).

---

## Addendum (post-release, folded into v0.24.0 before archive)

### REQ-DEI-8 — Silent-drop guard: harvested requirements without a milestone owner surface as gaps

**Nivel**: `fitness` (test refs: `verification/test/unowned-requirements.spec.ts`).

**Afirmación**: `buildRegistry` SHALL emitir un gap `requirement-unowned` (severidad LOW) por
cada requisito cosechado desde changes/docs que `reqBelongsToMilestone` no adjudique a ningún
milestone — la clase de caída silenciosa que afectó a M11 (REQ-M11-*), REQ-DOC-3/4 y a los
propios REQ-DEI-*. Además, la cosecha SHALL ignorar artefactos de prosa plural
(`/^REQ-[A-Z0-9]+$/` en un solo segmento, p. ej. «los REQ-DEI se declaran») para no fabricar
requisitos falsos.

**Origen**: defecto detectado al regenerar la trazabilidad tras el fix del guard REQ-DEI-7 —
su semántica original (igualdad exacta de gitSha) era insatisfiable por auto-referencia (un
commit no puede contener su propio sha); la versión corregida compara contenido con la
reconstrucción en HEAD ignorando campos volátiles (`gitSha`, `generatedAt`), y la primera
regeneración con visibilidad completa destapó los 114 requisitos históricos sin dueño.
