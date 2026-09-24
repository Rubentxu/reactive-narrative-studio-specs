/**
 * epub.spec.ts — M15 unit tests (digital publishing).
 *
 * Requirements: REQ-M15-01 (reflowable OCF builder), REQ-M15-02 (fixed-layout
 * builder with rendition + svg properties), REQ-M15-03 (validation adapter:
 * reader-entry contract, deterministic, detects corruption).
 */

import { describe, it, expect } from 'vitest';
import { adaptChapterToSequentialIr } from '../src/features/sequential-art/adapter';
import { SAMPLE_CHAPTER } from '../src/features/sequential-art/fixtures/sample-chapter';
import { COMIC_PROFILE } from '../src/features/comic-renderer/types';
import { buildEpubReflowable, buildEpubFixedLayout, validateEpub } from '../src/features/epub';
import type { EpubMetadata } from '../src/features/epub/types';
import { readZipEntries, buildZip } from '../src/lib/store-zip';
import { chapterXhtml, navXhtml } from '../src/features/epub/xhtml';
import { buildOpf, containerXml } from '../src/features/epub/opf';

const manuscript = SAMPLE_CHAPTER;
const comicDoc = adaptChapterToSequentialIr(manuscript);

const metadata: EpubMetadata = {
  title: 'El faro de sal',
  language: 'es',
  identifier: 'urn:uuid:test-m15',
  author: 'Studio',
};

function entryText(bytes: Uint8Array, name: string): string {
  const entry = readZipEntries(bytes).find((e) => e.name === name);
  expect(entry, `entry ${name} present`).toBeDefined();
  return new TextDecoder().decode(entry!.data);
}

describe('reflowable builder (REQ-M15-01)', () => {
  const bytes = buildEpubReflowable(manuscript, metadata);
  const entries = readZipEntries(bytes);

  it('puts mimetype first with the exact OCF content', () => {
    expect(entries[0]!.name).toBe('mimetype');
    expect(new TextDecoder().decode(entries[0]!.data)).toBe('application/epub+zip');
  });

  it('resolves container.xml → OEBPS/content.opf', () => {
    const container = entryText(bytes, 'META-INF/container.xml');
    expect(container).toContain('full-path="OEBPS/content.opf"');
    expect(containerXml('OEBPS/content.opf')).toContain('application/oebps-package+xml');
  });

  it('has a complete EPUB3 package (metadata, manifest, spine, nav property)', () => {
    const opf = entryText(bytes, 'OEBPS/content.opf');
    expect(opf).toContain('version="3.0"');
    expect(opf).toContain('unique-identifier="pub-id"');
    expect(opf).toContain('<dc:title>El faro de sal</dc:title>');
    expect(opf).toContain('<dc:language>es</dc:language>');
    expect(opf).toContain('dcterms:modified');
    expect(opf).toContain('properties="nav"');
    expect(opf).toContain('rendition:layout">reflowable<');
    // Spine covers the scene chapters.
    const idrefs = [...opf.matchAll(/idref="(scene-\d+)"/g)].map((m) => m[1]);
    expect(idrefs.length).toBe(manuscript.scenes.length);
  });

  it('nav doc links every chapter with epub:type="toc"', () => {
    const nav = entryText(bytes, 'OEBPS/nav.xhtml');
    expect(nav).toContain('epub:type="toc"');
    for (let i = 0; i < manuscript.scenes.length; i += 1) {
      const id = `scene-${String(i + 1).padStart(2, '0')}`;
      expect(nav).toContain(`href="${id}.xhtml"`);
    }
  });

  it('chapter XHTML carries beat prose and dialogue as real escaped text', () => {
    const chapter = entryText(bytes, 'OEBPS/scene-01.xhtml');
    expect(chapter).toContain('epub:type="chapter"');
    expect(chapter).toContain('class="dialogue"');
    // Dialogue verbatim from the manuscript survives into the chapter.
    const firstDialogue = manuscript.scenes[0]!.beats.find((b) => b.dialogue?.length)?.dialogue?.[0];
    expect(firstDialogue).toBeDefined();
    expect(chapter).toContain(firstDialogue!.text);
  });

  it('validator passes on the built artifact (REQ-M15-03)', () => {
    const result = validateEpub(bytes);
    expect(result.ok).toBe(true);
    expect(result.findings.filter((f) => f.severity === 'error')).toHaveLength(0);
  });
});

describe('fixed-layout builder (REQ-M15-02)', () => {
  const bytes = buildEpubFixedLayout(comicDoc, COMIC_PROFILE, metadata);
  const entries = readZipEntries(bytes);

  it('declares pre-paginated rendition with svg page properties and viewport', () => {
    const opf = entryText(bytes, 'OEBPS/content.opf');
    expect(opf).toContain('rendition:layout">pre-paginated<');
    expect(opf).toContain('properties="svg"');
    const page1 = entryText(bytes, 'OEBPS/page-01.xhtml');
    expect(page1).toContain(`width=${COMIC_PROFILE.page.width}, height=${COMIC_PROFILE.page.height}`);
  });

  it('embeds one layered SVG page per IR page — dialogue present, no raster', () => {
    const pages = entries.filter((e) => /^OEBPS\/page-\d+\.xhtml$/.test(e.name));
    expect(pages.length).toBe(comicDoc.pages.length);
    const page1 = entryText(bytes, 'OEBPS/page-01.xhtml');
    expect(page1).toContain('comic-lettering-layer');
    expect(page1).toContain('Abuela… ¿estás ahí?');
    expect(page1).not.toContain('<img');
    expect(page1).not.toContain('<image');
  });

  it('validator passes on the built artifact', () => {
    const result = validateEpub(bytes);
    expect(result.ok).toBe(true);
    expect(result.findings.filter((f) => f.severity === 'error')).toHaveLength(0);
  });
});

describe('validation adapter detects corruption deterministically (REQ-M15-03)', () => {
  const enc = new TextEncoder();

  it('flags a mimetype entry that is not first', () => {
    const chapters = manuscript.scenes.map((_, i) => chapterXhtml(manuscript, i));
    const opf = buildOpf({
      variant: 'reflowable',
      metadata,
      manifest: [
        { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: 'nav' },
        ...chapters.map((c) => ({ id: c.id, href: `${c.id}.xhtml`, mediaType: 'application/xhtml+xml' })),
      ],
      spine: chapters.map((c) => ({ idref: c.id })),
    });
    // container first, mimetype second — readers must reject this ordering.
    const broken = buildZip([
      { name: 'META-INF/container.xml', data: enc.encode(containerXml('OEBPS/content.opf')) },
      { name: 'mimetype', data: enc.encode('application/epub+zip') },
      { name: 'OEBPS/content.opf', data: enc.encode(opf) },
      { name: 'OEBPS/nav.xhtml', data: enc.encode(navXhtml(manuscript, chapters)) },
      ...chapters.map((c) => ({ name: c.href, data: enc.encode(c.xhtml) })),
    ]);
    const result = validateEpub(broken);
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === 'OCF-002')).toBe(true);
  });

  it('flags a missing container.xml as an error', () => {
    const chapters = manuscript.scenes.map((_, i) => chapterXhtml(manuscript, i));
    const broken = buildZip([
      { name: 'mimetype', data: enc.encode('application/epub+zip') },
      { name: 'OEBPS/nav.xhtml', data: enc.encode(navXhtml(manuscript, chapters)) },
      ...chapters.map((c) => ({ name: c.href, data: enc.encode(c.xhtml) })),
    ]);
    const result = validateEpub(broken);
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === 'OCF-005')).toBe(true);
  });

  it('flags a spine idref that does not resolve in the manifest', () => {
    const chapters = manuscript.scenes.map((_, i) => chapterXhtml(manuscript, i));
    const opf = buildOpf({
      variant: 'reflowable',
      metadata,
      manifest: [{ id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: 'nav' }],
      spine: [{ idref: 'ghost-chapter' }],
    });
    const broken = buildZip([
      { name: 'mimetype', data: enc.encode('application/epub+zip') },
      { name: 'META-INF/container.xml', data: enc.encode(containerXml('OEBPS/content.opf')) },
      { name: 'OEBPS/content.opf', data: enc.encode(opf) },
      { name: 'OEBPS/nav.xhtml', data: enc.encode(navXhtml(manuscript, chapters)) },
      ...chapters.map((c) => ({ name: c.href, data: enc.encode(c.xhtml) })),
    ]);
    const result = validateEpub(broken);
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === 'SPN-002')).toBe(true);
  });

  it('rejects empty input', () => {
    const result = validateEpub(new Uint8Array(0));
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === 'OCF-001')).toBe(true);
  });
});
