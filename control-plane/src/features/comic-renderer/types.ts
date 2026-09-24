/**
 * Comic renderer types (M13) — layered comic proof from SequentialArtIR.
 *
 * The exit criterion (roadmap M13) is a comic proof with EDITABLE TEXT not
 * baked by the image model: art is a placeholder layer, lettering is a separate
 * SVG text layer, and the CBZ proof stores vector page files.
 */

export interface PresentationProfile {
  id: 'comic';
  label: string;
  page: { width: number; height: number };
  margin: number;
  gutter: number;
  fontFamily: string;
  fontSize: number;
  panelStroke: string;
  panelFill: string;
  artSlotFill: string;
  balloonFill: string;
  balloonStroke: string;
  captionFill: string;
}

export const COMIC_PROFILE: PresentationProfile = {
  id: 'comic',
  label: 'Comic (western, LTR)',
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
