/**
 * epub — OCF builders for the two M15 export targets.
 *
 * Both variants are store-mode ZIPs (lib/store-zip) with `mimetype` as the
 * FIRST entry and content exactly "application/epub+zip" — the reader-entry
 * contract checked by validate.ts and the harness epub-entries oracle.
 * No new dependencies; output is deterministic.
 */

import type { SequentialIrDoc } from '../sequential-art/types';
import { renderPageSvg } from '../comic-renderer/svg';
import type { PresentationProfile } from '../comic-renderer/types';
import type { ChapterManuscript } from '../sequential-art/types';
import { buildZip, type ZipEntry } from '../../lib/store-zip';
import type { EpubMetadata } from './types';
import { chapterXhtml, chapterCount, navXhtml, svgPageXhtml } from './xhtml';
import { buildOpf, containerXml } from './opf';

const MIMETYPE = 'application/epub+zip';
const OPF_PATH = 'OEBPS/content.opf';

const encoder = new TextEncoder();

function entriesToOcf(entries: ZipEntry[]): Uint8Array {
  // OCF requires `mimetype` first and stored; buildZip stores everything, so
  // ordering is the only contract here.
  const mimetype: ZipEntry = { name: 'mimetype', data: encoder.encode(MIMETYPE) };
  return buildZip([mimetype, ...entries]);
}

/** Reflowable EPUB: one chapter XHTML per manuscript scene + nav + OPF. */
export function buildEpubReflowable(manuscript: ChapterManuscript, metadata: EpubMetadata): Uint8Array {
  const chapters = Array.from({ length: chapterCount(manuscript) }, (_, i) => chapterXhtml(manuscript, i));

  const manifest = [
    { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: 'nav' },
    ...chapters.map((c) => ({ id: c.id, href: `${c.id}.xhtml`, mediaType: 'application/xhtml+xml' })),
  ];
  const spine = chapters.map((c) => ({ idref: c.id }));

  const opf = buildOpf({ variant: 'reflowable', metadata, manifest, spine });
  const entries: ZipEntry[] = [
    { name: 'META-INF/container.xml', data: encoder.encode(containerXml(OPF_PATH)) },
    { name: OPF_PATH, data: encoder.encode(opf) },
    { name: 'OEBPS/nav.xhtml', data: encoder.encode(navXhtml(manuscript, chapters)) },
    ...chapters.map((c) => ({ name: c.href, data: encoder.encode(c.xhtml) })),
  ];
  return entriesToOcf(entries);
}

/** Fixed-layout EPUB: one pre-paginated XHTML page per SequentialIrDoc page. */
export function buildEpubFixedLayout(
  doc: SequentialIrDoc,
  profile: PresentationProfile,
  metadata: EpubMetadata,
): Uint8Array {
  const pages = doc.pages.map((_page, index) => {
    const svg = renderPageSvg(doc, index, profile);
    const name = `page-${String(index + 1).padStart(2, '0')}`;
    return {
      id: `page-${String(index + 1).padStart(2, '0')}`,
      href: `OEBPS/${name}.xhtml`,
      xhtml: svgPageXhtml(svg, index, profile.page.width, profile.page.height, metadata.title),
    };
  });

  const manifest = [
    { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: 'nav' },
    ...pages.map((p) => ({ id: p.id, href: p.href.replace('OEBPS/', ''), mediaType: 'application/xhtml+xml', properties: 'svg' })),
  ];
  const spine = pages.map((p) => ({ idref: p.id }));

  const opf = buildOpf({ variant: 'fixed-layout', metadata, manifest, spine });
  const entries: ZipEntry[] = [
    { name: 'META-INF/container.xml', data: encoder.encode(containerXml(OPF_PATH)) },
    { name: OPF_PATH, data: encoder.encode(opf) },
    { name: 'OEBPS/nav.xhtml', data: encoder.encode(navFxl(doc, metadata)) },
    ...pages.map((p) => ({ name: p.href, data: encoder.encode(p.xhtml) })),
  ];
  return entriesToOcf(entries);
}

/** FXL nav: one link per fixed page. */
function navFxl(doc: SequentialIrDoc, metadata: EpubMetadata): string {
  const items = doc.pages
    .map((_p, i) => {
      const name = `page-${String(i + 1).padStart(2, '0')}`;
      return `      <li><a href="${name}.xhtml">${metadata.title} — page ${i + 1}</a></li>`;
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!DOCTYPE html>',
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es" xml:lang="es">',
    '  <head>',
    `    <title>${metadata.title}</title>`,
    '    <meta charset="utf-8"/>',
    '  </head>',
    '  <body>',
    '    <nav epub:type="toc" id="toc">',
    '      <ol>',
    items,
    '      </ol>',
    '    </nav>',
    '  </body>',
    '</html>',
    '',
  ].join('\n');
}

export { MIMETYPE, OPF_PATH };
