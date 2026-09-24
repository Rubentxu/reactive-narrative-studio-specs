# Design — m14-manga-profile (M14)

**Cycle**: `p-7c4aff45199a2069/m14-manga-profile` · branch `feat/m14-manga-profile` · base `2ae2b8d`

## Contrato de perfil (types.ts)

```ts
export type PresentationProfileId = 'comic' | 'manga';
export type ReadingDirection = 'ltr' | 'rtl';
export interface PresentationProfile {
  id: PresentationProfileId;
  direction: ReadingDirection;   // doc 11 §Reading direction
  screentone: boolean;           // patrón de puntos determinista (manga)
  // ...campos M13 + colores elevados desde svg.ts:
  captionStroke; textFill; captionTextFill; metaFill;
}
```

- `COMIC_PROFILE`: dirección 'ltr', screentone false, valores M13 preservados (compatibilidad de bytes).
- `MANGA_PROFILE`: id 'manga', 'rtl', screentone true, paleta gris (`#000000/#f5f5f5/#e5e5e5/#ffffff/#eeeeee/#333333/#000000/#111111/#777777`), serif "Hiragino Mincho ProN, Noto Serif JP", fontSize 14.

## RTL (layout.ts)

```
const ltrCol = index % columns;
const col = profile.direction === 'rtl' ? columns - 1 - ltrCol : ltrCol;
```

Una línea; filas intactas. El perfil comic (ltr) produce exactamente el layout M13.

## Screentone (svg.ts)

- Solo cuando `screentone`: `<defs><pattern id="screentone-<pageId>" width="8" height="8" patternUnits="userSpaceOnUse">` con fondo `artSlotFill` y 2 círculos `#111111` (r=1, cx/cy 2 y 6). Slots: `fill="url(#screentone-<pageId>)"`.
- Raíz `<svg>` con `data-profile` y `data-direction` (hooks de probe para UAT).
- Perfil comic: cero cambios de bytes (defs solo si screentone).

## Vista (ComicProof.tsx)

- `PROFILES: Record<PresentationProfileId, PresentationProfile>`; `useState<PresentationProfileId>('comic')`; botones con `data-testid="profile-comic|profile-manga"` y `aria-pressed`.
- Label de perfil activo con `data-testid="comic-profile-label"`; CBZ → `comic-proof.<profile>.cbz`.

## Dual-render proof

Mismo `SAMPLE_CHAPTER` → `renderPageModel` por perfil: mismas secuencias `panelId`/`shotRef`, x espejado, lettering textual idéntico. CBZ por perfil con páginas `data-profile="manga|comic"`.

## Verificación

- Unit/component: `control-plane/test/comic-renderer-manga.spec.ts` (REQ-M14-01..05) + suites M13 existentes (sin regresión).
- UAT: `scenarios/scn-m14-01-001.yaml` (REQ-M14-01..06): probe comic→manga→CBZ×2, oracles browser-evaluate + zip-entries.
