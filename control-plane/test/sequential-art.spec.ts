/**
 * sequential-art.spec.ts — M12 unit tests (UAT-M12-01 core).
 *
 * Requirements: REQ-SA-1 (schema-valid output), REQ-SA-2 (8–10 pages, reading
 * order), REQ-SA-3 (dialogue as editable text), REQ-SA-4 (scene-breaks),
 * REQ-SA-5 (deterministic shotRefs — fitness level, see
 * verification/traceability/requirement-levels.json).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptChapterToSequentialIr, readingOrder } from '../src/features/sequential-art/adapter';
import { validateSequentialIr } from '../src/features/sequential-art/validate';
import { SAMPLE_CHAPTER } from '../src/features/sequential-art/fixtures/sample-chapter';
import type { ChapterManuscript } from '../src/features/sequential-art/types';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const GOLDEN_PATH = join(REPO_ROOT, 'control-plane/test/fixtures/sequential-art/sample-chapter.golden.json');

describe('adapter — golden (REQ-SA-1, REQ-SA-2)', () => {
  it('produces exactly the committed golden document for the sample chapter', () => {
    const golden = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')) as { doc: unknown };
    const doc = adaptChapterToSequentialIr(SAMPLE_CHAPTER);
    expect(doc).toEqual(golden.doc);
  });

  it('output validates against specs/sequential-ir.schema.json', () => {
    const doc = adaptChapterToSequentialIr(SAMPLE_CHAPTER);
    expect(validateSequentialIr(doc).ok).toBe(true);
  });

  it('targets 8–10 pages for the sample chapter', () => {
    const doc = adaptChapterToSequentialIr(SAMPLE_CHAPTER);
    expect(doc.pages.length).toBeGreaterThanOrEqual(8);
    expect(doc.pages.length).toBeLessThanOrEqual(10);
  });
});

describe('adapter — reading order and structure (REQ-SA-2, REQ-SA-4, REQ-SA-5)', () => {
  const doc = adaptChapterToSequentialIr(SAMPLE_CHAPTER);
  const order = readingOrder(doc);

  it('reading order is strictly sequential 1..N', () => {
    expect(order.map((o) => o.order)).toEqual(order.map((_, i) => i + 1));
  });

  it('shotRefs are deterministic and aligned with reading order', () => {
    expect(order.map((o) => o.shotRef)).toEqual(order.map((_, i) => `shot-${String(i + 1).padStart(2, '0')}`));
  });

  it('marks scene boundaries with gutterAfter scene-break (2 inner boundaries)', () => {
    const breaks = order.filter((o) => o.gutterAfter === 'scene-break');
    expect(breaks.map((b) => b.order)).toEqual([11, 21]); // ends of scene 1 and 2
  });

  it('carries dialogue verbatim as speech text (editable, outside images)', () => {
    const texts = doc.pages.flatMap((p) => p.panels).flatMap((p) => p.speech ?? []).map((s) => s.text);
    expect(texts).toContain('Eso es imposible.');
    expect(texts).toContain('El mar no borra, nieta. Cambia de sitio las cosas.');
    for (const panel of doc.pages.flatMap((p) => p.panels)) {
      for (const bubble of panel.speech ?? []) {
        expect(bubble.text.length).toBeGreaterThan(0);
        expect(bubble.speaker).toBeTruthy();
      }
    }
  });
});

describe('adapter — edge cases', () => {
  function smallChapter(beatsPerScene: number[], direction: ChapterManuscript['readingDirection'] = 'ltr'): ChapterManuscript {
    let n = 0;
    return {
      chapterId: 'ch-small',
      title: 'Small',
      readingDirection: direction,
      scenes: beatsPerScene.map((count, si) => ({
        id: `scene-${si + 1}`,
        beats: Array.from({ length: count }, () => {
          n += 1;
          return {
            id: `b${n}`,
            kind: 'action' as const,
            description: `beat ${n}`,
            ...(n % 2 === 0 ? { dialogue: [{ speaker: 'x', text: `line ${n}` }] } : {}),
          };
        }),
      })),
    };
  }

  it('a small chapter produces fewer pages without failing', () => {
    const doc = adaptChapterToSequentialIr(smallChapter([3, 3]));
    expect(doc.pages.length).toBe(2);
    expect(validateSequentialIr(doc).ok).toBe(true);
  });

  it('accepts rtl and vertical manuscripts without changing the IR contract', () => {
    for (const direction of ['rtl', 'vertical'] as const) {
      const doc = adaptChapterToSequentialIr(smallChapter([4], direction));
      expect(doc.schema).toBe('sequential-ir/v1');
      expect(validateSequentialIr(doc).ok).toBe(true);
    }
  });

  it('the last panel of the document has no trailing scene-break', () => {
    const doc = adaptChapterToSequentialIr(SAMPLE_CHAPTER);
    const last = doc.pages[doc.pages.length - 1]?.panels.at(-1);
    expect(last?.gutterAfter).toBeUndefined();
  });
});
