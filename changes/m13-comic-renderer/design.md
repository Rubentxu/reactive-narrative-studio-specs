# Design — m13-comic-renderer (M13)

## D1 — `PresentationProfile`

```ts
interface PresentationProfile {
  id: 'comic';                    // M14 añadirá 'manga'
  label: string;
  page: { width: 800; height: 1132 };
  margin: 24; gutter: 12;
  fontFamily: string; fontSize: number;
  panelStroke: string; panelFill: string; artSlotFill: string;
  balloonFill: string; balloonStroke: string; captionFill: string;
  readingDirection: 'ltr' | 'rtl' | 'vertical'; // coherente con el manuscrito
}
```
M14 añadirá su perfil sin tocar el motor.

## D2 — Layout (`layout.ts`)

`computePanelRects(page, profile): PanelRect[]` — reparte el área útil (page − margins) en rows×cols con gutters; cada panel ocupa su celda (v1 sin spans; el schema no tiene spans). `computeBalloons(panel, rect, profile): BalloonModel[]` — plantilla: balones apilados desde la esquina superior (alternando L/R por índice), ancho según longitud de texto (estimación por caracteres), alto por líneas; captions en franja inferior del panel. Determinista y sin colisiones por construcción (posiciones fijas por índice).

## D3 — SVG (`svg.ts`)

`renderPageSvg(doc, pageIndex, profile): string`:
- `<svg viewBox="0 0 W H">`
- `<g class="comic-art-layer">`: por panel, `<rect>` marco + `<rect class="comic-art-slot">` interior con `<text class="comic-art-slot-label">shotRef</text>` — nota: el slot-label es metadato del placeholder, no lettering; para que art-layer quede SIN texto narrativo, el label se marca como `data-meta="true"` y el probe de separación lo ignora (el lettering es el único texto de diálogo).
- `<g class="comic-lettering-layer">`: balones (elipse+cola+`<text>` con tspans) y captions (rect+`<text>`).
- Escape XML de todos los textos.
- Sin `<image>` en ningún caso.

## D4 — ZIP/CBZ (`zip.ts`, `cbz.ts`)

- ZIP store-mode: CRC32 (tabla), local file headers + central directory + EOCD; UTF-8 filenames; sin compresión (los SVG quedan como bytes crudos → verificables).
- `buildComicInfo(doc, profile)`: ComicInfo.xml (Series, Title, PageCount, LanguageISO) — mínimo estándar.
- `buildCbz(doc, profile): { bytes: Uint8Array; entryNames: string[] }` — `page-01.svg`… + `ComicInfo.xml`.

## D5 — Vista `/comic` (`views/ComicProof.tsx`)

- Selector de página (‹ ›), toggle checkboxes: Art layer / Lettering layer (aplican `display:none` al `<g>` correspondiente mediante re-render controlado).
- Render del SVG de página con `dangerouslySetInnerHTML` (string determinista del motor).
- Botones: "Download page SVG", "Download CBZ proof" (Blob + `<a download>`; sin fetch).
- Fuente de datos: el mismo adaptador M12 sobre el capítulo de muestra (etiquetado), coherente con `/storyboard`.

## D6 — Harness: oracle `zip-entries`

Lee el artefacto CBZ del bundle, parsea el central directory (store-mode) y verifica: `entryCount` mínimo, `namesInclude`, y `entryContains` (búsqueda de bytes ASCII en el contenido crudo de entradas cuyo nombre case con prefijo). Tests unitarios del oracle con un CBZ sintético del writer.

## D7 — UAT doc + scenario

`uat/UAT-M13-01.md`: Given SequentialArtIR de un capítulo aceptado; When el renderer produce el comic proof (CBZ); Then el proof es por capas (arte placeholder + lettering separado), balones/captions editables y el zip contiene páginas vectoriales + ComicInfo.xml. Pass: los diálogos existen como nodos de texto en las páginas del proof y no hay contenido rasterizado del texto; regenerar el lettering no requiere regenerar imágenes (no las hay).

`SCN-M13-01-001` steps: build → preview → navigate `/comic` → probe capas → click toggle art (probe de nuevo) → submit CBZ (download, artifactName) → oráculos: `layers.separated`, `layers.toggle-works`, `cbz.contents` (zip-entries), `browser.health`.
