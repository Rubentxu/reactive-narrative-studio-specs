# Design — m16-doc-entity-links (entity-link navegable + evidencia REQ-DOC-4)

**Ciclo**: `p-de82af3e9774d9a0/m16-doc-entity-links` · **Rama**: `feat/m16-doc-entity-links` · **Base**: `40cf8708bd94b1769ed3bc59102f2ce6aa3d64a8` (verificado con `git rev-parse HEAD` en esta sesión de diseño)
**Entradas**: `specification.md` del ciclo (REQ-DOC-3/4 refinados a nivel fitness, 3 desviaciones honestas, aritmética audit 77→79) · `exploration-report.md` (15/15 hechos verificados, hallazgos N1–N5)
**Fecha**: 2026-10-01

---

## 0. Principio de diseño

Mínima invasión y reutilización de mecanismos existentes (mandato del ciclo):

- **Un único cambio de producto**: el branch m16 de `entityLinkPlugin.ts` (span → anchor). El branch de capacidad REQ-DOC-5 (`entityLinkPlugin.ts:132-157`) es el patrón de formato a imitar y NO se toca.
- **Ninguna abstracción nueva**: no se extrae `resolveDocsForEntity` (hallazgo N2 — la lógica real inline en `DocTab` + `loadDocs` se testea tal cual), no se añade mecanismo de routing, no se modifica el allow-list de sanitización, no se añaden almacenes ni orquestadores.
- **Trazabilidad por el mecanismo existente**: overrides individuales (`REQ_MILESTONE_OVERRIDES`) + niveles (`requirement-levels.json`), exactamente el patrón que 40cf870 aplicó a REQ-DOC-5/REQ-CR-CAP-13.

---

## 1. Componentes y ficheros a crear o tocar

| # | Fichero | Acción | Alcance exacto | Evidencia de estado actual (leído en esta sesión) |
|---|---|---|---|---|
| 1 | `control-plane/src/features/docs/entityLinkPlugin.ts` | **MODIFICAR** (único cambio de producto) | (a) Interfaz `EntityLinkNode` (:23-34): `hName: 'span'` → `'a'`; añadir `href: string` a `hProperties`. (b) Branch m16 válido (:159-176): capturar el resultado hoy descartado (`parseEntityRef(ref)` en :161 → `const parsed = parseEntityRef(ref)`), construir `href` con los 3 segmentos codificados (ver contrato C1), `hName: 'a'`, conservar `className: ['doc-entity-link']` y `'data-entity-ref': ref`. (c) Comentario de cabecera (:17) actualizado para describir el anchor. | `entityLinkPlugin.ts:23-34, 159-176` — confirmado: span no navegable, resultado del parser descartado |
| 2 | `control-plane/test/entity-link-render.spec.ts` | **CREAR** (REQ-DOC-3) | Literal `REQ-DOC-3` en el fichero (harvest, `verification/src/traceability/build.ts:175-190` escanea `control-plane/test/*.ts|tsx`). Casos y oráculos: sección 3.1. | Patrón: `capability-cross-ref.spec.ts:36-44` (plugin directo sobre mdast) + `docs-sanitization.spec.ts:1-21` (jsdom + `@testing-library/react`) |
| 3 | `control-plane/test/doc-source-path.spec.ts` | **CREAR** (REQ-DOC-4) | Literal `REQ-DOC-4` en el fichero. Casos y oráculos: sección 3.2. | `ExtensionContext` (types.ts:6-11): `{ entity, entityRef, getProjection, now }`; no existe hoy ningún test que renderice DocTab (grep: solo `extension-isolation.spec.ts:43` usa un fake `getProjection`) |
| 4 | `golden/control-plane/snapshot-valid/catalog/nora.yaml` | **MODIFICAR** | Añadir `metadata.annotations['narrative.dev/source-path']: docs/nora.md` (el schema lo permite: `specs/catalog-entity.schema.json:65-70`, `annotations` objeto string→string; `golden/.../docs/nora.md` existe — verificado en exploración). | Leído: hoy solo tiene `apiVersion/kind/metadata.name/metadata.namespace` (6 líneas) |
| 5 | `verification/src/traceability/build.ts` | **MODIFICAR** (agente verificador) | (a) `MILESTONE_LABELS` (:66-87): añadir `M16: 'Series Canon'` **entre M15 y M17** (el orden de inserción define `MILESTONE_ORDER`, :89). (b) `REQ_MILESTONE_OVERRIDES` (:303-306): `'REQ-DOC-3': 'M16'`, `'REQ-DOC-4': 'M16'`. (c) Actualizar el comentario :296-302, que hoy dice que REQ-DOC-3/4 «stay out until their debt item closes» — este ciclo es ese cierre; dejarlo sería un comentario que contradice el override. **NO tocar** `reqBelongsToMilestone` (:307-337): el mapeo `CPS: 'M16'` de `areaToMilestone` es código muerto (`void areaToMilestone`, :337) y activarlo metería REQ-CPS-1/2/3 al inventario → UNMAPPED (spec, aritmética). | Confirmado: M16 ausente de labels; overrides solo con `REQ-DOC-5: 'M10.2.1'` |
| 6 | `verification/traceability/requirement-levels.json` | **MODIFICAR** | 2 entradas nuevas: `REQ-DOC-3` y `REQ-DOC-4`, `level: "fitness"`, rationale ≥ 10 chars (validación dura en `verification/src/audit/audit.ts:43-56`: nivel inválido o rationale corto = error, sin downgrades silenciosos). Modelo de rationale: la entrada de REQ-DOC-5 (fitness, test refs de componente + sonda browser como evidencia adicional). | Formato `{ level, rationale }` confirmado en el fichero |
| 7 | `verification/traceability/traceability-registry.json`, `coverage-matrix.md`, `baseline-m0-m10-2.md` · `verification/audit/all.md` | **REGENERAR** | Comandos canónicos: `node src/index.ts traceability build` y `node src/index.ts audit all` en `verification/` (subcomando `audit all` confirmado en `verification/src/index.ts:55`; scripts `traceability:build` en `verification/package.json:15`). | `all.md` base @40cf870: `overall: **PASS** — proven 77 · waived 0 · blocking 0` |

**Fuera de alcance (sin cambios)**: `docsSafeMarkdown.tsx` (allow-list ya compatible: `a: ['href','className','data-entity-ref','data-capability-ref']` en :52, `protocols.href` incluye `'relative'` en :42 — el anchor sobrevive la sanitización sin tocar nada); `Search.tsx` (divergencia `resultHref` documentada → deuda DEBT-M16-1); `DocTab.tsx` (guard duplicado → DEBT-M16-2); branch de capacidad y catch de inválidas del plugin; `router.tsx` (ruta `/entity/$kind/$namespace/$name` ya registrada, :49-52).

---

## 2. Contratos exactos

### C1 — Anchor de entity link (REQ-DOC-3)

**Input**: entity ref válida `[[Kind:namespace/name]]` — parseable por `parseEntityRef` (`control-plane/src/store/entityRef.ts:21-29`, patrón `^([^:/]+):([^:/]+)\/([^:/]+)$` en :19; `:` y `/` excluidos de los segmentos; `?`, `#`, `%` NO excluidos).

**Nodo mdast emitido** (`EntityLinkNode` actualizado):

```
type: 'entityLink'
entityId: <ref cruda>
children: [{ type: 'text', value: <ref cruda> }]
data: {
  hName: 'a'
  hProperties: {
    href: '/entity/' + encodeURIComponent(parsed.kind) + '/' + encodeURIComponent(parsed.namespace) + '/' + encodeURIComponent(parsed.name)
    className: ['doc-entity-link']
    'data-entity-ref': <ref cruda>
  }
}
```

- `parsed` es el **resultado** de `parseEntityRef(ref)` (hoy descartado en `entityLinkPlugin.ts:161`). El href se construye exclusivamente desde los componentes validados por el parser — nunca re-parseando el string crudo. Esto mantiene intacta la cláusula SHALL NOT del REQ-DOC-3 original (no emitir `<a href>` con URL controlada por atacante): el patrón `[^:/]+` impide separadores de URL en los segmentos y `encodeURIComponent` neutraliza `?`, `#`, `%` residuales.
- **Ejemplos normativos**: `[[Character:demo/nora]]` → `href="/entity/Character/demo/nora"` · `[[Character:demo/nora?x#frag]]` → `href="/entity/Character/demo/nora%3Fx%23frag"` (verifica que no hay `?` ni `#` crudos).
- **Inválidas** (parser lanza `EntityRefParseError`, p. ej. `[[not-a-valid-ref]]` o `[[Character:demo/nora-with-javascript:alert(1)]]` — un tercer `:` no casa con el patrón): rama catch `entityLinkPlugin.ts:177-183` reinserta `fullMatch` como texto plano. **Sin cambios**.
- **Segunda barrera intacta**: aunque el plugin fallara, `docsSafeMarkdown.tsx:42` (`protocols.href: ['http','https','mailto','relative']`) eliminaría un `javascript:` en sanitize. El test XSS debe afirmar la doble ausencia (sin anchor Y sin `javascript:` en el output).

### C2 — Sanitización (contrato negativo: sin cambios)

`docsSafeMarkdown.tsx:50-56` — el allow-list ya incluye `a: ['href','className','data-entity-ref','data-capability-ref']` y `span: ['className','data-entity-ref']`. El cambio span→anchor **no exige edición** del `customSchema`. El diseño prohíbe tocarlo (cualquier edición del allow-list en este ciclo sería una violación del alcance).

### C3 — Oráculos testid de DocTab (REQ-DOC-4, caso componente)

`DocTab.tsx` (leído completo en esta sesión) — anotación leída en :79-80 (`ctx.entity.metadata?.annotations?.['narrative.dev/source-path']`), docs vía `ctx.getProjection<DocEntry[]>('docs')` (:83), resolución en `fetchDocPage` (:37-65) con guard local `isSafeDocPath` (:25-30). Estados DOM:

| testid | Línea | Condición | Oráculo de test |
|---|---|---|---|
| `doc-tab-empty` | :117 | sin anotación → estado vacío documentado, sin error | `getByTestId('doc-tab-empty')` presente; `queryByTestId('doc-tab-content')` nulo |
| `doc-tab-loading` | :132 | fetch en curso | — (transitorio; solo waitFor) |
| `doc-tab-error` | :144 | excepción del fetch | no esperado en este ciclo |
| `doc-tab-not-found` | :157 | anotación presente pero `fetchDocPage` → `null` (guard de traversal o entrada ausente) | `getByTestId('doc-tab-not-found')` presente; **sin** `doc-tab-content` |
| `doc-tab-content` | :171 | doc resuelto → body vía `docsSafeMarkdown` (:177) | `getByTestId('doc-tab-content')` con el contenido del doc |

**Precisión de oráculo (afina la spec, no la contradice)**: para la anotación de traversal `../../etc/passwd`, el estado observable del componente es `doc-tab-not-found` (el guard local devuelve `null` en :42-45, sin error), **no** un `doc-tab-error`. El `Diagnostic 'path-traversal'` solo lo emite la capa de carga `loadDocs` (contrato C4) — el test de componente NO debe esperar el keyword de la capa de carga en el DOM, y viceversa: cada capa con su oráculo.

- `DocEntry` = `{ path: string, body: string }` (`SnapshotProjectSource.ts:260-263`).
- Matching de `fetchDocPage` (:49-57): normaliza el prefijo `docs/` del docRef y casa por `d.path === normalized || d.path.endsWith('/' + normalized) || d.path === docRef`. Con docRef `docs/nora.md`, una entrada `{ path: 'docs/nora.md', body }` casa por la tercera forma y `{ path: 'nora.md', body }` por la primera — ambas válidas para el fixture del test.
- La resolución es asíncrona (`useEffect` + Promise, :85-112): los tests deben usar `waitFor`/`findByTestId` de `@testing-library/react`, no aserciones síncronas sobre el primer render.

### C4 — Diagnostic de `loadDocs` (REQ-DOC-4 AC-2, capa de carga)

`loadDocs(files, manifest)` (`SnapshotProjectSource.ts:270-294`): con `manifest.docs` conteniendo `../../etc/passwd`, el guard `isSafeRelativePath` (:13-16, guard m14 preservado) produce:

```
{ ok: false, errors: [synthetic('path-traversal', 'docs/../../etc/passwd', 'Unsafe path: ../../etc/passwd')] }
```

**Precisión de campo respecto a la spec**: `synthetic` devuelve un `AjvError` (`diagnostics/types.ts:36-48`) cuyo campo discriminator es **`keyword`**, no `code`. El oráculo exacto del test es:

```ts
const result = await loadDocs(files, { version: '1', projections: [], docs: ['../../etc/passwd'] });
expect(result.ok).toBe(false);
if (!result.ok) expect(result.errors.some((e) => e.keyword === 'path-traversal')).toBe(true);
```

La spec de REQ-DOC-4 AC-2 decía «`Diagnostic` con `code === 'path-traversal'`»: misma intención, campo real `keyword`. Se registra esta precisión de contrato en el verification-report (no es una desviación de comportamiento; el keyword `'path-traversal'` es el valor que la capa lleva emitiendo desde m14). `Diagnostic<T>` = `{ ok: true; data: T } | { ok: false; errors: AjvError[] }` (`diagnostics/types.ts:9-11`).

- Los `File` del test se construyen con `new File(['# nora'], 'nora.md')` (jsdom provee `File`); `loadDocs` casa por `f.name === 'docs/<path>' || f.name === <path> || f.name === basename` (:289).
- Caso complementario honesto: `docs: ['inexistente.md']` → `keyword === 'missing-entry'` (:290-294). Opcional pero recomendado como segunda aserción del mismo test (coste marginal, documenta el segundo keyword del guard).

### C5 — Fake `ExtensionContext` para el test de componente (contrato de construcción)

```ts
const ctx: ExtensionContext = {
  entity: {
    apiVersion: 'narrative.dev/v1alpha1',
    kind: 'Character',
    metadata: {
      name: 'nora',
      namespace: 'demo',
      annotations: { 'narrative.dev/source-path': 'docs/nora.md' }, // o {} en el caso negativo
    },
  },
  entityRef: { kind: 'Character', namespace: 'demo', name: 'nora' },
  getProjection: <T,>(key: string): T | undefined =>
    (key === 'docs' ? (docsEntries as T) : undefined),
  now: () => new Date('2026-01-01T00:00:00Z'),
};
```

Formas verificadas: `ExtensionContext` (`control-plane/src/extensions/types.ts:6-11`) exige `entity`, `entityRef`, `getProjection<T>`, `now()`; `CatalogEntity` (`loader/ProjectSource.ts:15-20`) = `{ apiVersion, kind, metadata: Record<string, unknown> }`.

### C6 — Trazabilidad (visibilidad de inventario, mecanismo existente)

1. `MILESTONE_LABELS` += `M16: 'Series Canon'` (entre M15 y M17; `MILESTONE_ORDER` deriva de las claves, `build.ts:89`).
2. `REQ_MILESTONE_OVERRIDES` += `'REQ-DOC-3': 'M16'`, `'REQ-DOC-4': 'M16'`. `reqBelongsToMilestone` (:307-337) resuelve el override **antes** que la heurística de área → sin tocar la heurística, REQ-CPS-1/2/3 siguen fuera del inventario (control del riesgo de inventario de la spec).
3. `requirement-levels.json` += entradas `fitness` con rationale ≥ 10 chars. Sin entrada, el default `functional` haría los testRefs `PARTIALLY_VERIFIED` = blocking (`audit.ts:139-146`); con `fitness`, testRefs ≥ 1 → `PROVEN` («fitness level: N test ref(s)», `audit.ts` deriveRequirementStatus).
4. **Harvest**: los literales `REQ-DOC-3` y `REQ-DOC-4` deben aparecer en los ficheros de test nuevos (el escáner de testRefs recorre `control-plane/test/*.ts|tsx`, `build.ts:175-190`; `isWildcardMatch` solo excluye formas `REQ-X-*`, sin riesgo para ids exactos). Regla: el literal se cita en el comentario de cabecera de cada spec **y** junto a las aserciones clave, para que el ref sea trazable a la aserción.

### C7 — Oráculo canónico del ciclo (audit)

Tras regenerar:

```
verification/audit/all.md → overall: **PASS** — proven 79 · waived 0 · blocking 0
```

- REQ-DOC-3 y REQ-DOC-4 listados como `(M16, fitness)` con `PROVEN` por test refs.
- **0 UNMAPPED**: la única vía de entrada al inventario son los 2 overrides (sin heurística nueva), y ambos tendrán test refs → ningún requisito queda mapeado a milestone sin evidencia.
- Cambio colateral aceptado y documentado: nueva sección M16 en `coverage-matrix.md` y `baseline-m0-m10-2.md` (2 requisitos, 0 UATs — no existe `UAT-M16-*`). `verification/test/baseline-audit.spec.ts` no aserta recuentos exactos de proven ni ausencia de M16 (verificado :110-125: solo aserciones estructurales sobre M10.2/M10.2.1) → riesgo de rotura bajo, se confirma ejecutando la batería de verification.

---

## 3. Estrategia de tests (quirúrgica por fase, canónica al cierre)

### 3.1. `entity-link-render.spec.ts` (REQ-DOC-3) — casos y oráculos

Patrón doble: (i) plugin directo sobre mdast (`capability-cross-ref.spec.ts:36-44`) para los contratos del nodo; (ii) render jsdom vía `docsSafeMarkdown` (`docs-sanitization.spec.ts`) para el contrato post-sanitize. Ambiente: `// @vitest-environment jsdom` en cabecera.

| Caso | Input | Oráculo exacto |
|---|---|---|
| 1. Happy path (mdast) | `[[Character:demo/nora]]` | nodo `entityLink` con `data.hName === 'a'`, `href === '/entity/Character/demo/nora'`, `className === ['doc-entity-link']`, `data-entity-ref === 'Character:demo/nora'` |
| 2. Happy path (render+sanitize) | `[[Character:demo/nora]]` vía `docsSafeMarkdown` | anchor en DOM: `getByText('Character:demo/nora')` con `tagName === 'A'`, `getAttribute('href') === '/entity/Character/demo/nora'`; sin `[[` crudo |
| 3. Inválida → texto plano | `[[not-a-valid-ref]]` | ningún nodo `entityLink`; texto contiene el literal `[[not-a-valid-ref]]`; en render: `queryByRole('link')` nulo |
| 4. Vector XSS de EVT-DOC-03 | `[[Character:demo/nora-with-javascript:alert(1)]]` | ningún nodo `entityLink`; en render: `container.innerHTML` no contiene `javascript:` ni `href` |
| 5. Reservados codificados | `[[Character:demo/nora?x#frag]]` | `href === '/entity/Character/demo/nora%3Fx%23frag'`; aserción negativa: el href no contiene `?` ni `#` crudos |
| 6. Regresión capacidad (opcional, ya cubierta) | `[[Skill:default/x]]` | el branch REQ-DOC-5 intacto (ya lo cubre `capability-cross-ref.spec.ts` — no duplicar, solo referencia) |

El caso 5 justifica el `encodeURIComponent` por segmento: `entityRef.ts:19` no excluye `?`/`#`/`%`.

### 3.2. `doc-source-path.spec.ts` (REQ-DOC-4) — casos y oráculos

Patrón: render jsdom de `DocTab` con el fake ctx del contrato C5 (`@testing-library/react` + `waitFor`). Ambiente jsdom. Segundo `describe` para la capa de carga.

| Caso | Setup | Oráculo exacto |
|---|---|---|
| 1. Happy path (anotación + docs) | anotación `docs/nora.md`; `getProjection('docs')` → `[{ path: 'docs/nora.md', body: '# Nora — personaje de prueba' }]` | `await findByTestId('doc-tab-content')`; el body markdown visible (texto `Nora`); sin `doc-tab-empty` |
| 2. Sin anotación | `metadata.annotations: {}` | `getByTestId('doc-tab-empty')` presente (síncrono); `queryByTestId('doc-tab-content')` nulo; sin error |
| 3. Traversal en anotación | anotación `../../etc/passwd`; docs proyección con entradas | `await findByTestId('doc-tab-not-found')`; `queryByTestId('doc-tab-content')` nulo (guard local bloquea, DocTab.tsx:42-45) |
| 4. `loadDocs` path-traversal | `loadDocs(files, { version:'1', projections: [], docs: ['../../etc/passwd'] })` | `result.ok === false` y `errors.some(e => e.keyword === 'path-traversal')` (contrato C4) |
| 5. `loadDocs` missing-entry (opcional) | `docs: ['inexistente.md']` | `keyword === 'missing-entry'` (SnapshotProjectSource.ts:290-294) |

### 3.3. Calendario de ejecución por fase (testing incremental)

**Fase B1 — producto REQ-DOC-3 (T0/T1, bucle RED/GREEN, implementador):**
1. RED: crear `entity-link-render.spec.ts` → `pnpm vitest run test/entity-link-render.spec.ts` falla (hoy no hay anchor).
2. GREEN: cambiar `entityLinkPlugin.ts` (C1). T0: `pnpm typecheck` (tsc --noEmit del paquete; la interfaz exportada cambia, verificar consumidores — ningún test aserta el span, exploración hecho #11).
3. Ejecutar solo el spec nuevo hasta verde.

**Fase B2 — evidencia REQ-DOC-4 + fixture (T0/T1/T2):**
1. Crear `doc-source-path.spec.ts` (no requiere cambio de producto — es test de lógica existente; RED imposible por diseño: debe pasar a la primera, si no, el test está mal escrito).
2. Editar `golden/.../nora.yaml` (anotación) y ejecutar los tests afectados por el fixture (T2, seleccionados por análisis de impacto — 8 ficheros que parsean `snapshot-valid`, verificado por grep en esta sesión):
   `pnpm vitest run test/use-search-index.spec.tsx test/loader.snapshot.spec.ts test/catalog-store.spec.ts test/decision-projection.schema-fixtures.spec.ts test/multi-project-studio.spec.ts test/decisions-view.spec.tsx test/loader.snapshot.extension.spec.ts test/search.spec.tsx`
3. Si algún test rompiera por la anotación: alternativa honesta declarada en la spec (AC-3 de REQ-DOC-4) — entidad sintética dentro del test + desviación registrada en el verification-report. No ajustar tests solo para ponerlos en verde si la aserción original era válida.

**Fase B3 — cierre del WorkItem (T2 regresión docs):**
`pnpm vitest run test/docs-sanitization.spec.ts test/capability-cross-ref.spec.ts test/entity-page-composition.spec.ts test/entity-link-render.spec.ts test/doc-source-path.spec.ts` → baseline 35/35 previo (exploración) + los nuevos.

**Fase V — verificación del ciclo (canónica):**
1. `verification/`: `pnpm typecheck && pnpm test` (batería del harness — valida que el M16 nuevo no rompe `baseline-audit.spec.ts` ni hardening).
2. `node src/index.ts traceability build` → registro + matriz + baseline regenerados.
3. `node src/index.ts audit all` → **oráculo canónico del ciclo** (C7): PASS, proven 79, 0 UNMAPPED, 0 blocking. Este comando es el que el verification-report cita como evidencia primaria.
4. El verification-report registra las 3 desviaciones honestas (Link→anchor, `resolveDocsForEntity` inexistente, fixture nora.yaml) + la precisión del campo `keyword` (C4) y el patrón de overrides en el commit (patrón 40cf870).

**Batería completa de control-plane** (`pnpm vitest run` sin filtro): solo si la selección T2 deja dudas de impacto o la exige un gate posterior (integración/release). El análisis de impacto acota: el único módulo de producto tocado es `entityLinkPlugin.ts`, cuyo único consumidor es `docsSafeMarkdown` (regresión cubierta) y `DocTab` (cubierto por el spec nuevo).

---

## 4. Plan de ejecución para Build (resumen de delegación)

| Fase | Responsable | Entregables verificables |
|---|---|---|
| B1 | Implementador | `entityLinkPlugin.ts` con anchor + `entity-link-render.spec.ts` verde + `pnpm typecheck` verde |
| B2 | Implementador | `doc-source-path.spec.ts` verde + `nora.yaml` con anotación + 8 specs afectados en verde |
| B3 | Implementador | regresión docs 5 specs en verde; resumen de resultados por fichero |
| V | Verificador | `build.ts` + `requirement-levels.json` editados; `traceability build` + `audit all` ejecutados con `all.md` PASS/proven 79/0 UNMAPPED; verification-report con desviaciones y receipt |

---

## 5. Evaluación de deuda (severidad / prioridad)

| ID | Deuda | Severidad | Prioridad | Disposición en este ciclo |
|---|---|---|---|---|
| DEBT-M16-1 | `Search.tsx:20-36` `resultHref` solo codifica el kind con `encodeURIComponent`; namespace y name van crudos (divergencia menor documentada, exploración hecho #8). Con ns/name actuales (slugs seguros) no es explotable, pero rompe paridad con C1. | Media (potencial), Baja (real hoy) | Baja | No se toca (fuera de scope de la spec). Candidato a evolutivo futuro de hardening de links internos. |
| DEBT-M16-2 | Guard duplicado: `DocTab.tsx:25-30` re-implementa `isSafeRelativePath` (real en `SnapshotProjectSource.ts:13-16`); el comentario :23 dice «Reuses the existing guard» pero es una copia (hallazgo N3). Riesgo de divergencia futura entre los dos guards. | Media | Baja | No se toca (no bloquea este evolutivo). Refactor de una línea (`import { isSafeRelativePath }`) para ciclo de limpieza. |
| DEBT-M16-3 | Resolución source-path inline en `DocTab`/`loadDocs` sin resolver puro extraído (`resolveDocsForEntity` del escenario original no existe, N2). | Info | — | Decisión de diseño explícita: NO extraer. La lógica real queda cubierta por tests de componente (C3/C4); una extracción ahora sería refactor sin demanda. |
| DEBT-M16-4 | `<a>` plano provoca full-reload (no interceptación SPA de TanStack Router). | Baja | Baja | Aceptado por diseño: EVT-DOC-03 acepta `<a href>` y el precedente REQ-DOC-5 (v0.22.0) usa anchors internos iguales. |
| DEBT-M16-5 | REQ-DOC-3/4 quedan a nivel `fitness` (test refs de componente, sin escenario YAML E2E). | Media (honestidad del veredicto) | Media | Aceptado y declarado en la spec (nivel + rationale en `requirement-levels.json`). Elevar a `functional` exigiría escenario en `verification/scenarios/` — decisión del orquestador (N5), no de este ciclo. |
| DEBT-M16-6 | Ítems de backlog SDDK DOC-3/DOC-4 no localizables vía CLI desde el agente (`sddk backlog list` → vacío; N4). | Procesal | — | Propiedad del orquestador: triage/promoción al cierre del ciclo. Registrado para el receipt. |

Ninguna deuda de esta tabla bloquea la transición a Build: todas están registradas con disposición explícita y las que afectan a contratos (C1/C4) se cubren en los tests de este ciclo.

---

## 6. Autoevaluación del gate `architecture-consistent`

El diseño cumple el gate por los siguientes puntos verificables:

1. **Reutiliza mecanismos existentes, no introduce abstracciones**: el anchor replica el formato probado del branch de capacidad (`entityLinkPlugin.ts:137-154`, patrón REQ-DOC-5 publicado en v0.22.0); la visibilidad de inventario usa el mecanismo de overrides + niveles existente (patrón 40cf870); no se extraen funciones nuevas, no se añaden dependencias, no se toca el allow-list de sanitize ni el router.
2. **Coherente con los contratos vigentes**: la cláusula SHALL NOT del REQ-DOC-3 original queda satisfecha por construcción (href derivado del parser + `encodeURIComponent` por segmento + segunda barrera sanitize intacta, C1/C2); REQ-DOC-5 y REQ-DOC-2 no se tocan (regresión de 3 specs en B3); el guard m14 `isSafeRelativePath` se ejercita, no se modifica (C4).
3. **Alcance mínimo demostrable**: 1 fichero de producto (~15 líneas efectivas), 2 specs nuevos, 1 fixture, 2 ediciones de trazabilidad + regeneración. Todo lo demás queda explícitamente fuera (sección 1, «Fuera de alcance»).
4. **Honestidad**: las 3 desviaciones de la spec se respetan tal cual (Link→anchor ya resuelta en el escenario original; `resolveDocsForEntity` no se inventa — se testea la lógica real; fixture nora.yaml se añade con plan B declarado) y se añade una precisión de contrato nueva (campo `keyword` en C4) que el verification-report debe reflejar.

---

## 7. Qué NO hace este diseño (heredado de la spec)

- No toca `Search.tsx:resultHref`, ni el guard duplicado de `DocTab`, ni el mecanismo de routing ni la EntityPage.
- No añade escenarios YAML ni eleva a `functional` el nivel de REQ-DOC-3/4.
- No activa la heurística de área DOC/CPS en `reqBelongsToMilestone`.
- No introduce TanStack `<Link>` en el plugin, ni resolvers puros, ni cachés, ni almacenamiento nuevo.
- No triaga los ítems de backlog SDDK (propiedad del orquestador).
