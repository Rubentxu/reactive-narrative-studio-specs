/**
 * comic-renderer-manga.spec.ts — M14 dual-render tests.
 *
 * Requirements: REQ-M14-01 (profile contract: direction + screentone, comic
 * output unchanged), REQ-M14-02 (MANGA_PROFILE monochrome + rtl + screentone),
 * REQ-M14-03 (RTL grid mirroring), REQ-M14-04 (screentone pattern fill),
 * REQ-M14-05 (dual-render proof: same SequentialIrDoc through both profiles).
 */

import { describe, it, expect } from 'vitest';
import { adaptChapterToSequentialIr } from '../src/features/sequential-art/adapter';
import { SAMPLE_CHAPTER } from '../src/features/sequential-art/fixtures/sample-chapter';
import { COMIC_PROFILE, MANGA_PROFILE } from '../src/features/comic-renderer/types';
import { computePanelRects, renderPageModel } from '../src/features/comic-renderer/layout';
import { renderPageSvg } from '../src/features/comic-renderer/svg';
import { buildCbz } from '../src/features/comic-renderer/cbz';
import { readZipEntries } from '../src/lib/store-zip';

const doc = adaptChapterToSequentialIr(SAMPLE_CHAPTER);

function extractColors(svg: string): string[] {
  const attrs = [...svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,8})"/g)].map((m) => m[1] ?? '');
  return [...new Set(attrs)];
}

function isGrayscale(color: string): boolean {
  const hex = color.slice(1);
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return r === g && g === b;
}

/** Normalized narrative text of a page SVG (tags stripped, whitespace collapsed). */
function narrativeText(svg: string): string {
  const lettering = svg.match(/<g class="comic-lettering-layer">[\s\S]*?<\/g>/)?.[0] ?? '';
  return lettering
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('profile contract (REQ-M14-01, REQ-M14-02)', () => {
  it('declares direction and screentone on both profiles', () => {
    expect(COMIC_PROFILE.direction).toBe('ltr');
    expect(COMIC_PROFILE.screentone).toBe(false);
    expect(MANGA_PROFILE.direction).toBe('rtl');
    expect(MANGA_PROFILE.screentone).toBe(true);
  });

  it('manga palette is strictly monochrome (grayscale fills/strokes only)', () => {
    const mangaSvg = renderPageSvg(doc, 0, MANGA_PROFILE);
    const colors = extractColors(mangaSvg);
    expect(colors.length).toBeGreaterThan(0);
    for (const color of colors) expect(isGrayscale(color), `${color} must be grayscale`).toBe(true);
  });

  it('comic profile SVG keeps M13 flat fills and emits no screentone pattern', () => {
    const comicSvg = renderPageSvg(doc, 0, COMIC_PROFILE);
    expect(comicSvg).not.toContain('<pattern');
    expect(comicSvg).not.toContain('<defs>');
    expect(comicSvg).toContain('data-direction="ltr"');
    expect(comicSvg).toContain(`fill="${COMIC_PROFILE.artSlotFill}"`);
    // M13 baseline colors survive untouched.
    expect(comicSvg).toContain('fill="#e2e8f0"');
    expect(comicSvg).toContain('fill="#fef3c7"');
  });
});

describe('RTL reading order (REQ-M14-03)', () => {
  it('mirrors panel-0 to the rightmost column of its row', () => {
    const page = doc.pages[0]!;
    const comicRects = computePanelRects(page, COMIC_PROFILE);
    const mangaRects = computePanelRects(page, MANGA_PROFILE);
    expect(mangaRects.length).toBe(comicRects.length);
    // 2-column grid: manga panel 0 shares the row and takes the right column.
    expect(comicRects[0]!.x).toBeLessThan(comicRects[1]!.x);
    expect(mangaRects[0]!.x).toBeGreaterThan(mangaRects[1]!.x);
    expect(mangaRects[0]!.x).toBe(comicRects[1]!.x);
    expect(mangaRects[1]!.x).toBe(comicRects[0]!.x);
    // Vertical placement is identical (rows read top-down in both directions).
    expect(mangaRects[0]!.y).toBe(comicRects[0]!.y);
  });

  it('keeps the panel sequence identical across profiles (same reading sequence)', () => {
    const page = doc.pages[0]!;
    const comicRects = computePanelRects(page, COMIC_PROFILE);
    const mangaRects = computePanelRects(page, MANGA_PROFILE);
    expect(mangaRects.map((r) => r.panelId)).toEqual(comicRects.map((r) => r.panelId));
    expect(mangaRects.map((r) => r.shotRef)).toEqual(comicRects.map((r) => r.shotRef));
  });
});

describe('screentone rendering (REQ-M14-04)', () => {
  it('manga art slots use a dot-grid pattern fill', () => {
    const mangaSvg = renderPageSvg(doc, 0, MANGA_PROFILE);
    expect(mangaSvg).toContain('<defs><pattern id="screentone-');
    expect(mangaSvg).toMatch(/<pattern id="screentone-[^"]+" width="8" height="8" patternUnits="userSpaceOnUse">/);
    expect(mangaSvg).toContain('data-direction="rtl"');
    expect(mangaSvg).toContain('data-profile="manga"');
    // Every art slot is filled through the pattern reference.
    const slotFills = [...mangaSvg.matchAll(/class="comic-art-slot"[^>]*fill="([^"]+)"/g)].map((m) => m[1]);
    expect(slotFills.length).toBeGreaterThan(0);
    for (const fill of slotFills) expect(fill).toMatch(/^url\(#screentone-/);
  });

  it('screentone output stays deterministic', () => {
    expect(renderPageSvg(doc, 2, MANGA_PROFILE)).toBe(renderPageSvg(doc, 2, MANGA_PROFILE));
  });
});

describe('dual-render proof — same source, distinct profiles (REQ-M14-05)', () => {
  it('renders the same document through both profiles with identical narrative text', () => {
    for (const [index] of doc.pages.entries()) {
      const comicSvg = renderPageSvg(doc, index, COMIC_PROFILE);
      const mangaSvg = renderPageSvg(doc, index, MANGA_PROFILE);
      expect(narrativeText(comicSvg)).toBe(narrativeText(mangaSvg));
      expect(mangaSvg).not.toBe(comicSvg);
    }
  });

  it('produces profile-distinct page models from the identical SequentialIrDoc', () => {
    const comicModel = renderPageModel(doc, 0, COMIC_PROFILE);
    const mangaModel = renderPageModel(doc, 0, MANGA_PROFILE);
    expect(comicModel.pageId).toBe(mangaModel.pageId);
    // Same panel set, mirrored x placement.
    expect(mangaModel.rects.map((r) => r.panelId)).toEqual(comicModel.rects.map((r) => r.panelId));
    expect(mangaModel.rects.some((r, i) => r.x !== comicModel.rects[i]!.x)).toBe(true);
  });

  it('CBZ proof per profile stores the profile-marked pages', () => {
    const comicBytes = buildCbz(doc, COMIC_PROFILE, { series: 'S', title: 't' });
    const mangaBytes = buildCbz(doc, MANGA_PROFILE, { series: 'S', title: 't' });
    const comicEntries = readZipEntries(comicBytes);
    const mangaEntries = readZipEntries(mangaBytes);
    expect(comicEntries.map((e) => e.name)).toEqual(mangaEntries.map((e) => e.name));
    const mangaPage1 = new TextDecoder().decode(mangaEntries.find((e) => e.name === 'page-01.svg')!.data);
    const comicPage1 = new TextDecoder().decode(comicEntries.find((e) => e.name === 'page-01.svg')!.data);
    expect(mangaPage1).toContain('data-profile="manga"');
    expect(mangaPage1).toContain('<pattern id="screentone-');
    expect(comicPage1).toContain('data-profile="comic"');
    expect(comicPage1).not.toContain('<pattern');
    // Same source → same dialogue text inside both archives.
    const text = (svg: string) => svg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    expect(text(mangaPage1)).toBe(text(comicPage1));
  });
});
