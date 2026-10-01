/**
 * cbz — comic proof archive builder (M13).
 *
 * One SVG page per SequentialArtIR page (vector proof: lettering is editable
 * text, never baked) + ComicInfo.xml metadata. Store-mode ZIP, no fetch.
 */

import type { SequentialIrDoc } from '../sequential-art/types';
import { renderPageSvg } from './svg';
import type { PresentationProfile } from './types';
import { buildZip, type ZipEntry } from '../../lib/store-zip';

export interface ComicInfoInput {
  series: string;
  title: string;
  languageISO?: string;
}

export function buildComicInfo(doc: SequentialIrDoc, input: ComicInfoInput, generator: string = 'reactive-narrative-studio m13'): string {
  const esc = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">',
    `  <Series>${esc(input.series)}</Series>`,
    `  <Title>${esc(input.title)}</Title>`,
    `  <PageCount>${doc.pages.length}</PageCount>`,
    ...(input.languageISO ? [`  <LanguageISO>${esc(input.languageISO)}</LanguageISO>`] : []),
    `  <Notes>Layered comic proof: art placeholders + editable lettering (SVG). Generator: ${esc(generator)}.</Notes>`,
    '</ComicInfo>',
    '',
  ];
  return lines.join('\n');
}

export function buildCbzEntries(doc: SequentialIrDoc, profile: PresentationProfile, info: ComicInfoInput): ZipEntry[] {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = doc.pages.map((_page, index) => ({
    name: `page-${String(index + 1).padStart(2, '0')}.svg`,
    data: encoder.encode(renderPageSvg(doc, index, profile)),
  }));
  entries.push({ name: 'ComicInfo.xml', data: encoder.encode(buildComicInfo(doc, info)) });
  return entries;
}

export function buildCbz(doc: SequentialIrDoc, profile: PresentationProfile, info: ComicInfoInput): Uint8Array {
  return buildZip(buildCbzEntries(doc, profile, info));
}
