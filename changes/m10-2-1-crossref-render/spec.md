# Specification — m10-2-1-crossref-render (cierre de WVR-M10-2-1-001: primer cross-reference real + render como anchor resuelto)

**Ciclo**: `p-7c4aff45199a2069/m10-2-1-crossref-render` · **Rama**: `feat/m10-2-1-crossref-render` · **Revisión base**: `46e6d64` (= main v0.21.0)
**Fuentes**: `exploration-report.md` del ciclo (9/9 hechos confirmados + hallazgos F1–F6); declaración original de REQ-VAH-CROSSREF-RENDER en `changes/m10-2-1-baseline-audit/spec.md:20`; `verification/scenarios/scn-m10-02-001.yaml`; `verification/src/audit/audit.ts`; `verification/src/traceability/build.ts`; `verification/test/baseline-audit.spec.ts`.
**Niveles** (convención del repo, `verification/src/audit/audit.ts:132-146`): `functional` exige veredicto PASS de escenario mapeado; `fitness` acepta test refs de componente. Nivel por defecto si no hay entrada en `requirement-levels.json`: `functional` (estricto, `audit.ts:185`).

## Alcance

**In scope**: primer cross-reference real de capacidad en contenido (`[[Skill:default/narrative-arc]]` en `examples/skills/character-consistency/SKILL.md`) con el contenido sincronizado hasta la app (`manifest-data.json`, hallazgo F1); emisión del anchor por `entityLinkPlugin` y supervivencia a la sanitización; render de contenido con cross-refs vía `docsSafeMarkdown` en la página de detalle; evidencia ejecutable en SCN-M10-02-001 (sonda `browser-evaluate` + click-navegación); eliminación de WVR-M10-2-1-001; actualización del harness que fija el estado de waivers; regeneración de trazabilidad y audits.

**Fuera de scope**: entity refs de m16 (`[[Character:...]]` → REQ-DOC-3, hallazgo F5 / riesgo R9 — ciclo futuro); WVR-M10-2-1-002 (store immutability, permanece); defecto preexistente `computeSha256` vacío (R10); calidad del contenido del catálogo.

---

### REQ-DOC-5 — Anchor de capability ref que sobrevive a la sanitización (área docs)

**Nivel**: `fitness` — evidencia obligatoria: test refs de componente (`control-plane/test/capability-cross-ref.spec.ts`, `control-plane/test/docs-sanitization.spec.ts`); la sonda del escenario la cubre además end-to-end.
**Evidencia adicional de escenario**: sonda de SCN-M10-02-001 (AC-3).

**Afirmación**: `entityLinkPlugin` SHALL emitir, para cada capability ref parseable `[[Skill|Pack|Profile|Workflow|Recipe:namespace/name]]`, un anchor `<a>` con `href="/capabilities/{skills|packs|profiles|workflows|recipes}/{namespace}/{name}"` (namespace y name con `encodeURIComponent`, formato idéntico al href de `KindList.tsx:74` y a las rutas registradas en `router.tsx:99-103`), `class="doc-capability-link"` y `data-capability-ref="{Kind}:{namespace}/{name}"`, en lugar del span actual (`entityLinkPlugin.ts:142`); el href SHALL construirse consumiendo `capabilityKindToRoute` (hoy descartado con `void` en `entityLinkPlugin.ts:133`). Refs de kind desconocido o no parseables SHALL seguir renderizándose como texto plano (comportamiento existente, `entityLinkPlugin.ts:169-175`). El anchor SHALL sobrevivir a `rehype-sanitize`: `data-capability-ref` MUST añadirse al allow-list de `a` (`docsSafeMarkdown.tsx:51`); el href relativo ya está permitido por `protocols.href` (`docsSafeMarkdown.tsx:41`).

**Criterios de aceptación**:
- **AC-1**: `capability-cross-ref.spec.ts` aserta por cada kind (Skill→skills, Pack→packs, Profile→profiles, Workflow→workflows, Recipe→recipes): `hName: 'a'`, `href` correcto, `className` `doc-capability-link` y `data-capability-ref`; y para kind desconocido o ref malformada: texto plano sin elemento anchor. El comentario de cabecera del test deja de referenciar el waiver.
- **AC-2**: `docs-sanitization.spec.ts` verde con el allow-list ampliado: el anchor con `data-capability-ref` sobrevive a la sanitización y NINGÚN vector OWASP existente (REQ-DOC-2) se relaja (`javascript:`/`data:` en href siguen eliminados).
- **AC-3**: la sonda `browser-evaluate` de SCN-M10-02-001 (`document.querySelector('a[data-capability-ref="Skill:default/narrative-arc"]')`) devuelve el anchor con el href esperado.

**Escenario (happy path)**:
- GIVEN el pipeline `docsSafeMarkdown` (remarkGfm + entityLinkPlugin + rehype-sanitize) con el allow-list ampliado
- WHEN se renderiza `[[Skill:default/narrative-arc]]`
- THEN el DOM contiene `<a href="/capabilities/skills/default/narrative-arc" class="doc-capability-link" data-capability-ref="Skill:default/narrative-arc">` y ningún `[[` crudo

**Escenario (edge)**:
- GIVEN el mismo pipeline
- WHEN se renderiza `[[Provider:default/x]]` (kind fuera de CAPABILITY_KINDS) o `[[Skill:narrative-arc]]` (sin namespace)
- THEN se renderiza el texto literal sin elemento anchor (fallback a texto plano)

**Qué NO prueba**: la existencia de contenido real con la cross-ref ni el cierre del waiver (REQ-VAH-CROSSREF-RENDER); la navegación al hacer click (escenario, REQ-VAH-CROSSREF-RENDER AC-2c); entity refs de m16 (REQ-DOC-3, fuera de scope); que la página de detalle exponga markdown (REQ-CR-CAP-13).
**Nota de trazabilidad**: el área `DOC` no tiene mapeo en `reqBelongsToMilestone` (`build.ts:296-325`), igual que REQ-DOC-1..4 de m16 (verificado: `REQ-DOC-3` no aparece en `verification/traceability/registry.json`) → este REQ no entra en el inventario del audit gate. Su control son los tests nombrados + la sonda del escenario. Ampliar el mapeo de áreas queda anotado como mejora futura, no de este ciclo.

---

### REQ-CR-CAP-13 — La página de detalle renderiza su contenido descriptivo vía docsSafeMarkdown (área capability-catalog)

**Nivel**: `functional` — REQUIERE veredicto PASS del escenario mapeado; solo con testRefs queda `PARTIALLY_VERIFIED`, que es blocking (`audit.ts:137-146,196`). Escenario obligatorio: `SCN-M10-02-001` (mapeado vía lista `requirements:` del YAML; el mapeo se construye en `build.ts:214-226`).

**Afirmación**: la página de detalle de capacidad (`/capabilities/$kind/$namespace/$name`, `CapabilityDetail.tsx:83`) SHALL renderizar el campo descriptivo que `m16EntityBridge` expone en metadata (purpose/description, `m16EntityBridge.tsx:47-65`) a través del pipeline `docsSafeMarkdown` (`docsSafeMarkdown.tsx:83-84`), de modo que las cross-references de capacidad declaradas en ese contenido aparezcan como anchors resueltos (REQ-DOC-5) y ningún campo que contenga `[[...]]` se imprima como texto plano (`MetadataCard.tsx:16` no debe volcar la clave que porta el contenido — riesgo R2, oráculo `detail.no-raw-crossref` debe seguir verde). La elección entre exponer el campo descriptivo (Opción A del informe) o el contenido completo del SKILL.md (Opción B, requiere `content` en `ParsedSkill`, `parser.ts:135-190`) corresponde a Design; cualquiera de las dos SHALL satisfacer este requisito y mantener `detail.no-raw-crossref` en verde. La extensión que exponga el markdown SHALL registrarse desde `features/docs` (sin import cross-feature, hallazgo F6) o, si hubiera import directo, SHALL declararse en `DECLARED_CROSS_FEATURE` con razón.

**Criterios de aceptación**:
- **AC-1**: `scn-m10-02-001.yaml` incluye `REQ-CR-CAP-13` en su lista `requirements:` (id declarado en esta delta-spec → no genera brokenReferences, `build.ts:273`).
- **AC-2**: el veredicto más reciente de SCN-M10-02-001 es PASS con la sonda del anchor en verde (`verification/evidence/*/artifacts/verdict.json` tras `pnpm verify`).
- **AC-3**: los 10 oráculos previos del escenario siguen pasando (los cambios son aditivos: mismos steps + nuevos pasos de sonda/click — riesgo R7 acotado).

**Escenario (happy path)**:
- GIVEN un skill de catálogo cuyo campo descriptivo contiene `[[Skill:default/narrative-arc]]` y la extensión markdown registrada desde `features/docs`
- WHEN se navega a `/capabilities/skills/default/character-consistency`
- THEN el DOM contiene el anchor resuelto (`data-capability-ref` + href) y ningún texto visible contiene `[[`

**Escenario (edge)**:
- GIVEN el mismo detalle renderizado
- WHEN se inspecciona el volcado de metadata de la página (MetadataCard)
- THEN ninguna clave cruda imprime `[[` (con Opción B: la clave `content` queda excluida del volcado plano)

**Qué NO prueba**: la emisión del anchor por el plugin (REQ-DOC-5); que la cross-ref exista en contenido real, el click-navegación y el cierre del waiver (REQ-VAH-CROSSREF-RENDER); el render markdown del DocTab en Character (ya existente — solo regresión); navegación SPA vs carga completa del anchor (aceptada por diseño, R8); otros entity kinds sin campo descriptivo con cross-refs.

---

### REQ-VAH-CROSSREF-RENDER — MODIFICADO (área VAH / M10.2.1; declaración original: `changes/m10-2-1-baseline-audit/spec.md:20`)

**Nivel**: `functional` (se mantiene; entrada existente en `requirement-levels.json` con rationale a actualizar).

**Afirmación (bloque completo modificado, reemplaza a la original)**: un cross-reference de capacidad declarado en contenido real del catálogo (`[[Kind:namespace/name]]`) MUST renderizarse como anchor resuelto y navegable en la página de detalle. Esta delta introduce la primera cross-ref real: `examples/skills/character-consistency/SKILL.md` MUST contener `[[Skill:default/narrative-arc]]` (sección `## Cross-references`, línea 228) conservando las referencias `docs/NN-*.md` existentes, y el contenido MUST llegar a la app con `manifest-data.json` sincronizado (F1: el generador `tools/generate-capability-manifest.ts` citado en `manifest.ts:7` no existe; Design decide restaurarlo o garantizar sincronización verificable). El click en el anchor MUST navegar a `/capabilities/skills/default/narrative-arc`. La cláusula de gap de la declaración original queda eliminada: WVR-M10-2-1-001 MUST borrarse de `waivers.json` (líneas 2-12; WVR-M10-2-1-002 permanece), `requirement-levels.json` MUST actualizar su rationale manteniendo el nivel `functional`, y la trazabilidad y los audits MUST regenerarse con veredicto PASS fresco (`pnpm verify` → `node verification/src/index.ts traceability` → `node verification/src/index.ts audit all`).
(Previously: gap aceptado con waiver mientras no existiera contenido real con cross-refs — WVR-M10-2-1-001.)

**Criterios de aceptación**:
- **AC-1**: `grep -F '[[Skill:default/narrative-arc]]' examples/skills/character-consistency/SKILL.md` devuelve ≥1 y las refs `docs/NN-*.md` existentes están intactas; el `content` correspondiente de `control-plane/src/features/capability-catalog/data/manifest-data.json` incluye la cross-ref (verificable con grep sobre el JSON — riesgo R1).
- **AC-2**: `scn-m10-02-001.yaml` actualizado: (a) `REQ-VAH-CROSSREF-RENDER` y `REQ-CR-CAP-13` en `requirements:`; (b) paso `browser.evaluate` con la sonda del anchor + oráculo `browser-evaluate` (patrón de `scn-m10-01-001.yaml:66-70`; acción que escribe `browser.<step>.eval.json`, `scenario.ts:341-349`); (c) paso `click` sobre el anchor con `waitForUrlContains: /capabilities/skills/default/narrative-arc` + oráculo `browser-content` sobre el DOM de destino (acción click soportada, `scenario.ts:298-317`); (d) `doesNotProve` reescrito honestamente acotando la afirmación positiva al par skill→narrative-arc y manteniendo la cadena `cross-links` (exigida por `baseline-audit.spec.ts:130`).
- **AC-3**: las 5 aserciones del harness que fijan el estado de waivers/doesNotProve (`baseline-audit.spec.ts:50`, `:52`, `:106`, `:110`, `:130`) actualizadas en el mismo ciclo (F2).
- **AC-4**: `waivers.json` sin WVR-M10-2-1-001 (WVR-M10-2-1-002 permanece); `requirement-levels.json` con la rationale de REQ-VAH-CROSSREF-RENDER actualizada (nivel `functional`).
- **AC-5**: `pnpm verify` completo tras la implementación deja veredicto PASS fresco de SCN-M10-02-001 en `verification/evidence/`; después regeneración con `node verification/src/index.ts traceability` y `node verification/src/index.ts audit all`.
- **AC-6**: `audit all` → overall PASS, 0 waived, 0 blocking, todos los requisitos PROVEN (aritmética en la sección siguiente); REQ-VAH-CROSSREF-RENDER PROVEN por evidencia de escenario en el audit del milestone M10.2.1 (gate bloqueante de CI: `audit milestone M10.2.1`, `.github/workflows/verification.yml:61`).

**Escenario (happy path)**:
- GIVEN el build con la cross-ref real en el skill character-consistency y los anchors activos (REQ-DOC-5 + REQ-CR-CAP-13)
- WHEN SCN-M10-02-001 navega al detalle del skill, ejecuta la sonda y hace click en el anchor
- THEN el anchor existe (`data-capability-ref`, href esperado), el click lleva a `/capabilities/skills/default/narrative-arc` y el DOM de destino se captura y valida

**Escenario (edge)**:
- GIVEN el mismo build con el waiver ya eliminado
- WHEN se evalúa el audit gate
- THEN ningún requisito queda WAIVED ni PARTIALLY_VERIFIED; WVR-M10-2-1-002 (store immutability) permanece con su cobertura fitness separada (REQ-VAH-FITNESS-SEPARATION)

**Qué NO prueba**: mutación interna del projection store (fitness separada; WVR-M10-2-1-002 permanece); render de entity refs de m16 (REQ-DOC-3); calidad del contenido del catálogo (doesNotProve existente); otros pares de cross-references distintos de skill→narrative-arc (único contenido real afirmado); rendimiento, accesibilidad ni milestones ajenos.

---

## Aritmética de trazabilidad y audit (honestidad del objetivo)

- Inventario actual del audit: **75 requisitos** (74 PROVEN + 1 WAIVED = REQ-VAH-CROSSREF-RENDER; `verification/audit/all.json`, git 989c563).
- Esta delta añade **REQ-CR-CAP-13** al inventario auditado (área `CR-CAP` → M10.2, `build.ts:307`) → el literal esperado tras el cierre es **`proven 76 · waived 0 · blocking 0`**. El objetivo sustantivo del ciclo (waiver eliminado, 0 waived, 0 blocking, todos PROVEN, overall PASS) se cumple íntegro; el literal "75" del contexto queda actualizado a 76 por el mismo mecanismo de crecimiento de inventario que ya aplicó m17 (cuyos 8 REQ están dentro del 75 actual). Ningún gate fija el literal 75 (verificado: `verification/test/*.ts` solo usa umbrales `>=`; CI ejecuta `audit milestone M10.2.1` y `audit range M10.1..M10.2`).
- REQ-DOC-5 no entra en el inventario del audit (área `DOC` sin mapeo, igual que todo REQ-DOC-* de m16); su evidencia es fitness + sonda de escenario.
- Condición del flip WAIVED→PROVEN: escenario mapeado en `requirements:` del YAML **y** veredicto PASS fresco (`deriveRequirementStatus`, `audit.ts:131-141`); sin mapeo o sin PASS fresco quedaría `PARTIALLY_VERIFIED` = blocking. Los veredictos se leen de `verification/evidence/*/artifacts/verdict.json` (gitignored — el `pnpm verify` debe correr en local tras la implementación).

## Criterios de aceptación del ciclo (resumen para el gate)

1. Los 3 REQ declarados arriba con sus criterios de aceptación verdes (REQ-DOC-5 fitness; REQ-CR-CAP-13 y REQ-VAH-CROSSREF-RENDER functional con PASS de SCN-M10-02-001).
2. `audit all`: overall PASS, 0 waived, 0 blocking, todos PROVEN (literal esperado: `proven 76 · waived 0 · blocking 0`).
3. SCN-M10-02-001 PASS con los 10 oráculos previos + sonda `browser-evaluate` + click-navegación al destino.
4. Baterías de control-plane y verification en verde (tsc + vitest en ambos).
