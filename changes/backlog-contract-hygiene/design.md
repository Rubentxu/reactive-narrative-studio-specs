# Design — backlog-contract-hygiene (contrato METADATA_RESERVED_KEYS + higiene del schema de sanitización y comentarios de DocTab)

**Ciclo**: `p-de82af3e9774d9a0/backlog-contract-hygiene` · **Rama**: `feat/backlog-contract-hygiene` · **Base**: `9b5ddf33c85fedd06d2e640b6324d7d331f08555` (tag v0.24.0, `git rev-parse HEAD` verificado en esta fase)
**Entradas**: `specification.md` (REQ-CP-008 nivel fitness, AC-1..4; ítem 2 bajo REQ-DOC-2/REQ-DOC-5 vigentes, AC-2.1..2.5) y `exploration-report.md` (§1–§9) de este ciclo.
**Verificación de esta fase de diseño**: todos los hechos citados a continuación fueron re-leídos contra el árbol en esta fase — `MetadataCard.tsx:14-17` (skip-list literal), `m16EntityBridge.tsx:50-51` (comentario + inyección `content`), `docsSafeMarkdown.tsx:13-15` (cabecera), `:33` (comentario "We override a, img, and span"), `:52-54` (schema), `DocTab.tsx:6,7,23,71,177` (comentarios falsos + render real), `extension-isolation.spec.ts:96-140` (guard + stale-entry check), `audit.ts:121-145` (`deriveRequirementStatus`: fitness+testRefs → PROVEN :140; sin refs → UNMAPPED :145), `audit.ts:173` (default `functional`) y `:196` (UNMAPPED/PARTIALLY_VERIFIED/FAILED = blocking), `build.ts:59` (regex REQ_ID), `build.ts:139-156` (cosecha `changes/`+`docs/`), `build.ts:168-191` (testRefs desde `control-plane/test/**`), `build.ts:342` (regla de área `M10`+`CP`), `requirement-levels.json` (formato `{level, rationale}`, precedentes REQ-CP-007/REQ-DOC-5), y `tsconfig.json` de control-plane (`noUnusedLocals: true`, `strict: true`).

## 1. Decisión arquitectónica

**Cero abstracciones nuevas**: el ciclo reutiliza exclusivamente mecanismos existentes —

- El contrato `METADATA_RESERVED_KEYS` vive en `src/lib/` siguiendo el precedente inmediato de `control-plane/src/lib/store-zip.ts` y `control-plane/src/lib/download.ts` (los dos únicos ficheros del directorio, `ls` verificado). Opción (a) de la exploración §2.
- Los gates de comportamiento ya existen y no se tocan: `docs-sanitization.spec.ts` (REQ-DOC-2/REQ-DOC-5), `capability-doc-card.spec.ts` (REQ-CR-CAP-13), `extension-isolation.spec.ts` / `capability-isolation.spec.ts` (guards de aislamiento), `entity-link-render.spec.ts` (anchors del plugin).
- El registro del requisito usa la mecánica probada en REQ-DEI-8 (commits `18f018c`/`66d75bc`): sección en `changes/<ciclo>/spec.md` + entrada en `requirement-levels.json` + cita del REQ en los tests que lo verifican.
- Sin almacenes, orquestadores, protocolos, frameworks de testing ni cachés nuevos (AGENTS.md §5). Sin edges cross-feature nuevos: un módulo en `src/lib` está fuera del alcance del guard de `extension-isolation.spec.ts:111-133` (solo vigila imports relativos `features/* → features/*`; un import `../../lib/…` resuelve a `lib/…` y `parts[0] !== 'features'`), y la excepción `DECLARED_CROSS_FEATURE` queda intacta (el stale-entry check `:134-140` sigue pasando porque `m16EntityBridge.tsx → catalog` sigue vivo).

Semver: PATCH **v0.24.1** — refactor/chore/test, sin features nuevas.

## 2. Componentes y ficheros a crear o tocar

| # | Fichero | Acción | Ítem |
|---|---|---|---|
| 1 | `control-plane/src/lib/metadata-reserved-keys.ts` | **NUEVO** — módulo del contrato | 1 |
| 2 | `control-plane/src/features/catalog/entity/MetadataCard.tsx` | Refactor `:17` + import + comentario | 1 |
| 3 | `control-plane/src/features/capability-catalog/m16EntityBridge.tsx` | Comentarios `:48-51` → referencian el contrato compartido | 1 |
| 4 | `control-plane/src/features/docs/docsSafeMarkdown.tsx` | `:14-15`, `:33`, `:53`, `:54` | 2 |
| 5 | `control-plane/src/features/docs/character/DocTab.tsx` | Comentarios `:6`, `:7`, `:23`, `:71` | 2 |
| 6 | `control-plane/test/metadata-reserved-keys.spec.ts` | **NUEVO** — test que fija el conjunto (AC-2) | 1 |
| 7 | `control-plane/test/capability-doc-card.spec.ts` | `:84` — el título del describe añade la cita `REQ-CP-008`; **aserciones intactas** (AC-3) | 1 |
| 8 | `verification/traceability/requirement-levels.json` | Entrada `"REQ-CP-008": {level: fitness}` | trazabilidad |

**No se toca** (exploración §8, confirmado): `entityLinkPlugin.ts` (`hName: 'a'` en ambas ramas, emisiones `:154/:158/:186/:190`), `epub/`, `comic-renderer/`, sinks FSA, `SnapshotProjectSource.ts`, tests existentes salvo el título del describe del #7, y ningún otro schema de sanitización (la entrada `a` de `docsSafeMarkdown.tsx:52` es load-bearing para REQ-DOC-5).

### 2.1 Contrato exacto del módulo (fichero #1)

```ts
// control-plane/src/lib/metadata-reserved-keys.ts
/**
 * METADATA_RESERVED_KEYS — explicit cross-feature metadata contract (REQ-CP-008).
 *
 * Producer:  m16EntityBridge (features/capability-catalog) injects the SKILL.md
 *            body as baseMetadata 'content'.
 * Consumer:  MetadataCard (features/catalog) skips reserved keys in its flat
 *            metadata dump; the capability card renders 'content' via
 *            docsSafeMarkdown (REQ-CR-CAP-13: no flat [[...]] dump).
 *
 * Before v0.24.1 this was an undeclared convention spread across two files as
 * magic strings. The module lives in src/lib (precedent: store-zip.ts,
 * download.ts) so neither consumer widens the declared cross-feature edge —
 * the extension-isolation guard only watches features/* → features/* imports.
 */
export const METADATA_RESERVED_KEYS = ['name', 'namespace', 'content'] as const;

export type MetadataReservedKey = (typeof METADATA_RESERVED_KEYS)[number];

/** True iff `key` is reserved by the metadata-card contract (exact match). */
export function isReservedMetadataKey(key: string): key is MetadataReservedKey {
  return (METADATA_RESERVED_KEYS as readonly string[]).includes(key);
}
```

El conjunto es **exactamente** `['name', 'namespace', 'content']` — los valores de la condición literal hoy vigente (`MetadataCard.tsx:17`). `as const` + cast a `readonly string[]` dentro del predicado: sin `any`, compatible con `strict`.

### 2.2 MetadataCard.tsx (fichero #2)

- Añadir `import { isReservedMetadataKey } from '../../../lib/metadata-reserved-keys';`
- `:17` → `{!isReservedMetadataKey(k) && (`. Tabla de verdad idéntica a `k !== 'name' && k !== 'namespace' && k !== 'content'` (comparación exacta y case-sensitive en ambos casos).
- El comentario interior `:14-16` (REQ-CR-CAP-13) se conserva y se amplía con una línea: las claves reservadas son el contrato compartido `METADATA_RESERVED_KEYS` (`src/lib/metadata-reserved-keys`, REQ-CP-008).

### 2.3 m16EntityBridge.tsx (fichero #3)

El bloque `:48-51` pasa a:

```ts
      // Full SKILL.md markdown, rendered by the docs/capability card through
      // docsSafeMarkdown so [[Kind:ns/name]] cross-refs become anchors
      // (REQ-CR-CAP-13). 'content' ∈ METADATA_RESERVED_KEYS — the shared
      // reserved-keys contract with MetadataCard (src/lib/metadata-reserved-keys,
      // REQ-CP-008): injected here, skipped by the card's flat dump.
      baseMetadata.content = entry.content;   // ← SIN cambio de código
```

**Desviación documentada del spec (única)**: el SHALL "m16EntityBridge SHALL importar la constante del mismo módulo" se materializa como **referencia nominal grep-able** (`METADATA_RESERVED_KEYS` + ruta del módulo en el comentario), no como `import` en código. Justificación verificada en esta fase: `control-plane/tsconfig.json` tiene `noUnusedLocals: true` — un import sin uso en el bridge (la constante no tiene uso runtime natural allí: el bridge no filtra claves, solo inyecta) sería error de compilación en `tsc --noEmit`, y fabricar un uso artificial violaría "comportamiento observable idéntico". La esencia de AC-2 (única fuente de verdad) se mantiene: un solo módulo define el conjunto, `MetadataCard` lo consume en código, el test nuevo fija el conjunto, y el bridge documenta el contrato por nombre. El resto del spec (AC-1, AC-3, AC-4 y todo el ítem 2) se cumple sin desviación.

### 2.4 docsSafeMarkdown.tsx (fichero #4)

- `:14-15` (cabecera, delta 4) →
  ```
   *      a[href,className,data-entity-ref,data-capability-ref],
   *      img[src,alt] (survives sanitize)
  ```
  (desaparece `img[…,data-entity-ref]` y toda la mención a `span[className,data-entity-ref]`).
- `:33` → `// We override a and img (the former for entityLinkPlugin anchors).` — hoy dice "We override a, img, and span"; AC-2.5 del spec apunta al cast `:46-49`, pero el texto a corregir está en `:33` (re-ubicación verificada en esta fase; `:46-49` no necesita cambio).
- `:53` → `img: ['src', 'alt'] as unknown as typeof defaultSchema.attributes extends Record<string, infer V> ? V : never,` — **se retira solo `'data-entity-ref'`**; `alt` es load-bearing (el `defaultSchema.attributes.img` de rehype-sanitize es `["ariaDescribedBy","ariaLabel","ariaLabelledBy","longDesc","src"]`, sin `alt`; el override de primer nivel REEMPLAZA la entrada; retirar `alt` rompería `docs-sanitization.spec.ts:128` — exploración §3.1).
- `:54` → **se elimina** la entrada `span: ['className', 'data-entity-ref']` completa. Cero productores (`hName` solo emite `a` en `entityLinkPlugin.ts:32/:50`) y cero aserciones sobre `span[data-entity-ref]` en `test/` (greps de exploración §3.1-3.2, re-verificados los productores en esta fase).
- La entrada `a` (`:52`) **no se toca** (REQ-DOC-5).

### 2.5 DocTab.tsx (fichero #5) — los 4 comentarios a la verdad

| Línea | Hoy (FALSO) | Nuevo |
|---|---|---|
| `:6` | "Uses the existing isSafeRelativePath guard from SnapshotProjectSource." | "Re-implements the SnapshotProjectSource isSafeRelativePath guard locally — the loader lives outside the docs feature boundary." |
| `:7` | "Renders via safeReactMarkdown (REQ-DOC-1)." | "Renders via docsSafeMarkdown (REQ-DOC-1)." |
| `:23` | "Reuses the existing SnapshotProjectSource guard per REQ-DOC-4." | "Re-implements the SnapshotProjectSource guard per REQ-DOC-4 — the loader lives outside the docs feature boundary (functional equivalents today; may diverge)." |
| `:71` | "…and renders via safeReactMarkdown." | "…and renders via docsSafeMarkdown." |

Hechos de fondo (exploración §3.3, re-verificados): `safeReactMarkdown` no existe como símbolo en `src/` ni `test/`; el render real es `docsSafeMarkdown` (`DocTab.tsx:177`); `isSafeDocPath` (`:25-30`) es re-implementación local, la guarda del loader está en `SnapshotProjectSource.ts:12-17`.

## 3. Contratos exactos (formatos, testids, oráculos)

### 3.1 Formato del registro de trazabilidad (fichero #8)

En `verification/traceability/requirement-levels.json`, junto a `REQ-CP-001..007`:

```json
"REQ-CP-008": { "level": "fitness", "rationale": "Contrato cross-feature explicito de claves reservadas (METADATA_RESERVED_KEYS): estructura compartida entre MetadataCard y m16EntityBridge sin comportamiento runtime nuevo; lo prueban los test refs de componente (capability-doc-card.spec.ts, skip-list observable) y el test que fija el conjunto (metadata-reserved-keys.spec.ts)." }
```

Mecánica (verificada esta fase): la cosecha de `changes/**/*.md` (`build.ts:154`) recoge `REQ-CP-008` de `changes/backlog-contract-hygiene/spec.md` (ya presente, `diff -q` con el artefacto de fase verificado); la regla de área `M10`+`CP` (`build.ts:342`) lo apropia → sin gap `requirement-unowned`; los testRefs se cosechan de `control-plane/test/**/*.{ts,tsx}` (`build.ts:189`) por mención del id → `metadata-reserved-keys.spec.ts` y `capability-doc-card.spec.ts`; `deriveRequirementStatus` con `level=fitness` + testRefs>0 → **PROVEN** (`audit.ts:140`). Sin entrada en levels.json el default sería `functional` (`audit.ts:173`) y los testRefs darían PARTIALLY_VERIFIED (blocking, `audit.ts:196`); sin testRefs sería UNMAPPED (blocking). Ambas condiciones (a) y (b) del spec son pues obligatorias antes de la regeneración final.

### 3.2 Oráculos de aceptación (comandos exactos)

| AC | Oráculo | Resultado esperado |
|---|---|---|
| AC-1 | `grep -n "k !== 'name'" control-plane/src/features/catalog/entity/MetadataCard.tsx` | sin salida (exit 1); `grep -n "isReservedMetadataKey" …MetadataCard.tsx` → ≥2 (import + uso) |
| AC-2 | `npx vitest run test/metadata-reserved-keys.spec.ts` (desde `control-plane/`) | 2 tests green; `grep -rn "METADATA_RESERVED_KEYS" control-plane/src` → 3 ficheros: el módulo (definición), `MetadataCard.tsx` (import/uso), `m16EntityBridge.tsx` (comentario del contrato) |
| AC-3 | `npx vitest run test/capability-doc-card.spec.ts`; `git diff` del fichero | green; el diff muestra SOLO la línea `:84` del título |
| AC-4 | `npx vitest run test/extension-isolation.spec.ts test/capability-isolation.spec.ts`; `git diff` de `extension-isolation.spec.ts` | green; diff vacío — `DECLARED_CROSS_FEATURE` sin entradas nuevas ni stale |
| AC-2.1 | `sed -n '52,54p' control-plane/src/features/docs/docsSafeMarkdown.tsx` | `a: […]` intacta; `img: ['src', 'alt'] …`; sin línea `span` |
| AC-2.2 | `grep -rn "data-entity-ref" control-plane/src --include="*.ts" --include="*.tsx"` | solo `entityLinkPlugin.ts` (`:36` tipo, `:190` emisión) y `docsSafeMarkdown.tsx` (entrada `a` `:52` + línea de comentario `a[…]` `:14`); **ninguna línea del grep contiene `span` ni `img`** |
| AC-2.3 | `npx vitest run test/docs-sanitization.spec.ts`; `git diff` del spec | 25 tests green; diff vacío (aserciones intactas) |
| AC-2.4 | `grep -n "safeReactMarkdown\|Uses the existing isSafeRelativePath\|Reuses the existing" control-plane/src/features/docs/character/DocTab.tsx` | sin salida (exit 1) |
| AC-2.5 | `npx tsc --noEmit` (desde `control-plane/`) | exit 0 |

### 3.3 Formato del test nuevo (fichero #6)

```ts
// control-plane/test/metadata-reserved-keys.spec.ts
import { describe, expect, it } from 'vitest';
import {
  METADATA_RESERVED_KEYS,
  isReservedMetadataKey,
} from '../src/lib/metadata-reserved-keys';

// REQ-CP-008 — the reserved-keys set is an explicit cross-feature contract
// (MetadataCard skip-list <-> m16EntityBridge 'content' injection). This test
// FIXES the set: adding or removing a key without updating it must break.
describe('METADATA_RESERVED_KEYS contract (REQ-CP-008)', () => {
  it('exports exactly the reserved keys of the current contract', () => {
    expect([...METADATA_RESERVED_KEYS]).toEqual(['name', 'namespace', 'content']);
  });

  it('isReservedMetadataKey matches exactly the exported set (case-sensitive)', () => {
    for (const key of METADATA_RESERVED_KEYS) expect(isReservedMetadataKey(key)).toBe(true);
    for (const key of ['Name', 'namespaces', 'contents', 'purpose', 'description', '']) {
      expect(isReservedMetadataKey(key)).toBe(false);
    }
  });
});
```

Sin JSX → sufijo `.ts` (convención del directorio: los `.spec.tsx` son los que renderizan). `toEqual(['name','namespace','content'])` sobre el spread del array: añadir o retirar una clave rompe el test (AC-2).

Fichero #7 — única línea cambiada: `:84` → `` describe('MetadataCard content skip-list (REQ-CR-CAP-13 edge, REQ-CP-008)', () => { ``. La cita es un comentario de título (no toca aserciones): convierte los 2 tests de comportamiento en testRefs de REQ-CP-008 sin alterar AC-3.

## 4. Estrategia de tests (quirúrgica por fase, canónica al cierre)

**Fase B — por fichero (T0/T1, dentro de control-plane/):**

1. **RED → GREEN del contrato**: crear `test/metadata-reserved-keys.spec.ts` (falla: módulo inexistente) → crear el módulo (§2.1) → `npx vitest run test/metadata-reserved-keys.spec.ts`.
2. Refactor `MetadataCard.tsx` + comentario bridge → `npx vitest run test/metadata-reserved-keys.spec.ts test/capability-doc-card.spec.ts` + `npx tsc --noEmit`.
3. Schema `docsSafeMarkdown.tsx` → `npx vitest run test/docs-sanitization.spec.ts test/entity-link-render.spec.ts` + `npx tsc --noEmit` (tsc es obligatorio aquí: retirar `span` toca el tipado del cast).
4. Comentarios `DocTab.tsx` (solo comentarios: T0, sin re-test funcional; `tsc` cubre).

**Fase C — cierre del ciclo (T2, batería quirúrgica ampliada):**

```
npx vitest run test/docs-sanitization.spec.ts test/capability-doc-card.spec.ts \
  test/capability-cross-ref.spec.ts test/entity-page-composition.spec.ts \
  test/extension-isolation.spec.ts test/capability-isolation.spec.ts \
  test/entity-link-render.spec.ts test/metadata-reserved-keys.spec.ts
```

(8 ficheros = los 6 del baseline de exploración §7, 50 tests green sobre HEAD, + `entity-link-render.spec.ts` por tocar el schema del render markdown + el test nuevo). Más `npx tsc --noEmit` y los greps-oráculo de §3.2. La batería `recipe-sinks/decisions-command-sinks` NO procede: ningún fichero del alcance pertenece a recipes/decisions (exploración §7).

**Canónica — verificación y release del ciclo (exige árbol final commiteado):**

1. Condiciones (a)+(b) de REQ-CP-008 ya en el commit (levels.json + citas en tests).
2. `node verification/src/index.ts traceability build` → `node verification/src/index.ts audit all` → esperado `overall: PASS — proven 92 · waived 0 · blocking 0`, `unmapped 0`, `brokenReferences: []` (baseline verificado hoy: `verification/audit/all.md:5` — `PASS — proven 91`, git 9b5ddf3; +1 = REQ-CP-008 PROVEN por fitness).
3. `node verification/src/index.ts verify` → 11/11 escenarios PASS, sin escenarios ni waivers nuevos.

Las evidencias canónicas NO se ejecutan en esta fase de diseño (el árbol aún no lleva los cambios); el design solo fija los comandos y los números esperados contra los que la fase de verificación debe rendir cuentas.

## 5. Evaluación de deuda (severidad / prioridad)

| ID | Deuda | Severidad | Prioridad | Estado tras el ciclo |
|---|---|---|---|---|
| L2 (audit deuda) | Contrato cross-feature oculto skip-list ↔ inyección `content`, repartido como magic strings en 2 ficheros | **Baja** (mantenibilidad: riesgo de divergencia silenciosa si un productor futuro añade una clave reservada) | Alta dentro del backlog — es el punto del ciclo | **RESUELTA** (REQ-CP-008) |
| L4a | Entradas muertas del schema de sanitización (`img`+`data-entity-ref`, `span` completa): superficie allow-list más permisiva de lo necesario | Baja (higiene/endurecimiento; sin explotación conocida — no hay productores) | Alta dentro del backlog | **RESUELTA** |
| L4b | 4 comentarios falsos de `DocTab` (guarda "reutilizada" que es re-implementada; renderer inexistente `safeReactMarkdown`) | **Baja-media** (inducen a error sobre guardas de seguridad: quien modifique `isSafeRelativePath` creería a DocTab cubierto; quien busque `safeReactMarkdown` no encuentra el pipeline real) | Alta dentro del backlog | **RESUELTA** |
| DEBT-CPH-R1 | Duplicación residual: `isSafeDocPath` (`DocTab.tsx:25-30`) vs `isSafeRelativePath` (`SnapshotProjectSource.ts:12-17`) — funcionalmente equivalentes hoy, pueden divergir | Baja | Backlog (triage posterior) | **PERMANECE** — el ciclo elimina la mentira, no la duplicación: unificar exige mover la guarda a `src/lib` o importar el loader desde `docs/`, una decisión de boundary fuera del alcance declarado en spec. Queda registrada y VISIBLE (antes estaba oculta tras un comentario falso). |
| — | 121 gaps `requirement-unowned` preexistentes (REQ-DOC-1/2 entre ellos) | Baja (no bloquean: audit PASS) | Triage aparte | **PERMANECE** (fuera de scope, spec §Alcance) |

**Deuda nueva introducida**: ninguna. El módulo nuevo no añade lógica (una constante + un predicado), no añade dependencias, y no ensancha ningún edge; los 2 tests nuevos son deterministas y sin I/O.

## 6. Riesgos y respuestas de diseño

| Riesgo | Respuesta |
|---|---|
| Retirar la línea `img` completa rompería `docs-sanitization.spec.ts:128` (`alt` stripped) | Descartado por diseño: §2.4 retira SOLO `'data-entity-ref'`, conserva `['src','alt']` (exploración §3.1: `defaultSchema.attributes.img` sin `alt`, override de primer nivel REEMPLAZA) |
| Consumidor oculto de `span[className,data-entity-ref]` | Descartado: cero productores de `<span>`/`<img>` con refs (ambas ramas del plugin emiten `<a>`), cero aserciones en `test/` (greps exploración §3.1-3.2); `docsSafeMarkdown` es el único renderizador markdown del pipeline docs |
| Import de `src/lib` dispara algún guard | Descartado contra el código del guard (`extension-isolation.spec.ts:111-133` solo `features/*→features/*`; `capability-isolation.spec.ts` vigila fetch/persistence/store, no constantes puras) — y AC-4 lo demuestra al cierre |
| Import muerto en el bridge rompe `tsc` | Resuelto: §2.3 — el bridge referencía el contrato por nombre en el comentario, sin `import` (`noUnusedLocals: true` verificado) |
| Cita de REQ no declarado → gap nuevo | El único id nuevo citado es REQ-CP-008, ya declarado en la fase Specify (spec cerrada + copia verificada); el ítem 2 cita solo REQs existentes (REQ-DOC-1 no se cita en comentarios nuevos) |
| `isPluralArtifact` descarta el id en la cosecha | No aplica: `REQ-CP-008` es numerado (exploración: el filtro descarta patronímicos plurales, `build.ts:144-145`) |

## 7. Fuera de alcance (re-confirmado)

`entityLinkPlugin.ts`; unificación de la guarda de paths (DEBT-CPH-R1); sinks FSA; `epub/`/`comic-renderer/`; gaps `requirement-unowned` preexistentes; tagging/release v0.24.1 (procedimiento del orquestador); cualquier cambio en `DECLARED_CROSS_FEATURE`, waivers o escenarios del registry.
