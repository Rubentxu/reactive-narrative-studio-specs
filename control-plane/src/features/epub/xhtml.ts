/**
 * xhtml — EPUB3 document builders (M15).
 *
 * Reflowable chapters come from the ChapterManuscript: scene beats become
 * prose paragraphs, dialogue becomes distinct markup — all text escaped,
 * nothing rasterized. Fixed-layout pages wrap the comic renderer's layered
 * SVG (editable lettering) in an XHTML shell with a viewport meta.
 */

import type { ChapterManuscript } from '../sequential-art/types';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sceneId(index: number): string {
  return `scene-${String(index + 1).padStart(2, '0')}`;
}

/** One EPUB chapter per manuscript scene. */
export interface EpubChapter {
  id: string;
  /** Nav/TOC label. */
  title: string;
  href: string;
  xhtml: string;
}

export function chapterCount(manuscript: ChapterManuscript): number {
  return manuscript.scenes.length;
}

export function chapterXhtml(manuscript: ChapterManuscript, sceneIndex: number): EpubChapter {
  const scene = manuscript.scenes[sceneIndex];
  if (!scene) throw new Error(`scene index ${sceneIndex} out of range (${manuscript.scenes.length} scenes)`);
  const id = sceneId(sceneIndex);
  const href = `OEBPS/${id}.xhtml`;

  const beats = scene.beats.map((beat) => {
    const parts: string[] = [];
    if (beat.description) parts.push(`    <p>${esc(beat.description)}</p>`);
    for (const line of beat.dialogue ?? []) {
      const speaker = line.speaker ? `<em class="speaker">${esc(line.speaker)}</em>: ` : '';
      parts.push(`    <p class="dialogue">${speaker}“${esc(line.text)}”</p>`);
    }
    return parts.join('\n');
  });

  const xhtml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!DOCTYPE html>',
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${esc(manuscript.readingDirection === 'rtl' ? 'ja' : 'es')}" lang="es">`,
    '  <head>',
    `    <title>${esc(manuscript.title)} — ${esc(scene.id)}</title>`,
    '    <meta charset="utf-8"/>',
    '  </head>',
    '  <body>',
    `    <section epub:type="chapter" id="${id}">`,
      beats.length > 0 ? beats.join('\n') : '    <p></p>',
    '    </section>',
    '  </body>',
    '</html>',
    '',
  ].join('\n');

  return { id, title: `${manuscript.title} · ${scene.id}`, href, xhtml };
}

export function navXhtml(manuscript: ChapterManuscript, chapters: EpubChapter[]): string {
  const items = chapters
    .map((c) => `      <li><a href="${c.id}.xhtml">${esc(c.title)}</a></li>`)
    .join('\n');
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!DOCTYPE html>',
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es" xml:lang="es">',
    '  <head>',
    `    <title>${esc(manuscript.title)}</title>`,
    '    <meta charset="utf-8"/>',
    '  </head>',
    '  <body>',
    '    <nav epub:type="toc" id="toc">',
    `      <h1>${esc(manuscript.title)}</h1>`,
    '      <ol>',
    items,
    '      </ol>',
    '    </nav>',
    '  </body>',
    '</html>',
    '',
  ].join('\n');
}

/** Fixed-layout page: XHTML shell embedding one layered comic SVG. */
export function svgPageXhtml(svg: string, pageIndex: number, width: number, height: number, title: string): string {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!DOCTYPE html>',
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es" xml:lang="es">',
    '  <head>',
    `    <title>${esc(title)} — page ${pageIndex + 1}</title>`,
    '    <meta charset="utf-8"/>',
    `    <meta name="viewport" content="width=${width}, height=${height}"/>`,
    '  </head>',
    '  <body>',
    svg.trim(),
    '  </body>',
    '</html>',
    '',
  ].join('\n');
}
