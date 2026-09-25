# Design — m10-2-1-crossref-render (cierre de WVR-M10-2-1-001: primer cross-reference real + render como anchor resuelto)

**Ciclo**: `p-7c4aff45199a2069/m10-2-1-crossref-render` · **Rama**: `feat/m10-2-1-crossref-render` · **Revisión base**: `46e6d64` (= main v0.21.0)
**Entradas**: `specification.md` (3 REQ: REQ-DOC-5 fitness, REQ-CR-CAP-13 y REQ-VAH-CROSSREF-RENDER functional) y `exploration-report.md` (9/9 hechos confirmados, hallazgos F1–F6, riesgos R1–R10) del mismo artifacts-dir. Todos los contratos de este diseño fueron re-verificados contra el código real en esta sesión (rutas y líneas citadas).

---

## 1. Decisiones de diseño

### D1 — Opción B para REQ-CR-CAP-13: renderizar el contenido completo del SKILL.md, no solo el campo descriptivo

La spec deja la elección a Design (sección REQ-CR-CAP-13, afirmación). Se elige **Opción B** por tres razones verificadas:

1. **La letra de REQ-VAH-CROSSREF-RENDER la exige**: la afirmación modificada dice que `examples/skills/character-consistency/SKILL.md` MUST contener `[[Skill:default/narrative-arc]]` en la **sección `## Cross-references`** (línea 228). Bajo Opción A (solo `purpose` vía `parseSkill`, `parser.ts:148-176`) esa sección no se renderiza y el anchor no aparecería en la página; habría que duplicar la cross-ref en el párrafo Purpose, contradiciendo la ubicación declarada.
2. **Conserva intactas las referencias `docs/NN-*.md`** existentes en `## Cross-references` (AC-1 del REQ) y las hace visibles junto a la cross-ref, sin tocar el extractor de `purpose` (los tests existentes `capability-catalog.spec.ts:99-103` siguen dependiendo de ese comportamiento).
3. **Es la variante que la spec marca "más fiel"** y el coste incremental ya está acotado por la spec: `parseSkill` ya recibe el contenido completo (lo descarta), `m16EntityBridge.tsx:47` ya construye metadata por-kind, y `MetadataCard.tsx:14` ya tiene un skip-list al que se añade una clave (ver D3).

Consecuencias aceptadas: (a) `detail` muestra el SKILL.md completo (encabezados, listas, evaluation cases) — aceptable, es contenido del catálogo; (b) `MetadataCard` deja de volcar `content` como fila plana (ver D3); (c) los otros 2 skills (`narrative-arc`, `scene-validator`) también renderizan su contenido — sin `[[` en su texto (grep verificado = 0 en examples/ antes de este ciclo), por lo que `detail.no-raw-crossref` permanece verde.

### D2 — Sincronización de contenido: restaurar el generador siguiendo el patrón existente `generate-recipe-assets.mjs`, cableado a `pnpm build`

F1 confirma que el generador citado (`tools/generate-capability-manifest.ts`, `manifest.ts:7`) no existe y que `manifest-data.json` incrusta paths absolutos de otra máquina. Decisión:

- Crear **`control-plane/scripts/generate-capability-manifest.mjs`** (no `tools/*.ts`): reutiliza el patrón ya establecido por `control-plane/scripts/generate-recipe-assets.mjs` (build-time, `node` plano, escribe un JSON bundle que la app importa estáticamente; ese script ya escribe un JSON commitado en cada build — patrón aceptado por el proyecto). Un script Node que genera un asset de la app pertenece a `control-plane/scripts/`, junto a su hermano; `tools/` del repo aloja utilidades Python.
- **Cablearlo a `pnpm build`**: `"build": "node scripts/generate-capability-manifest.mjs && node scripts/generate-recipe-assets.mjs && vite build"`. Así, el paso `ui.build` de SCN-M10-02-001 (`verification/scenarios/scn-m10-02-001.yaml:14`, `cmd: pnpm build`) regenera el manifest **antes** de `vite build` → la app construida siempre ve el contenido actual de `examples/`+`recipes/`. R1 (desincronización) queda eliminado por construcción, no por disciplina.
- El JSON sigue **commitado** (como `src/generated/recipe-assets.json`, verificado con `git ls-files`): los tests de vitest importan `manifest.ts` sin pasar por build. La salida es determinista (orden `readdirSync` ordenado, paths anclados a raíz de repo), por lo que tras commit el rebuild es no-op en el diff.
- Corregir el comentario obsoleto de `manifest.ts:7` para apuntar al script real y a su invocación.
- **Formato de `path`: raíz de repo con barra inicial** (p. ej. `/examples/skills/character-consistency/SKILL.md`, `/recipes/middle-grade-illustrated/skeleton/profiles/...`), machine-independent. Requisito impuesto por el código existente: `parseProfile` deriva namespace de `path.includes('/recipes/')` (`parser.ts:303-309`) y `capability-catalog.spec.ts:97` aserta `skill.path` `toContain('/examples/skills/')`. Paths puramente relativos (`recipes/...` sin barra) romperían la derivación del namespace `recipe:middle-grade-illustrated` y el badge de scope (REQ-CR-CAP-7). Con barra inicial ambos contratos se conservan.
- Los campos `id` del JSON **no son consumidos** por `manifest.ts` (verificado: solo lee `content`, `path`, `origin`) — el generador emite ids estables cosméticos (`skill-<dir>`, `pack-<stem>`, `profile-<stem>`, `workflow-<stem-sin-.workflow>`, `recipe-<dir>`); deriva en un ligero cambio cosmético del `id` del perfil de recipe (`profile-profile-middle-grade-10-11-recipe` → `profile-profile-middle-grade-10-11`), sin consumidor (anotado como deuda D6).
- Colecciones y orden: skills = `examples/skills/*/SKILL.md` (3), packs = `recipes/*/skeleton/packs/*/*.md` (4, `origin: recipe:<dir>`), profiles = `examples/*-profile.yaml` + `recipes/*/skeleton/profiles/*.yaml` (2), workflows = `control-plane/workflows/comfyui/*.workflow.json` (1), providers = `[]` (DD-4), recipes = `recipes/*/recipe.yaml` (1). Debe reproducir exactamente los conteos de `test/fixtures/capability-manifest-snapshot.ts` (3/4/2/1/0/1) — el test `capability-catalog.spec.ts` los fija.

### D3 — Exposición del contenido y su volcado plano

- `ParsedSkill` gana el campo `content: string` (`parser.ts:17-26` + retorno en `parseSkill:180-189`): cambio aditivo; los consumidores (`KindList.tsx:141` cast para purpose, index re-export) no hacen `toEqual` estructural sobre el objeto (verificado en `capability-parsers.spec.ts`).
- `m16EntityBridge.tsx` (case `skill`, `:46-48`): `baseMetadata.content = entry.content`. Es el único punto donde el `CatalogEntity` sintetizado puede transportar el contenido hasta el registry sin imports cruzados.
- `MetadataCard.tsx:14`: añadir `content` al skip-list (`k !== 'content'`). Sin esto, el volcado plano `String(v)` imprimiría el markdown crudo y rompería `detail.no-raw-crossref` (riesgo R2 de la spec, que ya anticipa esta exclusión). El skip-list de `MetadataCard` es el mecanismo existente para claves no planas (`name`/`namespace` ya están); `MetadataCard` vive en `features/catalog/entity` y es compartido — los entities m16 no tienen clave `content`, cero cambio visual para ellos.

### D4 — Tarjeta markdown registrada desde `features/docs` (sin import cross-feature)

- Nuevo `control-plane/src/features/docs/capability/CapabilityDocCard.tsx`: componente que lee `entity.metadata?.content` y lo renderiza con `docsSafeMarkdown(contenido)` (`docsSafeMarkdown.tsx:74`). Solo importa de su propia feature (`../docsSafeMarkdown`) y de `../../extensions` (fuera de la frontera de features, igual que `features/docs/character/index.tsx:8-13`) → **no requiere entrada en `DECLARED_CROSS_FEATURE`** (hallazgo F6; el oráculo INC-008 de `extension-isolation.spec.ts` sigue verde).
- Nuevo `control-plane/src/features/docs/capability/index.tsx`: registra un `EntityCardExtension` con `apiVersion`, `id: 'docs/capability/markdown'`, `kind: 'card'`, `targetKind: 'skill'`, `priority: 15` (entre metadata=10 y relations=20, verificado en `m16EntityBridge.tsx:92,107,116`), `predicate: entity.kind === 'skill' && typeof entity.metadata?.content === 'string' && (entity.metadata.content as string).length > 0`.
- `main.tsx:15`: añadir el side-effect import `./features/docs/capability/index.tsx` (mismo mecanismo de registro por boot que las 5 extensiones existentes).
- Registro solo para `skill` (único kind con contenido hoy): minimal, extensible sin contrato nuevo si mañana `parsePack` expone contenido.

### D5 — Anchor del plugin: mismo formato de href que las rutas existentes

- `entityLinkPlugin.ts` (`CapabilityLinkNode`, `:34-49`; emisión, `:129-149`):
  - `hName: 'span'` → `hName: 'a'`; `hProperties` gana `href`.
  - El href se construye **consumiendo `capabilityKindToRoute`** (hoy `void` en `:133`): `href = /capabilities/${capabilityKindToRoute(kind)}/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`. Formato idéntico al de `KindList.tsx:74` y a la ruta registrada `router.tsx:99-104` (`/$kind/$namespace/$name` bajo `/capabilities`); los segmentos plurales de `capabilityKindToRoute` (`:55-64`: skills|packs|profiles|workflows|recipes) son exactamente los que normaliza `KIND_FROM_ROUTE_SEGMENT` (`CapabilityDetail.tsx:31-38`).
  - `className: ['doc-capability-link']` y `'data-capability-ref': ref` se conservan (contrato público que ya consumen el test y el escenario).
  - El fallback de texto plano para kind desconocido / ref no parseable queda intacto (`entityLinkPlugin.ts:150-175`): `tryParseCapabilityRef` (`:68-82`) sigue devolviendo null fuera de `CAPABILITY_KINDS` o sin `ns/name` → el ref cae a `parseEntityRef` y, si falla, a texto plano.
- `docsSafeMarkdown.tsx:51`: allow-list de `a` gana `'data-capability-ref'` (queda `['href', 'className', 'data-entity-ref', 'data-capability-ref']`). El href relativo ya pasa por `protocols.href` (`:41`, incluye `'relative'`); los vectores OWASP de REQ-DOC-2 no se relajan (los protocolos no cambian; los tests de sanitización existentes siguen en verde).
- Nota R8 (aceptada en la spec): react-markdown emite `<a href>` plano, no `<Link>` de TanStack → el click produce navegación completa. `page.waitForURL` de la acción click (`scenario.ts:298-317`) la soporta; no se introduce dependencia del router dentro del pipeline markdown (rompería el aislamiento de `features/docs`).

---

## 2. Superficie de cambio (componentes / ficheros)

### Producto — control-plane

| # | Fichero | Acción | Contenido del cambio |
|---|---|---|---|
| P1 | `control-plane/src/features/docs/entityLinkPlugin.ts` | modificar | `CapabilityLinkNode.data`: `hName: 'a'`, `hProperties: { href, className: ['doc-capability-link'], 'data-capability-ref' }`; consumir `capabilityKindToRoute` (eliminar el `void` de `:133`); fallback texto plano intacto. Actualizar el comentario de cabecera (`:7-13` ya documenta el href objetivo) |
| P2 | `control-plane/src/features/docs/docsSafeMarkdown.tsx` | modificar | `'data-capability-ref'` en el allow-list de `a` (`:51`); actualizar comentario de deltas (`:13-14`) |
| P3 | `control-plane/src/features/capability-catalog/parser.ts` | modificar | `ParsedSkill.content: string` (`:17-26`); `parseSkill` lo devuelve (`:180-189`) |
| P4 | `control-plane/src/features/capability-catalog/m16EntityBridge.tsx` | modificar | case `skill`: `baseMetadata.content = entry.content` (`:46-48`) |
| P5 | `control-plane/src/features/catalog/entity/MetadataCard.tsx` | modificar | skip-list: excluir `content` del volcado plano (`:14`) |
| P6 | `control-plane/src/features/docs/capability/CapabilityDocCard.tsx` | **crear** | tarjeta que renderiza `entity.metadata.content` vía `docsSafeMarkdown`; sin contenido → fragmento vacío |
| P7 | `control-plane/src/features/docs/capability/index.tsx` | **crear** | registro `EntityCardExtension` `docs/capability/markdown` (D4) |
| P8 | `control-plane/src/main.tsx` | modificar | side-effect import `./features/docs/capability/index.tsx` (`:15`) |
| P9 | `control-plane/scripts/generate-capability-manifest.mjs` | **crear** | generador build-time (D2); salida a `src/features/capability-catalog/data/manifest-data.json` |
| P10 | `control-plane/package.json` | modificar | `"build"` antepone `node scripts/generate-capability-manifest.mjs &&` |
| P11 | `control-plane/src/features/capability-catalog/data/manifest-data.json` | regenerar | ejecutar el generador; paths anclados a raíz; content de SKILL.md actualizado |
| P12 | `control-plane/src/features/capability-catalog/manifest.ts` | modificar | comentario `:7` → apunta al script real (`control-plane/scripts/generate-capability-manifest.mjs`, parte de `pnpm build`) |
| P13 | `examples/skills/character-consistency/SKILL.md` | modificar | añadir en `## Cross-references` (`:228`) la línea `- [[Skill:default/narrative-arc]]: Arc provides the macro-level character transformation beats that arc beat alignment is checked against.`; las 4 refs existentes (`narrative-arc`, `scene-validator`, `docs/08`, `docs/10`) intactas |

### Tests — control-plane

| # | Fichero | Acción | Contenido del cambio |
|---|---|---|---|
| T1 | `control-plane/test/capability-cross-ref.spec.ts` | modificar | AC-1 de REQ-DOC-5 (contratos en §3.1); comentario de cabecera (`:9-11`) deja de citar el waiver y cita REQ-DOC-5 + REQ-CR-CAP-13 (fuentes de testRefs del registry, `build.ts:163-180`) |
| T2 | `control-plane/test/docs-sanitization.spec.ts` | modificar | AC-2 de REQ-DOC-5: bloque nuevo "capability anchor survives sanitization" (§3.2) |
| T3 | `control-plane/test/capability-doc-card.spec.ts` | **crear** | REQ-CR-CAP-13 a nivel componente: tarjeta renderiza content con anchor; `MetadataCard` no vuelca `content` plano; cite REQ-CR-CAP-13 en cabecera (testRefs) |

### Harness y trazabilidad — verification

| # | Fichero | Acción | Contenido del cambio |
|---|---|---|---|
| H1 | `verification/scenarios/scn-m10-02-001.yaml` | modificar | `requirements:` añade `REQ-CR-CAP-13` y `REQ-VAH-CROSSREF-RENDER` (`:3`); 3 pasos nuevos y 2 oráculos nuevos (§3.3); `doesNotProve` reescrito honesto (§3.4); steps previos intactos (R7) |
| H2 | `verification/test/baseline-audit.spec.ts` | modificar | las 5 aserciones de F2 (`:50-51`, `:106`, `:110`, `:130`) → nuevo estado sin WVR-001 (§3.5) |
| H3 | `verification/traceability/waivers.json` | modificar | eliminar entrada `WVR-M10-2-1-001` (`:2-12`); `WVR-M10-2-1-002` permanece |
| H4 | `verification/traceability/requirement-levels.json` | modificar | rationale de `REQ-VAH-CROSSREF-RENDER`: nivel `functional` se mantiene; texto describe la demostración por SCN-M10-02-001 y la eliminación del waiver en este ciclo |
| H5 | Regeneración (comandos, no ficheros editados a mano) | ejecutar | `pnpm verify` → `node src/index.ts traceability` → `node src/index.ts audit all` (y `audit milestone M10.2.1` como check del gate CI) |

No se toca: `verification/src/**` (runner, oráculos, audit, build.ts — todas las capacidades necesarias existen), `control-plane/test/extension-isolation.spec.ts` (sin nuevo import cross-feature, F6), `examples/skills/{narrative-arc,scene-validator}/SKILL.md`.

---

## 3. Contratos exactos

### 3.1 Contrato del anchor (REQ-DOC-5) — oráculo de componente y de sonda

Para cada ref parseable `[[Kind:namespace/name]]` con `Kind ∈ {Skill, Pack, Profile, Workflow, Recipe}`:

```
elemento: <a>
href:               /capabilities/{route}/{encodeURIComponent(namespace)}/{encodeURIComponent(name)}
route:              Skill→skills · Pack→packs · Profile→profiles · Workflow→workflows · Recipe→recipes
className (hast):   ['doc-capability-link']  → atributo class="doc-capability-link"
data-capability-ref: <Kind>:<namespace>/<name>   (texto exacto de la ref, sin corchetes)
texto del anchor:   la ref sin corchetes (p. ej. "Skill:default/narrative-arc")
```

Casos negativos (texto plano, sin `<a>`): kind fuera de `CAPABILITY_KINDS` (`[[Provider:default/x]]`, `[[Unknown:default/foo]]`), ref sin namespace (`[[Skill:narrative-arc]]` — el regex de `entityLinkPlugin.ts:70` exige `ns/name`), y cualquier `[[...]]` que falle `parseEntityRef`.

Test de componente (`capability-cross-ref.spec.ts`): por cada uno de los 5 kinds asertar sobre el nodo `capabilityLink` emitido: `data.hName === 'a'`, `data.hProperties.href === '/capabilities/<route>/<ns>/<name>'`, `data.hProperties.className === ['doc-capability-link']`, `data.hProperties['data-capability-ref'] === '<Kind>:<ns>/<name>'`; y para `Provider`/`Unknown`/sin-namespace: que NO exista nodo `capabilityLink` y el texto plano se conserve (se mantienen los tests existentes de texto circundante). El `MdastNode` del test amplía `data` con `hName` y `hProperties.href`/`className`.

### 3.2 Contrato de sanitización (REQ-DOC-5 AC-2) — `docs-sanitization.spec.ts`

Bloque nuevo (jsdom, mismo estilo que los existentes):
- GIVEN `docsSafeMarkdown('Ver [[Skill:default/narrative-arc]] aquí')`
- THEN `container.querySelector('a[data-capability-ref="Skill:default/narrative-arc"]')` existe con `getAttribute('href') === '/capabilities/skills/default/narrative-arc'` y `class` contiene `doc-capability-link`; `textContent` no contiene `[[`.
- Los 10 vectores OWASP existentes (`:25-76`) y los tests de protocolo (`:111-136`) NO cambian: `javascript:`/`data:` siguen neutralizados con el allow-list ampliado (la ampliación es de atributos de `a`, no de protocolos).

### 3.3 Contrato del escenario SCN-M10-02-001 (REQ-VAH-CROSSREF-RENDER AC-2, REQ-CR-CAP-13)

Steps **añadidos** después de `ui.detail.click` (los 11 previos y sus oráculos no cambian):

```yaml
- { id: ui.crossref.detail, driver: browser, action: navigate,
    params: { path: /capabilities/skills/default/character-consistency } }
- id: ui.crossref.probe
  driver: browser
  action: evaluate
  params:
    script: >-
      (() => { const a = document.querySelector('a[data-capability-ref="Skill:default/narrative-arc"]');
      return a ? { found: true, href: a.getAttribute('href'), className: a.className }
               : { found: false, href: '', className: '' }; })()
- { id: ui.crossref.click, driver: browser, action: click,
    params: { selector: 'a[data-capability-ref="Skill:default/narrative-arc"]',
              waitForUrlContains: /capabilities/skills/default/narrative-arc } }
```

Oráculos **añadidos**:

```yaml
- id: crossref.anchor-probe
  type: browser-evaluate
  config:
    artifact: browser.ui.crossref.probe.eval.json
    expected:
      found: true
      href: /capabilities/skills/default/narrative-arc
      className: doc-capability-link
- id: crossref.destination
  type: browser-content
  config:
    artifact: browser.ui.crossref.click.dom.json
    urlContains: /capabilities/skills/default/narrative-arc
    textContains: ["narrative-arc"]
    noRawTextContains: ["Capability Not Found"]
```

Restricciones verificadas contra el runner y los oráculos:
- La acción `evaluate` escribe `browser.<step.id>.eval.json` (`scenario.ts:341-349`) → el artifact del oráculo debe llamarse exactamente `browser.ui.crossref.probe.eval.json` (patrón de `scn-m10-01-001.yaml:24-29,67-72`).
- `browserEvaluateOracle` compara con `semanticCompare` **estricto** (`canonical.ts:118-141`: unión de claves, sin subset) → el `expected` debe declarar TODAS las claves que el script devuelve; por eso el script devuelve forma fija en ambas ramas (`found:false` + cadenas vacías si no hay anchor).
- La acción `click` valida `waitForUrlContains` como glob `**<fragmento>**` y lanza error si la URL final no lo contiene (`scenario.ts:298-317`) → la navegación full-page del anchor plano (D5/R8) está cubierta; el artifact DOM se captura tras el click (`browser.ui.crossref.click.dom.json`).
- `browserContentOracle` soporta `urlContains`, `textContains`, `noRawTextContains` sobre el DOM artifact (`oracles/index.ts:330-378`).
- Navegación directa por path a la detail (no depender del orden de `a.capability-name`) → paso determinista.

### 3.4 Contrato de claims honestos (`doesNotProve`, `scn-m10-02-001.yaml:9-12`)

Nueva redacción (mantiene la cadena `cross-links` exigida por `baseline-audit.spec.ts:130`; acota la afirmación positiva al par real):
- Se conserva: mutación interna del projection store; calidad del contenido del catálogo.
- Se reemplaza la línea del waiver por: *"Render positivo de cross-links más allá del par afirmado [[Skill:default/narrative-arc]] (única cross-reference real de contenido; otros kinds, namespaces y pares quedan pendientes de que exista contenido real)."*
- Se elimina toda mención al waiver/gap aceptado (el waiver deja de existir; H3).

### 3.5 Contrato del harness (`baseline-audit.spec.ts`) — nuevo estado fijado

| Línea | Hoy | Tras el ciclo |
|---|---|---|
| `:50-51` | `waivers.length >= 2`; ids contiene WVR-001 y WVR-002 | `waivers.length >= 1`; ids contiene `WVR-M10-2-1-002` y **NO** contiene `WVR-M10-2-1-001` (aserción negativa que fija la eliminación) |
| `:106` | `registry.coverage.waived >= 2` | `registry.coverage.waived >= 1` |
| `:110` | `renderBaseline(registry)` contiene `WVR-M10-2-1-001` | `renderBaseline(registry)` **no** contiene `WVR-M10-2-1-001` (se mantiene la aserción de `## Gaps / backlog`) |
| `:130` | `doesNotProve` contiene `cross-links` | sin cambio de código (la nueva redacción de §3.4 conserva la cadena); test renombrado/comentado si procede |

Comentario de cabecera del describe de waivers actualizado para describir el estado (WVR-002 store-immutability permanece).

### 3.6 Contrato del generador (`generate-capability-manifest.mjs`)

- Entrada: filesystem del repo (readdirSync recursivo acotado a los 5 patrones de D2, ordenado).
- Salida: JSON con forma idéntica a la actual — `{ skills: [{content,id,path}], packs: [{content,id,origin,path}], profiles: [{content,id,path}], workflows: [{content,id,path}], providers: [], recipes: [{content,id,path}] }` — escrito con `JSON.stringify(data, null, 2) + '\n'` en `control-plane/src/features/capability-catalog/data/manifest-data.json`.
- `path` = `'/'+ruta relativa al repo` (con barras `/`, nunca `\`); `origin` de packs = `recipe:<dir-receta>`; conteos deben igualar `expectedManifestCounts` (3/4/2/1/0/1) — si no, el script falla con exit no-cero (fail-fast antes de vite build).
- Idempotente y determinista: mismo árbol → mismos bytes (commit estable, rebuild no-op).

### 3.7 Contratos de trazabilidad/audit (estado final esperado)

- `scn-m10-02-001.yaml` requirements finales: `[REQ-VAH-BROWSER-AUDIT, REQ-CR-CAP-3..8, REQ-CR-CAP-11, REQ-CR-CAP-13, REQ-CEP-1, REQ-CEP-2, REQ-VAH-CROSSREF-RENDER]`. El mapeo se construye por matching textual de `REQ_ID` en `build.ts:150-160`; ambos REQ están declarados en `changes/m10-2-1-crossref-render/spec.md` (`reqSources`, `build.ts:148`) → sin brokenReferences (`build.ts:271-276`).
- REQ-CR-CAP-13: área `CR-CAP` → M10.2 (`build.ts:296-325`) → entra en el inventario del audit (+1 → 76 requisitos auditados). PROVEN = mapeo de escenario + verdict PASS fresco (`audit.ts:131-132`); sus testRefs vendrán de `capability-doc-card.spec.ts`/`capability-cross-ref.spec.ts` (harvest `build.ts:163-180`).
- REQ-VAH-CROSSREF-RENDER: área `VAH` → M10.2.1; sin waiver y con PASS fresco → PROVEN (flip WAIVED→PROVEN, `audit.ts:121-147`).
- REQ-DOC-5: área `DOC` sin mapeo → fuera del inventario (igual que REQ-DOC-1..4; verificado que `REQ-DOC-3` no está en `verification/traceability/registry.json`). Su control son T1+T2+la sonda.
- Literal objetivo `audit all`: **`overall PASS · proven 76 · waived 0 · blocking 0`** (75 actuales + REQ-CR-CAP-13; ningún test/CI fija el literal — `baseline-audit.spec.ts` usa umbrales `>=` y CI ejecuta `audit milestone M10.2.1` / `audit range M10.1..M10.2`, `.github/workflows/verification.yml:61-69`).
- `requirement-levels.json` rationale nueva: *"El render positivo de cross-links es funcional: SCN-M10-02-001 lo demuestra con la primera cross-reference real ([[Skill:default/narrative-arc]] en examples/skills/character-consistency/SKILL.md), sonda del anchor y navegación por click; waiver WVR-M10-2-1-001 eliminado en m10-2-1-crossref-render."*

---

## 4. Estrategia de tests (quirúrgica por fase, canónica al cierre)

Política del anexo de testing: T0/T1 durante desarrollo, T2 al estabilizar cada ficha, T3 al tocar integración (escenario), batería canónica solo al cierre. Ningún fichero de producto se toca en esta fase de Design.

| Fase | Trabajo | Verificación (comandos exactos, cwd) | Alcance |
|---|---|---|---|
| F0 — baseline | Antes de tocar: confirmar verde (evidencia F4 ya existe; re-ejecutar solo si el árbol cambió) | — | — |
| F1 — plugin + sanitize (P1, P2) | anchor emisión + supervivencia | `pnpm exec vitest run test/capability-cross-ref.spec.ts test/docs-sanitization.spec.ts` y `pnpm exec tsc --noEmit` (cwd `control-plane`) | T0+T1 |
| F2 — parser/bridge/card (P3–P8, T3) | content expuesto, tarjeta, skip-list | `pnpm exec vitest run test/capability-parsers.spec.ts test/capability-doc-card.spec.ts test/capability-catalog.spec.ts test/extension-isolation.spec.ts test/capability-isolation.spec.ts` (cwd `control-plane`) | T1+T2 (isolation incluida porque se toca bridge/MetadataCard/main.tsx) |
| F3 — contenido + generador (P9–P13) | sync verificable | `node scripts/generate-capability-manifest.mjs` (cwd `control-plane`); luego `grep -cF '[[Skill:default/narrative-arc]]' src/features/capability-catalog/data/manifest-data.json examples/skills/character-consistency/SKILL.md`; `pnpm exec vitest run test/capability-catalog.spec.ts` (conteos 3/4/2/1/0/1 y refs docs intactas vía `tools/check-skill-crossrefs.sh`) | T1 |
| F4 — escenario + harness (H1–H4) | veredicto ejecutable | `pnpm exec vitest run test/baseline-audit.spec.ts` (cwd `verification`); escenario aislado: `node src/index.ts uat scenario scenarios/scn-m10-02-001.yaml`; iterar hasta PASS (12 oráculos: 10 previos + 2 nuevos) | T1+T3 |
| F5 — cierre canónico | gates del ciclo | 1) `pnpm exec tsc --noEmit && pnpm test` (control-plane) · 2) `pnpm exec tsc --noEmit && pnpm test` (verification) · 3) `pnpm verify` (todos los escenarios; deja verdicts frescos gitignored) · 4) `node src/index.ts traceability` · 5) `node src/index.ts audit all` → `PASS · proven 76 · waived 0 · blocking 0` · 6) `node src/index.ts audit milestone M10.2.1` → exit 0 (gate CI) | T4 local |

Notas: (i) el `pnpm verify` debe correr **en local tras la implementación** porque `evidence/` está gitignored (`verification/.gitignore:2`) y el audit lee los verdicts locales (`audit.ts:84-101`); (ii) la orden 3→4→5 es obligatoria: el registry nuevo (con REQ-CR-CAP-13 y sin waiver) solo es audit-proven si el verdict PASS es posterior al cambio (runId mayor, `loadLatestVerdicts`); (iii) no se re-ejecutan baterías de milestones ajenos más allá de las exigidas por `audit all`.

---

## 5. Evaluación de deuda

| ID | Deuda | Severidad | Prioridad | Tratamiento |
|---|---|---|---|---|
| D1 | `computeSha256` síncrono devuelve `''` en module-init (`parser.ts:123-125`) → sha256 vacío en metadata de detalle. Preexistente (R10) | Baja | Baja | Fuera de scope; no se agrava con este cambio. Registrar para un ciclo de calidad |
| D2 | Entity refs m16 (`[[Character:...]]`) siguen emitiendo span sin anchor (REQ-DOC-3, F5/R9) | Media | Media | Ciclo futuro explícito; este ciclo no toca su rama del plugin (`:150-175`) |
| D3 | `reqBelongsToMilestone` sin área `DOC` (`build.ts:296-325`) → REQ-DOC-* fuera del inventario del audit | Media | Baja | Anotado como mejora futura en la spec; no es requisito de este ciclo |
| D4 | Sin validación automática de que una `[[Kind:ns/name]]` de contenido resuelva a una entrada del catálogo (ref rota → click a NotFound) | Media | Media | Hoy mitigado por contenido único + escenario. Mejora futura natural: validar targets en `generate-capability-manifest.mjs` (fallar build si el target no existe). No se introduce ahora para no ampliar scope |
| D5 | Convención implícita: toda clave de metadata con markdown/`[[` debe añadirse al skip-list de `MetadataCard` y renderizarse en una tarjeta | Baja | Baja | Documentada en este diseño (D3/D4); el patrón tarjeta+skip-list es el mecanismo establecido |
| D6 | `id` de `manifest-data.json` no consumido; el regenerador normaliza el id cosmético del perfil de recipe | Informativa | Baja | Aceptado; sin consumidor (verificado en `manifest.ts:44-107`) |
| D7 | Anchor plano (no `<Link>` de TanStack) → navegación full-page al hacer click (R8) | Baja | Baja | Aceptada por diseño (D5); la conversión a Link se evaluará en el ciclo de entity refs |

Ninguna deuda bloquea el cierre del ciclo; D4 es la única con acción futura recomendada (validación de targets en el generador).

---

## 6. Matriz de trazabilidad diseño → REQ

| REQ | Evidencia de diseño | Evidencia de verificación |
|---|---|---|
| REQ-DOC-5 (fitness) | D5 (anchor + sanitize), P1–P2, T1–T2 | `capability-cross-ref.spec.ts` (5 kinds + negativos), `docs-sanitization.spec.ts` (survival + OWASP), sonda AC-3 del escenario |
| REQ-CR-CAP-13 (functional) | D1, D3, D4, P3–P8, T3, H1 | Veredicto PASS de SCN-M10-02-001 (incl. `detail.no-raw-crossref` y nuevos oráculos) + testRefs de componente |
| REQ-VAH-CROSSREF-RENDER (functional, modificado) | D1 (sección Cross-references), D2 (sync), P9–P13, H1–H4, §3.7 | AC-1 greps; AC-2 pasos/oráculos; AC-3 harness; AC-4 waivers/levels; AC-5 `pnpm verify`; AC-6 `audit all` 76/0/0 + `audit milestone M10.2.1` exit 0 |

## 7. Consistencia arquitectónica (autoevaluación del gate)

- **Reutilización sobre abstracción nueva**: pipeline markdown existente (`docsSafeMarkdown`), registry de extensiones (`EntityCardExtension`), patrón build-time `.mjs` (`generate-recipe-assets.mjs`), skip-list de `MetadataCard`, runner/oráculos del harness sin cambios. Cero almacenes, orquestadores o protocolos nuevos.
- **Invariantes respetados**: m10 no-write (generación solo en build-time; sin fetch/IndexedDB en runtime), aislamiento de features (tarjeta registrada desde `features/docs`, sin import cross-feature ni nueva entrada en `DECLARED_CROSS_FEATURE`), contrato de extensiones sin bump de apiVersion (card aditiva).
- **Contratos compartidos ampliados de forma aditiva**: `ParsedSkill.content`, allow-list de `a`, skip-list de `MetadataCard` — cada uno con su test de regreso en las fases F1–F3.
- **Honestidad del objetivo**: el flip WAIVED→PROVEN exige mapeo + PASS fresco (§3.7); el literal del audit pasa de 75 a 76 por el mecanismo declarado en la spec; no se toca ningún gate ni umbral del harness para "hacer hueco" (las 5 aserciones actualizadas describen el nuevo estado real, no debilitan verificaciones: la aserción sobre WVR-001 pasa de positiva a negativa).
