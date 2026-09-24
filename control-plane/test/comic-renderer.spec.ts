/**
 * comic-renderer.spec.ts — M13 unit tests.
 *
 * Requirements: REQ-CR-1 (deterministic panel rects, no overlap), REQ-CR-2
 * (layered SVG: art placeholders + lettering <text>, no <image>), REQ-CR-3
 * (template balloons/captions, editable text), REQ-CR-4 (store-mode CBZ with
 * pages + ComicInfo.xml, verifiable by bytes).
 */

import { describe, it, expect } from 'vitest';
import {
  adaptChapterToSequentialIr,
} from '../src/features/sequential-art/adapter';
import { SAMPLE_CHAPTER } from '../src/features/sequential-art/fixtures/sample-chapter';
import { COMIC_PROFILE } from '../src/features/comic-renderer/types';
import { computePanelRects, renderPageModel } from '../src/features/comic-renderer/layout';
import { renderPageSvg } from '../src/features/comic-renderer/svg';
import { buildCbz, buildComicInfo } from '../src/features/comic-renderer/cbz';
import { buildZip, crc32, readZipEntries } from '../src/features/comic-renderer/zip';

const doc = adaptChapterToSequentialIr(SAMPLE_CHAPTER);

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

describe('panel layout (REQ-CR-1)', () => {
  it('produces one rect per panel, inside the page, without overlaps', () => {
    for (const [index, page] of doc.pages.entries()) {
      const rects = computePanelRects(page, COMIC_PROFILE);
      expect(rects).toHaveLength(page.panels.length);
      for (const rect of rects) {
        expect(rect.x).toBeGreaterThanOrEqual(COMIC_PROFILE.margin - 0.01);
        expect(rect.y).toBeGreaterThanOrEqual(COMIC_PROFILE.margin - 0.01);
        expect(rect.x + rect.width).toBeLessThanOrEqual(COMIC_PROFILE.page.width - COMIC_PROFILE.margin + 0.01);
        expect(rect.y + rect.height).toBeLessThanOrEqual(COMIC_PROFILE.page.height - COMIC_PROFILE.margin + 0.01);
      }
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          expect(overlaps(rects[i]!, rects[j]!), `page ${index} panels ${i}/${j} overlap`).toBe(false);
        }
      }
    }
  });
});

describe('layered SVG (REQ-CR-2, REQ-CR-3)', () => {
  const svg = renderPageSvg(doc, 0, COMIC_PROFILE);

  it('has explicit art and lettering layers, in that order', () => {
    const artIdx = svg.indexOf('comic-art-layer');
    const letteringIdx = svg.indexOf('comic-lettering-layer');
    expect(artIdx).toBeGreaterThan(-1);
    expect(letteringIdx).toBeGreaterThan(artIdx);
  });

  it('art layer carries slots but NO dialogue text; lettering carries ALL dialogue', () => {
    const artLayer = svg.slice(svg.indexOf('comic-art-layer'), svg.indexOf('comic-lettering-layer'));
    expect(artLayer).toContain('comic-art-slot');
    expect(artLayer).toContain('shot-01');
    expect(artLayer).not.toContain('comic-lettering');
    expect(artLayer).not.toContain('Eso es imposible.');

    const letteringLayer = svg.slice(svg.indexOf('comic-lettering-layer'));
    expect(letteringLayer).toContain('comic-lettering');
    expect(letteringLayer).toContain('<text');

    // dialogue lives on the page whose panel carries it (b08 → panel-08 → page 2);
    // long lines wrap into <tspan>s, so compare on normalized text content
    const allPages = doc.pages.map((_, i) => renderPageSvg(doc, i, COMIC_PROFILE)).join('\n');
    const textContent = allPages.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(textContent).toContain('Eso es imposible.');
    expect(textContent).toContain('El mar no borra, nieta. Cambia de sitio las cosas.');
  });

  it('contains no <image> elements ever', () => {
    for (const [pageIndex] of doc.pages.entries()) {
      expect(renderPageSvg(doc, pageIndex, COMIC_PROFILE)).not.toContain('<image');
    }
  });

  it('balloons do not overlap each other within a panel', () => {
    for (const [pageIndex] of doc.pages.entries()) {
      const model = renderPageModel(doc, pageIndex, COMIC_PROFILE);
      for (const entry of model.lettering) {
        for (let i = 0; i < entry.balloons.length; i++) {
          for (let j = i + 1; j < entry.balloons.length; j++) {
            expect(overlaps(entry.balloons[i]!, entry.balloons[j]!), `page ${pageIndex} panel ${entry.panelId} balloons ${i}/${j}`).toBe(false);
          }
        }
      }
    }
  });

  it('is deterministic (two renders are byte-identical)', () => {
    expect(renderPageSvg(doc, 3, COMIC_PROFILE)).toBe(renderPageSvg(doc, 3, COMIC_PROFILE));
  });
});

describe('zip + CBZ (REQ-CR-4)', () => {
  it('crc32 matches known vectors', () => {
    const encoder = new TextEncoder();
    expect(crc32(encoder.encode('123456789'))).toBe(0xcbf43926);
  });

  it('store-mode zip roundtrips entries through the minimal reader', () => {
    const encoder = new TextEncoder();
    const bytes = buildZip([
      { name: 'a.txt', data: encoder.encode('hello zip') },
      { name: 'dir/b.txt', data: encoder.encode('second entry') },
    ]);
    const entries = readZipEntries(bytes);
    expect(entries.map((e) => e.name)).toEqual(['a.txt', 'dir/b.txt']);
    expect(new TextDecoder().decode(entries[0]!.data)).toBe('hello zip');
    expect(new TextDecoder().decode(entries[1]!.data)).toBe('second entry');
  });

  it('the CBZ contains one SVG per page plus ComicInfo.xml with dialogue text in raw bytes', () => {
    const bytes = buildCbz(doc, COMIC_PROFILE, { series: 'El faro de sal', title: 'Chapter test', languageISO: 'es' });
    const entries = readZipEntries(bytes);
    expect(entries).toHaveLength(doc.pages.length + 1);
    expect(entries.at(-1)?.name).toBe('ComicInfo.xml');
    const page1 = entries.find((e) => e.name === 'page-01.svg');
    expect(page1).toBeDefined();
    const text = new TextDecoder().decode(page1!.data);
    expect(text).toContain('comic-lettering-layer');
    expect(text).not.toContain('<image');
    const info = new TextDecoder().decode(entries.at(-1)!.data);
    expect(info).toContain('<PageCount>10</PageCount>');
    // dialogue searchable in raw stored bytes
    const raw = new TextDecoder().decode(bytes);
    expect(raw).toContain('Eso es imposible.');
  });

  it('ComicInfo escapes XML entities in titles', () => {
    const info = buildComicInfo(doc, { series: 'A & B <C>', title: 'T' });
    expect(info).toContain('<Series>A &amp; B &lt;C&gt;</Series>');
  });
});
