# Design — m12-sequential-art-core (M12)

## D1 — Modelo de entrada (`ChapterManuscript`, beats tipados)

```ts
interface ChapterBeat {
  id: string;                 // beat-01…
  sceneId?: string;           // Narrative IR scene ref
  kind: 'establishing'|'action'|'dialogue'|'reaction'|'reveal'|'transition';
  characters?: string[];
  description: string;        // acción/encuadre (editable text)
  dialogue?: Array<{ speaker: string; text: string; kind?: 'speech'|'thought'|'caption'|'sfx' }>;
  importance?: number;        // 0..1 (doc 11 beat importance)
}
interface ChapterScene { id: string; beats: ChapterBeat[] }
interface ChapterManuscript {
  chapterId: string;          // ^ch-[a-z0-9-]+
  title: string;
  readingDirection: 'ltr'|'rtl'|'vertical';
  scenes: ChapterScene[];
}
```
La reducción de prosa a beats es manual/autoría (o futura skill); M12 define el contrato y el adaptador.

## D2 — Adaptador puro (`features/sequential-art/adapter.ts`)

Determinista, sin I/O:
- Flatten de beats con índice de escena.
- **Paginación objetivo 8–10**: `targetPages = clamp(ceil(totalBeats / 3.5), 8, 10)` cuando `totalBeats >= 24`; si hay menos beats, `pages = max(1, ceil(beats/3.5))` (capítulos pequeños producen menos páginas sin fallar). Distribución round-robin por escena (no partir una escena más de lo necesario; los cortes de página caen en fronteras de beat).
- **Panel por beat**: `panel-<nn>` (orden global), `shotRef: 'shot-<nn>'`, `caption: description`, `speech[]` desde `dialogue` (texto verbatim; `kind` por defecto 'speech'), `gutterAfter: 'scene-break'` si es último beat de escena (si no, 'medium').
- `Page.layout`: `{ rows, columns, template: 'grid' }` calculado por panels de la página (1→splash-like grid 1x1; 2-4 → 2x2; 5-6 → 3x2; 7+ → 4x2).
- El doc NO lleva dirección (el schema no la tiene) — la dirección vive en el manuscrito y la UI la muestra.
- Validación ajv contra `specs/sequential-ir.schema.json` (`validateSequentialIr(doc)`).

## D3 — Fixture + golden

`features/sequential-art/fixtures/sample-chapter.ts`: capítulo "El faro de sal" (3 escenas × ~11 beats = 33 beats → 10 páginas), direcciones ltr; `__fixtures__/sequential-ir.golden.json` generado y commiteado (golden test exacto + schema).

## D4 — Página `/storyboard` (`views/Storyboard.tsx` + `features/sequential-art/`)

- Selector de capítulo: por ahora el capítulo de muestra (etiquetado "Sample chapter (M12 core)"); la integración con manuscritos de proyecto llega con el pipeline de manuscritos.
- Render: por página → grid CSS con panels: badge `#<readingOrder>`, shotRef, caption, diálogos como líneas de texto (`<p>` con speaker), marca `scene-break`, indicador de dirección (`Reading direction: ltr`).
- **Cero `<img>`** (invariante UAT).
- **Graph lens** (misma página, sección): SVG con nodo por panel (posición por orden de lectura, wrap por página), aristas de orden, grosores/opacity por `importance`, gap visible en scene-breaks. Probe: `document.querySelectorAll('.seq-lens-node').length === panels`.

## D5 — Scenario `SCN-M12-01-001`

Steps: build → preview → navigate `/storyboard` → oráculos:
1. `storyboard.pages-range` (browser-evaluate): `{ pageCards, panels, imgCount: 0, minOrder: 1, maxOrder, orderStrictlyIncreasing: true, directionLabel: 'ltr' }` comparado con expected (maxOrder = panels totales del golden; pageCards entre 8 y 10).
2. `storyboard.dialogue-as-text` (browser-evaluate): `{ dialogueSamples: [3 textos del golden presentes], imgCount: 0 }`.
3. `storyboard.graph-lens` (browser-evaluate): `{ lensNodes: <panels>, lensEdges: panels-1 }`.
4. `storyboard.scene-breaks` (browser-content): textContains "Scene break".
5. `browser.health`.

## D6 — Levels y trazabilidad

REQ-SA-1/2/3/4/5: fitness parcial… decisión: REQ-SA-1/2/3/4 → **functional** (scenario + golden); REQ-SA-5 fitness (determinismo verificado por tests unitarios); REQ-SA-6 functional; REQ-SA-7 funcional por definición. Citas en tests del feature.
