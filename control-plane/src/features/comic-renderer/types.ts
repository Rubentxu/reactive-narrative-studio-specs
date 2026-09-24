/**
 * Comic renderer types (M13/M14) — layered comic proof from SequentialArtIR.
 *
 * The M13 exit criterion is a comic proof with EDITABLE TEXT not baked by the
 * image model: art is a placeholder layer, lettering is a separate SVG text
 * layer, and the CBZ proof stores vector page files.
 *
 * M14 adds presentation profiles: the same sequential source renders through
 * distinct comic (LTR, flat fills) vs manga (RTL, monochrome + screentone)
 * profiles. Reading direction per doc 11 §Reading direction; screentone is a
 * deterministic SVG pattern fill, not a raster tone.
 */

export type PresentationProfileId = 'comic' | 'manga';
export type ReadingDirection = 'ltr' | 'rtl';

export interface PresentationProfile {
  id: PresentationProfileId;
  label: string;
  /** Reading direction: manga reads right-to-left (doc 11). */
  direction: ReadingDirection;
  /** When true, art slots use a dot-grid screentone pattern fill (manga). */
  screentone: boolean;
  page: { width: number; height: number };
  margin: number;
  gutter: number;
  fontFamily: string;
  fontSize: number;
  panelStroke: string;
  panelFill: string;
  /** Base fill under the screentone pattern when screentone is on. */
  artSlotFill: string;
  balloonFill: string;
  balloonStroke: string;
  captionFill: string;
  captionStroke: string;
  /** Balloon glyph color (editable <text>). */
  textFill: string;
  /** Caption glyph color (editable <text>). */
  captionTextFill: string;
  /** Non-narrative page label color (data-meta). */
  metaFill: string;
}

export const COMIC_PROFILE: PresentationProfile = {
  id: 'comic',
  label: 'Comic (western, LTR)',
  direction: 'ltr',
  screentone: false,
  page: { width: 800, height: 1132 },
  margin: 24,
  gutter: 12,
  fontFamily: 'Georgia, serif',
  fontSize: 13,
  panelStroke: '#111827',
  panelFill: '#f8fafc',
  artSlotFill: '#e2e8f0',
  balloonFill: '#ffffff',
  balloonStroke: '#111827',
  captionFill: '#fef3c7',
  captionStroke: '#d97706',
  textFill: '#111827',
  captionTextFill: '#1f2937',
  metaFill: '#94a3b8',
};

/** Manga profile: monochrome (grayscale only), RTL, screentone art slots. */
export const MANGA_PROFILE: PresentationProfile = {
  id: 'manga',
  label: 'Manga (RTL, screentone)',
  direction: 'rtl',
  screentone: true,
  page: { width: 800, height: 1132 },
  margin: 24,
  gutter: 12,
  fontFamily: '"Hiragino Mincho ProN", "Noto Serif JP", serif',
  fontSize: 14,
  panelStroke: '#000000',
  panelFill: '#f5f5f5',
  artSlotFill: '#e5e5e5',
  balloonFill: '#ffffff',
  balloonStroke: '#000000',
  captionFill: '#eeeeee',
  captionStroke: '#333333',
  textFill: '#000000',
  captionTextFill: '#111111',
  metaFill: '#777777',
};

export interface PanelRect {
  panelId: string;
  shotRef: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BalloonModel {
  kind: 'speech';
  speaker: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tail: 'top-left' | 'top-right';
}

export interface CaptionModel {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageLettering {
  panelId: string;
  balloons: BalloonModel[];
  captions: CaptionModel[];
}

export interface PageRender {
  pageIndex: number;
  pageId: string;
  rects: PanelRect[];
  lettering: PageLettering[];
}
