/**
 * adapter — deterministic ChapterManuscript → SequentialArtIR (M12).
 *
 * Contract highlights (docs/11 + UAT-M12-01):
 * - targets 8–10 pages for chapters with enough beats (fewer beats → fewer
 *   pages, honestly, without failing);
 * - one panel per beat, reading order = global beat order;
 * - dialogue is carried VERBATIM as speech bubbles (editable text) and never
 *   baked into images;
 * - scene boundaries become `gutterAfter: 'scene-break'`;
 * - shotRefs are deterministic (`shot-<nn>` in reading order) as the Visual IR
 *   generation contract.
 */

import type {
  ChapterBeat,
  ChapterManuscript,
  SequentialIrDoc,
  SequentialPanel,
  SequentialPage,
} from './types.ts';

const MIN_TARGET_PAGES = 8;
const MAX_TARGET_PAGES = 10;
const BEATS_PER_PAGE = 3.5;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function layoutFor(panelCount: number): { rows: number; columns: number; template: 'grid' } {
  if (panelCount <= 1) return { rows: 1, columns: 1, template: 'grid' };
  if (panelCount <= 2) return { rows: 1, columns: 2, template: 'grid' };
  if (panelCount <= 4) return { rows: 2, columns: 2, template: 'grid' };
  if (panelCount <= 6) return { rows: 3, columns: 2, template: 'grid' };
  return { rows: 4, columns: 2, template: 'grid' };
}

function targetPageCount(totalBeats: number): number {
  if (totalBeats >= MIN_TARGET_PAGES * Math.floor(BEATS_PER_PAGE)) {
    return Math.min(MAX_TARGET_PAGES, Math.max(MIN_TARGET_PAGES, Math.ceil(totalBeats / BEATS_PER_PAGE)));
  }
  return Math.max(1, Math.min(MAX_TARGET_PAGES, Math.ceil(totalBeats / BEATS_PER_PAGE)));
}

/** Flat beats annotated with their scene index and position inside the scene. */
interface FlatBeat {
  beat: ChapterBeat;
  sceneIndex: number;
  isSceneEnd: boolean;
}

function flatten(scenes: ChapterManuscript['scenes']): FlatBeat[] {
  const flat: FlatBeat[] = [];
  scenes.forEach((scene, sceneIndex) => {
    scene.beats.forEach((beat, beatIndex) => {
      flat.push({
        beat,
        sceneIndex,
        isSceneEnd: beatIndex === scene.beats.length - 1,
      });
    });
  });
  return flat;
}

/** Split beats into `pages` chunks: earlier pages take the remainder (deterministic). */
function chunkForPages(flat: FlatBeat[], pages: number): FlatBeat[][] {
  const total = flat.length;
  const base = Math.floor(total / pages);
  const remainder = total % pages;
  const chunks: FlatBeat[][] = [];
  let cursor = 0;
  for (let i = 0; i < pages; i++) {
    const size = base + (i < remainder ? 1 : 0);
    chunks.push(flat.slice(cursor, cursor + size));
    cursor += size;
  }
  return chunks.filter((chunk) => chunk.length > 0);
}

export interface AdaptOptions {
  /** Overrides the manuscript reading direction (defaults to the manuscript's). */
  readingDirection?: ChapterManuscript['readingDirection'];
}

export function adaptChapterToSequentialIr(
  manuscript: ChapterManuscript,
  _options: AdaptOptions = {},
): SequentialIrDoc {
  void _options; // direction lives on the manuscript; reserved for per-call override
  const flat = flatten(manuscript.scenes);
  const pages = chunkForPages(flat, targetPageCount(flat.length));

  let panelIndex = 0;
  const outPages: SequentialPage[] = pages.map((chunk, pageIndex) => {
    const panels: SequentialPanel[] = chunk.map((entry, positionInPage) => {
      panelIndex += 1;
      const isLastOverall = panelIndex === flat.length;
      const panel: SequentialPanel = {
        id: `panel-${pad2(panelIndex)}`,
        shotRef: `shot-${pad2(panelIndex)}`,
      };
      if (entry.beat.description) panel.caption = entry.beat.description;
      if (entry.beat.dialogue && entry.beat.dialogue.length > 0) {
        panel.speech = entry.beat.dialogue.map((line) => ({
          speaker: line.speaker,
          text: line.text,
          ...(line.kind ? { kind: line.kind } : {}),
        }));
      }
      if (entry.isSceneEnd && !isLastOverall) {
        panel.gutterAfter = 'scene-break';
      } else if (positionInPage < chunk.length - 1) {
        panel.gutterAfter = 'medium';
      }
      return panel;
    });
    return {
      id: `page-${pad2(pageIndex + 1)}`,
      panels,
      layout: layoutFor(panels.length),
    };
  });

  return {
    schema: 'sequential-ir/v1',
    version: '1.0',
    pages: outPages,
  };
}

/** Reading order across the whole document (1-based, page-major then panel order). */
export function readingOrder(doc: SequentialIrDoc): Array<{ pageId: string; panelId: string; shotRef: string; order: number; gutterAfter?: string }> {
  const order: Array<{ pageId: string; panelId: string; shotRef: string; order: number; gutterAfter?: string }> = [];
  let n = 0;
  for (const page of doc.pages) {
    for (const panel of page.panels) {
      n += 1;
      order.push({
        pageId: page.id,
        panelId: panel.id,
        shotRef: panel.shotRef,
        order: n,
        ...(panel.gutterAfter ? { gutterAfter: panel.gutterAfter } : {}),
      });
    }
  }
  return order;
}
