# Design — m11-human-reader-uat (M11)

## D1 — Feature folder `features/human-reader/` (8º folder independiente)

```
features/human-reader/
  types.ts               # FeedbackEntry, RoundReport, Likert, enums
  readerId.ts            # getOrCreateReaderId(): sessionStorage, crypto hex (sin PII)
  roundId.ts             # newRoundId(): crypto.randomUUID hex
  feedbackSerializer.ts  # entryToJsonlLine / reportToJsonl (puro, testeable)
  ReaderFeedbackForm.tsx # formulario + export Blob download
  index.ts              # barrel
```
Sin dependencias nuevas. Sin `fetch`, sin IDB/Dexie/Orama, sin `useProjectionStore`.

## D2 — Modelo y JSONL

```ts
interface FeedbackEntry {
  schema: 'human-reader-uat/feedback/v1';
  source: 'human-reader';            // ADR-019: separación explícita de sintéticos
  roundId: string; readerId: string; // anónimos (hex), readerId de sessionStorage
  ageBracket?: 'child'|'middle_grade'|'ya'|'adult'|'undisclosed';
  engagement?: 'cover_to_cover'|'selected_chapters'|'first_chapter';
  likert?: Partial<Record<'pacing'|'clarity'|'emotional_impact'|'age_appropriateness', 1|2|3|4|5>>;
  freeTextHighlights?: string[];     // máx 10, strings cortos
  revisionImpact?: 'none'|'minor'|'major'|'blocker';
  manuscriptRevision?: string;       // enlace a la decisión de revisión (texto libre, p.ej. "v3")
  submittedAt: string;               // ISO 8601
}
```
Una línea JSON por ronda (round report = 1 entrada; extensible a N). Serializador puro: `serializeEntry(entry): string` + `roundReportToJsonl(entries): string`.

## D3 — Formulario y export

- Todos los campos opcionales; labels explícitos "(opcional)". Botón "Download round report (JSONL)" deshabilitado solo durante la generación.
- Submit → construye entry → `reportToJsonl` → `new Blob([jsonl], {type:'application/x-ndjson'})` → `URL.createObjectURL` + `<a download="reader-uat-<roundId>.jsonl">` → click → revoke.
- Estado en `useState`; `readerId` vía `getOrCreateReaderId()` (sessionStorage).
- Encabezado de página: "Human Reader UAT" + nota de separación ADR-019 ("Human feedback is stored separately from synthetic reader panels; it is exported as a local file, never uploaded.").

## D4 — Extension kind (additivo)

`ReaderFeedbackExtension` registrado en `extensions/types.ts` con `apiVersion: 'control-plane.extensions/v1'` y discriminador `kind: 'reader-feedback'`, siguiendo el patrón de los kinds existentes. Registro en `extensions/registry.ts` sin alterar los kinds m15/m16 (solo unión aditiva). Nota: si el registry no admite un kind sin consumidor todavía, se registra un `PageExtension` para `/reader-uat` (consumido por el router) — decisión final en implementación según la forma real de `extensions/types.ts`.

## D5 — INC-015 (validate.py)

Default sin argumento: si `--negative-fixtures` y no hay fixtures en `<input>/tests/negative-fixtures`, hacer fallback **recursivo** `rglob('negative-fixtures')` bajo el input; si encuentra exactamente uno, usarlo; si varios, listar y pedir argumento explícito. Exit 0 con 3/3 fixtures (mismo comportamiento que el argumento explícito).

## D6 — INC-008 residual (grep oracle)

`extension-isolation.spec.ts` test 4 y 5: patrones `docs|capability-catalog` → `docs|capability-catalog|recipes|human-reader`. Sin cambios de semántica del test.

## D7 — INC-016 (cerrado, no re-documentado)

v0.11.0 (PR-1) ya reescribió `CreateWizard` con render real + `emitPlan` (manifest/skeleton/SHAs reales). M11 verifica con evidencia (grep del código + test existente) y actualiza el nodo del vault INC-016 a `status: closed` con referencia al commit/versión. El roadmap se actualiza para reflejarlo.

## D8 — Scenario `SCN-M11-01-001` (UAT-M11-01 ejecutable)

Steps: build → preview → navigate `/reader-uat` → (captura DOM: etiqueta Human Reader UAT) → click submit vacío → capturar descarga JSONL (download event) → evaluate probe: `indexedDB.databases()` vacío + `sessionStorage` readerId presente + store de proyecto intacto (via `window`? no expuesto — el probe comprueba IDB y sessionStorage) → segundo submit tras rellenar Likert/highlights/manuscriptRevision (fill + select) → capturar segunda descarga → oráculos:
1. `page.separation-label` (browser-content): texto "Human Reader UAT" + mención synthetic separado.
2. `report.jsonl-shape` (file-content + semantic-json): el JSONL descargado parseado por el harness — nueva capacidad: leer un artefacto `.jsonl` de 1 línea y parsear; usar oracle `semantic-json` sobre un artifact JSON generado por el harness?  El harness no parsea JSONL hoy → añadir helper: el scenario puede usar `file-content` para comparar contra un expected exacto (volátil: roundId/readerId/timestamps) — no. Mejor: nueva util en el harness `jsonl` dentro de un oracle `jsonl-schema`? Decisión: añadir al harness un oracle `jsonl-entry` que parsea un artifact `.jsonl`, valida cada línea como JSON y aplica semantic-json contra `expected` con `ignoredPaths` declaradas (roundId, readerId, submittedAt). Reutiliza la maquinaria existente.
3. `report.no-pii-required`: el submit vacío produjo entrada válida (mismo oracle sobre la primera descarga, expected sin campos opcionales).
4. `report.filled-fields`: segunda descarga incluye likert/highlights/revisionImpact/manuscriptRevision (semantic-json con ignoredPaths para ids/timestamp).
5. `idb.none` (browser-evaluate): `{ databases: [] }`.
6. `session.reader-id` (browser-evaluate): `{ hasReaderId: true, readerIdMatches: /^[0-9a-f]{16,}$/ }` — el oracle compara con expected `{hasReaderId: true}` + ignorar el valor.
7. `browser.health`.

Claims: proves: anonimato sin PII requerida, export JSONL ligado a revisión, separación de sintéticos, cero persistencia en DB. doesNotProve: evaluación editorial del feedback, agregación multi-ronda, accesibilidad completa del formulario.
