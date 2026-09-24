/**
 * layout — deterministic panel rects and template balloon/caption placement (M13).
 *
 * Doc 11: balloon placement starts template-based (no constraint solver).
 * Positions are fixed by index, so output is fully deterministic and
 * collision-free by construction.
 */

import type { SequentialIrDoc, SequentialPage } from '../sequential-art/types';
import type { BalloonModel, CaptionModel, PanelRect, PresentationProfile } from './types';

/** Panel rectangles for one page: grid rows×cols with margins and gutters. */
export function computePanelRects(page: SequentialPage, profile: PresentationProfile): PanelRect[] {
  const usableWidth = profile.page.width - profile.margin * 2;
  const usableHeight = profile.page.height - profile.margin * 2;
  const columns = page.layout?.columns ?? 2;
  const rows = page.layout?.rows ?? 2;
  const cellWidth = (usableWidth - profile.gutter * (columns - 1)) / columns;
  const cellHeight = (usableHeight - profile.gutter * (rows - 1)) / rows;

  return page.panels.map((panel, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
      panelId: panel.id,
      shotRef: panel.shotRef,
      x: profile.margin + col * (cellWidth + profile.gutter),
      y: profile.margin + row * (cellHeight + profile.gutter),
      width: cellWidth,
      height: cellHeight,
    };
  });
}

function estimateLines(text: string, width: number, fontSize: number): number {
  const charsPerLine = Math.max(8, Math.floor(width / (fontSize * 0.52)));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

/**
 * Template balloon placement: balloons stack downward from the panel's top
 * edge, alternating left/right corners; captions sit in a bottom strip.
 * Fixed-by-index positions guarantee no balloon/balloon overlap.
 */
export function computeLettering(
  page: SequentialPage,
  rects: PanelRect[],
  profile: PresentationProfile,
): Array<{ panelId: string; balloons: BalloonModel[]; captions: CaptionModel[] }> {
  const rectByPanel = new Map(rects.map((r) => [r.panelId, r]));
  return page.panels.map((panel) => {
    const rect = rectByPanel.get(panel.id);
    const balloons: BalloonModel[] = [];
    const captions: CaptionModel[] = [];
    if (!rect) return { panelId: panel.id, balloons, captions };

    const speech = panel.speech ?? [];
    const balloonWidth = Math.min(rect.width * 0.6, 220);
    let y = rect.y + 8;
    speech.forEach((bubble, index) => {
      if ((bubble.kind ?? 'speech') !== 'speech') return;
      const lines = estimateLines(bubble.text, balloonWidth - 16, profile.fontSize);
      const height = lines * (profile.fontSize + 3) + 14;
      const x =
        index % 2 === 0
          ? rect.x + 10
          : rect.x + rect.width - balloonWidth - 10;
      balloons.push({
        kind: 'speech',
        speaker: bubble.speaker ?? '',
        text: bubble.text,
        x,
        y,
        width: balloonWidth,
        height,
        tail: index % 2 === 0 ? 'top-left' : 'top-right',
      });
      y += height + 6;
    });

    const caption = panel.caption;
    if (caption) {
      const capWidth = rect.width - 16;
      const lines = estimateLines(caption, capWidth - 12, profile.fontSize - 1);
      const capHeight = lines * profile.fontSize + 10;
      captions.push({
        text: caption,
        x: rect.x + 8,
        y: rect.y + rect.height - capHeight - 8,
        width: capWidth,
        height: capHeight,
      });
    }
    return { panelId: panel.id, balloons, captions };
  });
}

/** Full deterministic render model for one page. */
export function renderPageModel(doc: SequentialIrDoc, pageIndex: number, profile: PresentationProfile) {
  const page = doc.pages[pageIndex];
  if (!page) throw new Error(`page index ${pageIndex} out of range (${doc.pages.length} pages)`);
  const rects = computePanelRects(page, profile);
  const lettering = computeLettering(page, rects, profile);
  return { pageIndex, pageId: page.id, rects, lettering };
}
