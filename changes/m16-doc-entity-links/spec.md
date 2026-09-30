# Specification — m16-doc-entity-links (cierre de deuda backlog DOC-3/DOC-4: entity-link navegable + evidencia de test de source-path)

**Ciclo**: `p-de82af3e9774d9a0/m16-doc-entity-links` · **Rama**: `feat/m16-doc-entity-links` · **Revisión base**: `40cf870` (verificada con `git rev-parse HEAD` en la exploración)
**Fuentes**: `exploration-report.md` del ciclo (15/15 hechos del contexto verificados contra el código + hallazgos N1–N5); declaración original de REQ-DOC-3 y REQ-DOC-4 en `changes/m16-cp-studio-search-docs/spec.md:126-137` y `:139-149` (escenarios EVT-DOC-03/EVT-DOC-04); `verification/src/traceability/build.ts` (harvest, overrides, MILESTONE_LABELS); `verification/src/audit/audit.ts` (deriveRequirementStatus); `verification/audit/all.md` @40cf870 (base: PASS, proven 77); `verification/traceability/requirement-levels.json`.
**Niveles** (convención del repo, `audit.ts:175` — default `functional` si no hay entrada; `deriveRequirementStatus` `audit.ts:139-142`): `functional` exige veredicto PASS de escenario mapeado (solo testRefs → PARTIALLY_VERIFIED, blocking); `fitness` acepta test refs de componente (→ PROVEN). REQ-DOC-3 y REQ-DOC-4 se declaran en este ciclo a nivel **`fitness`**, con entrada + rationale en `requirement-levels.json` (mismo mecanismo que aplicó 40cf870 para REQ-DOC-5/REQ-CR-CAP-13). Ver justificación honesta en la sección de aritmética.

## Alcance

**In scope**: (1) el branch m16 de `entityLinkPlugin` emite anchor `<a>` navegable con href interno `/entity/{kind}/{namespace}/{name}` para entity refs válidas y deja las inválidas como texto plano; (2) nuevo test de componente que cita literalmente `REQ-DOC-3`; (3) nuevo test de componente que cita literalmente `REQ-DOC-4` sobre la lógica real de resolución source-path (DocTab + loadDocs); (4) fixture golden `nora.yaml` con la anotación `narrative.dev/source-path`; (5) visibilidad de inventario: `M16` en `MILESTONE_LABELS` + `REQ_MILESTONE_OVERRIDES` para REQ-DOC-3/4 + niveles `fitness` en `requirement-levels.json`; (6) regeneración de trazabilidad y `audit all` → PASS, proven 79, 0 UNMAPPED.

**Fuera de scope**: `Search.tsx:resultHref` (codifica solo el kind — divergencia menor documentada en la exploración, hecho #8; no se toca); refactor del guard duplicado `isSafeDocPath` en `DocTab.tsx:25-30` (hallazgo N3 — deuda observada, no se toca); TanStack `<Link>` SPA vs `<a>` full-reload (aceptado por diseño: EVT-DOC-03 acepta `<a href>` y REQ-DOC-5 ya usa `<a href>` interno en v0.22.0); escenarios YAML nuevos o elevación a nivel `functional` (N5: fuera de alcance salvo decisión del orquestador); triage de los ítems de backlog SDDK DOC-3/DOC-4 (propiedad del orquestador — exploración N4: no localizables vía `sddk backlog` desde el agente); mecanismo de routing ni la página EntityPage.

---

### REQ-DOC-3 — REFINADO (área DOC; owner M16 «Series Canon»; declaración original: `changes/m16-cp-studio-search-docs/spec.md:126-137`, escenario EVT-DOC-03)

**Nivel**: `fitness` — evidencia obligatoria: test refs de componente. Justificación: es la misma clase de cambio y del mismo pipeline que REQ-DOC-5 (m10-2-1-crossref-render), declarado fitness y PROVEN en v0.22.0; el comportamiento es local del plugin/pipeline markdown y se demuestra con tests de componente sin necesidad de escenario E2E.

**Afirmación (bloque delta que afina la original para este ciclo)**: `entityLinkPlugin` SHALL emitir, para cada entity ref válida `[[Kind:namespace/name]]` (parseable por `parseEntityRef`, `control-plane/src/store/entityRef.ts:21-29`, patrón `^([^:/]+):([^:/]+)\/([^:/]+)$` en `:19`), un anchor `<a>` con `href="/entity/{kind}/{namespace}/{name}"` construido a partir del **resultado** de `parseEntityRef` (hoy descartado en `entityLinkPlugin.ts:161`), con `encodeURIComponent` por cada uno de los tres segmentos (paridad con el branch de capacidad `entityLinkPlugin.ts:137-140` y con `KindList.tsx:74`), `className: ['doc-entity-link']` y `data-entity-ref="{ref}"`, en sustitución del span no navegable actual (`entityLinkPlugin.ts:159-176`; `hName: 'span'` en `:169`). El href SHALL construirse exclusivamente desde los componentes validados por el patrón del parser: el plugin SHALL NOT emitir `<a href>` con URL controlada por atacante (cláusula original intacta — el href es interno y derivado del parser; la sanitización es segunda barrera: `docsSafeMarkdown.tsx:42` `protocols.href` incluye `'relative'` y `:52` ya permite `href` + `data-entity-ref` en `a`, sin cambios en el allow-list). El href SHALL corresponder a la ruta registrada `entityRoute` (`control-plane/src/routes/router.tsx:49-52`, `path: '/entity/$kind/$namespace/$name'`). Las refs inválidas o que lanzan `EntityRefParseError` SHALL seguir renderizándose como texto plano (rama catch existente `entityLinkPlugin.ts:177-183` — sin cambios).

**Criterios de aceptación**:
- **AC-1**: nuevo `control-plane/test/entity-link-render.spec.ts` (nombre orientativo; patrón `capability-cross-ref.spec.ts` para el plugin directo sobre mdast + render vía `docsSafeMarkdown` con `@testing-library/react` en jsdom, patrón `docs-sanitization.spec.ts`) contiene el literal `REQ-DOC-3` (harvest de testRefs, `build.ts:184`) y aserta: (a) `[[Character:demo/nora]]` → elemento anchor con `href="/entity/Character/demo/nora"`, `class` `doc-entity-link` y `data-entity-ref="Character:demo/nora"` (ya NO un span); (b) `[[not-a-valid-ref]]` → texto plano sin elemento anchor; (c) `[[Character:demo/nora-with-javascript:alert(1)]]` (vector de EVT-DOC-03) → texto plano y el output completo no contiene `javascript:`; (d) ref válida con caracteres reservados (p. ej. `[[Character:demo/nora?x#frag]]`) → href con los segmentos codificados (`%3F`, `%23`), sin `?`/`#` crudos en el href (justifica el `encodeURIComponent` por segmento — `entityRef.ts:19` no excluye `?`/`#`/`%`).
- **AC-2**: regresión verde de los 3 specs de docs existentes (`test/docs-sanitization.spec.ts`, `test/capability-cross-ref.spec.ts`, `test/entity-page-composition.spec.ts` — baseline 35/35 PASS ejecutado en la exploración sobre 40cf870): ningún vector XSS de REQ-DOC-2 se relaja (`javascript:`/`data:` siguen eliminados) y el branch de capacidad (REQ-DOC-5, `entityLinkPlugin.ts:132-157`) queda intacto.
- **AC-3**: el oráculo original de EVT-DOC-03 se mantiene: `grep -cE 'parseEntityRef' control-plane/src/features/docs/entityLinkPlugin.ts` ≥ 1, y el href se construye desde el valor de retorno de `parseEntityRef` (el resultado deja de descartarse).
- **AC-4**: la interfaz exportada `EntityLinkNode` actualizada a `hName: 'a'` + `href` en `hProperties` (`entityLinkPlugin.ts:23-34`) con `tsc` de control-plane en verde (ningún test aserta el span actual — verificado por grep en la exploración, hecho #11).

**Escenario (happy path)**:
- GIVEN el pipeline `docsSafeMarkdown` (remarkGfm + entityLinkPlugin + rehype-sanitize) sin cambios de allow-list
- WHEN se renderiza `[[Character:demo/nora]]`
- THEN el DOM contiene `<a href="/entity/Character/demo/nora" class="doc-entity-link" data-entity-ref="Character:demo/nora">` y ningún `[[` crudo

**Escenario (edge)**:
- GIVEN el mismo pipeline
- WHEN se renderiza `[[not-a-valid-ref]]` (el parser lanza `EntityRefParseError`) o `[[Character:demo/nora-with-javascript:alert(1)]]` (el parser rechaza: `:` no permitido en segmento, `entityRef.ts:19`)
- THEN se renderiza el texto literal sin elemento anchor y sin ningún `href` que contenga `javascript:`
- **AND** WHEN se renderiza `[[Character:demo/nora?x#frag]]` (ref válida con reservados) THEN el href es `/entity/Character/demo/nora%3Fx%23frag`

**Qué NO prueba**: la navegación SPA al hacer click (un `<a>` plano provoca full-reload; aceptado por diseño — EVT-DOC-03 acepta `<a href>` y es el precedente REQ-DOC-5 publicado en v0.22.0); que exista contenido golden con entity refs (solo se afirma el comportamiento del plugin/pipeline); la resolución source-path (REQ-DOC-4); la página EntityPage y su round-trip de composición (REQ-CEP-3, ya cubierto por `entity-page-composition.spec.ts`); el render seguro del resto de markdown (REQ-DOC-2, solo regresión); otros consumidores de `EntityLinkNode` fuera de `features/docs`.

**Nota de trazabilidad**: el área `DOC` no tiene mapeo de área en `reqBelongsToMilestone` (`build.ts:312-334`) — la visibilidad de inventario es SOLO vía `REQ_MILESTONE_OVERRIDES` (`build.ts:303-306`) con la entrada `'REQ-DOC-3': 'M16'`, que exige añadir `M16: 'Series Canon'` a `MILESTONE_LABELS` (`build.ts:66-87` — **corrección honesta al contexto del ciclo: M16 NO existe hoy**; el rótulo solo está en `docs/19-ROADMAP.md:273`). El nivel `fitness` requiere entrada en `verification/traceability/requirement-levels.json` (`audit.ts:43-56` valida `level` ∈ {functional,fitness} y rationale ≥ 10 chars; sin entrada, default `functional` haría los testRefs PARTIALLY_VERIFIED = blocking, `audit.ts:139-146`).

---

### REQ-DOC-4 — REFINADO (área DOC; owner M16; declaración original: `changes/m16-cp-studio-search-docs/spec.md:139-149`, escenario EVT-DOC-04)

**Nivel**: `fitness` — evidencia obligatoria: test refs de componente. Justificación: la resolución source-path es lógica de componente (render de `DocTab` + guard de carga en `loadDocs`) verificable por test de componente con ctx simulado y con el fixture golden; no hay escenario E2E en este ciclo (N5).

**Afirmación (bloque delta que afina la original para este ciclo)**: la resolución de documentación por `metadata.annotations['narrative.dev/source-path']` SHALL demostrarse sobre la **lógica real existente** — desviación honesta declarada: la función `resolveDocsForEntity(noraEntity, docs)` nombrada en EVT-DOC-04 **no existe** en el código (exploración, hallazgo N2; verificado por grep). La lógica real es: (i) `DocTab` (`control-plane/src/features/docs/character/DocTab.tsx`) lee la anotación (`:79-80`), resuelve contra `ctx.getProjection<DocEntry[]>('docs')` (`:83`) vía `fetchDocPage` (`:37-65`) con el guard `isSafeDocPath` (`:25-30`), renderiza el body vía `docsSafeMarkdown` (`:177`) y presenta el estado vacío documentado `data-testid="doc-tab-empty"` (`:115-127`) cuando la anotación está ausente (sin error, sin tab de contenido); (ii) `loadDocs` (`control-plane/src/loader/SnapshotProjectSource.ts:270-294`) surfacea `synthetic('path-traversal', ...)` (`:279-283`) cuando el path escapa `docs/` según `isSafeRelativePath` (`:12-16`, guard de m14 preservado) y `synthetic('missing-entry', ...)` cuando el fichero no existe. Además, el fixture golden `golden/control-plane/snapshot-valid/catalog/nora.yaml` SHALL llevar `metadata.annotations['narrative.dev/source-path']: docs/nora.md` (hoy NO lo lleva — hallazgo N1; el schema lo permite: `specs/catalog-entity.schema.json` define `annotations` como objeto string→string) y `golden/control-plane/snapshot-valid/docs/nora.md` existe (verificado en esta sesión).

**Criterios de aceptación**:
- **AC-1**: nuevo `control-plane/test/doc-source-path.spec.ts` (nombre orientativo) contiene el literal `REQ-DOC-4` (harvest, `build.ts:184`) y aserta, renderizando `DocTab` con un `ExtensionContext` simulado (patrón jsdom de `docs-sanitization.spec.ts`): (a) entidad con anotación `narrative.dev/source-path: docs/nora.md` + proyección docs con el body → el contenido del doc se renderiza; (b) entidad **sin** anotación → `data-testid="doc-tab-empty"` presente, sin error y sin contenido; (c) entidad con anotación `../../etc/passwd` → sin contenido renderizado (el guard bloquea: `DocTab.tsx:42-45` hace `console.warn` + `null`).
- **AC-2**: el mismo spec aserta sobre `loadDocs` (`SnapshotProjectSource.ts:270-294`) con un manifest cuyo `docs` contiene `../../etc/passwd` → `Diagnostic` con `code === 'path-traversal'` (cláusula del escenario EVT-DOC-04 sobre el guard real `isSafeRelativePath`).
- **AC-3**: `golden/control-plane/snapshot-valid/catalog/nora.yaml` lleva la anotación `narrative.dev/source-path: docs/nora.md`; los tests afectados por el fixture (schema validation / loader / snapshots que parseen `snapshot-valid`) siguen en verde tras el cambio (ejecutar la batería afectada; si algún test rompiera por la anotación, alternativa honesta: entidad sintética dentro del test + desviación registrada en el verification-report).
- **AC-4**: ningún test nuevo referencia `resolveDocsForEntity` como símbolo importado (la función no existe); la desviación del escenario EVT-DOC-04 queda registrada en el verification-report del ciclo.

**Escenario (happy path)**:
- GIVEN `nora.yaml` con la anotación `narrative.dev/source-path: docs/nora.md` y el bundle docs con `nora.md`
- WHEN `DocTab` renderiza con `ctx` cuyo entity es nora y `getProjection('docs')` devuelve el bundle
- THEN el body de `nora.md` se renderiza vía `docsSafeMarkdown` (sin estado vacío)

**Escenario (edge)**:
- GIVEN una entidad sin la anotación → THEN `doc-tab-empty` sin error
- **AND** GIVEN una entidad con anotación `../../etc/passwd` → THEN sin contenido renderizado
- **AND** GIVEN `loadDocs` con `../../etc/passwd` en `manifest.docs` → THEN `Diagnostic` con `code === 'path-traversal'`

**Qué NO prueba**: la existencia de un resolver puro extraído (si Design decidiera extraer `resolveDocsForEntity` sería refactor fuera de alcance — la opción de mínima invasión es testear la lógica real); el flujo E2E en navegador (sin escenario YAML en este ciclo); la carga real de docs vía file-input del navegador (M10.3); el schema de anotaciones en sí (solo se usa la capacidad existente); los demás tabs de Character; la resolución de paths por `fetchDocPage` para otros patrones de path no cubiertos en los ACs.

**Nota de trazabilidad**: idéntica a REQ-DOC-3 — entrada `'REQ-DOC-4': 'M16'` en `REQ_MILESTONE_OVERRIDES` + nivel `fitness` con rationale en `requirement-levels.json`.

---

## Desviaciones honestas respecto a la declaración original (registro obligatorio para el verification-report)

1. **`<Link>` → `<a href>` interno (REQ-DOC-3)**: la declaración original (`spec.md:126`) decía «internal `<Link>` element»; su propio escenario EVT-DOC-03 (`spec.md:132`) ya acepta `<a href="/entity/Character/demo/nora">` **o** TanStack `<Link>`, y el precedente REQ-DOC-5 (ciclada y publicada en v0.22.0) emite `<a href>` interno aceptado. Es una resolución de ambigüedad, no un cambio de contrato: la cláusula SHALL NOT (URL controlada por atacante) queda intacta y el href sigue siendo interno y derivado del parser.
2. **`resolveDocsForEntity` no existe (REQ-DOC-4, hallazgo N2)**: la resolución vive inline en `DocTab.tsx` y en `loadDocs` (`SnapshotProjectSource.ts:270-294`). El test apunta a la lógica real; no se inventa una función nueva salvo decisión explícita de Design (refactor fuera del alcance de mínima invasión).
3. **Fixture golden sin la anotación (hallazgo N1)**: el GIVEN de EVT-DOC-04 (`spec.md:145`) exige `nora.yaml` con `source-path`; el fixture actual no la lleva. Se añade en apply y se ejecutan los tests afectados (schema/loader/snapshots).

## Aritmética de trazabilidad y audit (honestidad del objetivo)

- **Base verificada**: `verification/audit/all.md` @40cf870 — `overall: **PASS** — proven 77 · waived 0 · blocking 0`, con REQ-DOC-5 ya PROVEN (M10.2.1, fitness). El header «git a274243» del all.md es coherente: el build se regeneró en el worktree a las 12:11 UTC, 2 minutos antes del commit 40cf870 (14:13 +0200), cuando HEAD aún era a274243 (`git show 40cf870 --stat` muestra all.md +7-2 junto al override).
- **Crecimiento esperado**: +REQ-DOC-3 y +REQ-DOC-4 bajo M16 (override individual, level `fitness`, testRefs ≥ 1 cada uno vía los tests nuevos que citan el literal) → literal esperado tras el cierre: **`proven 79 · waived 0 · blocking 0`, 0 UNMAPPED, overall PASS**. Sin entrada de nivel (default `functional`), los testRefs producirían PARTIALLY_VERIFIED = blocking — por eso las entradas en `requirement-levels.json` son parte del alcance.
- **Riesgo de inventario controlado**: NO añadir heurística de área para M16 en `reqBelongsToMilestone` ni activar el mapeo CPS→M16 (el registro `CPS: 'M16'` en `build.ts:315` es código muerto con `void areaToMilestone`): REQ-CPS-1/2/3 declarados en `changes/cp-foundation/spec.md` y `changes/cp-catalog-entities/tasks.md` entrarían al inventario y quedarían UNMAPPED (= blocking). SOLO los 2 overrides individuales, patrón REQ-DOC-5.
- **Cambio colateral esperado**: nueva sección M16 en `coverage-matrix.md` y `baseline-m0-m10-2.md` (0 UATs — no existe `UAT-M16-*` — y 2 requisitos); `verification/test/baseline-audit.spec.ts` solo localiza M10.2/M10.2.1 (`:117-120`) — ejecutar la batería de verification y actualizar fixtures si alguna aserción exacta lo exigiera.
- **Comandos de regeneración** (verification/): `pnpm traceability:build` (o `node src/index.ts traceability build`) y `pnpm audit` / `node src/index.ts audit all` — objetivo `all.md`: PASS, proven 79, 0 UNMAPPED, 0 blocking.

## Criterios de aceptación del ciclo (resumen para el gate)

1. REQ-DOC-3 y REQ-DOC-4 con sus criterios de aceptación verdes a nivel `fitness`: tests nuevos citan los REQ literalmente (harvest `build.ts:184`), el cambio de producto está acotado a `entityLinkPlugin.ts` (branch m16 span→anchor) + fixture `nora.yaml`.
2. Batería afectada de control-plane en verde: `tsc` + los 3 specs de docs existentes (regresión 35/35) + los 2 specs nuevos + los tests afectados por el fixture golden.
3. `audit all` regenerado: overall **PASS**, `proven 79 · waived 0 · blocking 0`, 0 UNMAPPED; REQ-DOC-3/REQ-DOC-4 listados como (M16, fitness). Veredicto honesto: fitness — sin escenario YAML en este ciclo.
4. Las 3 desviaciones honestas (Link→anchor, resolveDocsForEntity→lógica real, fixture nora.yaml) documentadas en el verification-report; entradas `fitness` + rationale en `verification/traceability/requirement-levels.json`; overrides documentados en el commit (patrón 40cf870).
