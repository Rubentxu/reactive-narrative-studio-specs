/**
 * svg — layered SVG page rendering (M13).
 *
 * Layer contract (exit criterion): the art layer carries placeholder slots and
 * NO narrative text; the lettering layer carries ALL dialogue/captions as
 * editable <text> nodes; the document contains no <image> elements ever.
 */

import type { SequentialIrDoc } from '../sequential-art/types';
import { renderPageModel } from './layout';
import type { PresentationProfile } from './types';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const charsPerLine = Math.max(8, Math.floor(maxWidth / (fontSize * 0.52)));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > charsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Render one page as a layered SVG string. Deterministic. */
export function renderPageSvg(doc: SequentialIrDoc, pageIndex: number, profile: PresentationProfile): string {
  const model = renderPageModel(doc, pageIndex, profile);
  const { width, height } = profile.page;
  const page = doc.pages[pageIndex];

  // Screentone (manga): deterministic dot-grid pattern fill for art slots.
  // Comic profile (screentone=false) emits no defs and keeps flat fills.
  const patternId = `screentone-${page?.id ?? `page-${pageIndex}`}`;
  const defs = profile.screentone
    ? `<defs><pattern id="${patternId}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${profile.artSlotFill}"/><circle cx="2" cy="2" r="1" fill="#111111"/><circle cx="6" cy="6" r="1" fill="#111111"/></pattern></defs>`
    : '';
  const artSlotFill = profile.screentone ? `url(#${patternId})` : profile.artSlotFill;

  const artParts: string[] = [];
  for (const rect of model.rects) {
    artParts.push(
      `<rect class="comic-art-slot" data-shot-ref="${rect.shotRef}" x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${artSlotFill}" stroke="${profile.panelStroke}" stroke-width="2"/>`,
    );
    artParts.push(
      `<text class="comic-art-slot-label" data-meta="true" x="${rect.x + 8}" y="${rect.y + 18}" font-family="monospace" font-size="11" fill="${profile.screentone ? '#555555' : '#64748b'}">${esc(rect.shotRef)} · placeholder (generated later)</text>`,
    );
  }

  const letteringParts: string[] = [];
  for (const entry of model.lettering) {
    for (const balloon of entry.balloons) {
      const lines = wrapText(balloon.text, balloon.width - 16, profile.fontSize);
      letteringParts.push(
        `<ellipse class="comic-balloon" cx="${balloon.x + balloon.width / 2}" cy="${balloon.y + balloon.height / 2}" rx="${balloon.width / 2}" ry="${balloon.height / 2}" fill="${profile.balloonFill}" stroke="${profile.balloonStroke}"/>`,
      );
      const tailX = balloon.tail === 'top-left' ? balloon.x + 18 : balloon.x + balloon.width - 18;
      letteringParts.push(
        `<path class="comic-balloon-tail" d="M ${tailX} ${balloon.y + balloon.height - 2} l 6 14 l -14 -8 Z" fill="${profile.balloonFill}" stroke="${profile.balloonStroke}"/>`,
      );
      const textY = balloon.y + profile.fontSize + 6;
      const speakerLine = balloon.speaker
        ? `<tspan font-weight="bold">${esc(balloon.speaker)}:</tspan> `
        : '';
      letteringParts.push(
        `<text class="comic-lettering" x="${balloon.x + 10}" y="${textY}" font-family="${profile.fontFamily}" font-size="${profile.fontSize}" fill="${profile.textFill}">${speakerLine}${lines
          .map((line, li) => (li === 0 ? esc(line) : `<tspan x="${balloon.x + 10}" dy="${profile.fontSize + 3}">${esc(line)}</tspan>`))
          .join('')}</text>`,
      );
    }
    for (const caption of entry.captions) {
      const lines = wrapText(caption.text, caption.width - 12, profile.fontSize - 1);
      letteringParts.push(
        `<rect class="comic-caption-box" x="${caption.x}" y="${caption.y}" width="${caption.width}" height="${caption.height}" fill="${profile.captionFill}" stroke="${profile.captionStroke}"/>`,
      );
      letteringParts.push(
        `<text class="comic-lettering comic-caption" x="${caption.x + 6}" y="${caption.y + profile.fontSize}" font-family="${profile.fontFamily}" font-size="${profile.fontSize - 1}" fill="${profile.captionTextFill}">${lines
          .map((line, li) => (li === 0 ? esc(line) : `<tspan x="${caption.x + 6}" dy="${profile.fontSize}">${esc(line)}</tspan>`))
          .join('')}</text>`,
      );
    }
  }

  const pageLabel = `<text class="comic-page-number" data-meta="true" x="${width - 60}" y="${height - 12}" font-family="monospace" font-size="11" fill="${profile.metaFill}">${esc(page?.id ?? '')}</text>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-profile="${profile.id}" data-direction="${profile.direction}">`,
    defs,
    `<g class="comic-art-layer">${artParts.join('\n')}</g>`,
    `<g class="comic-lettering-layer">${letteringParts.join('\n')}</g>`,
    pageLabel,
    '</svg>',
    '',
  ].join('\n');
}
