/**
 * container + OPF builders (M15).
 *
 * container.xml is fixed by the OCF spec: it points to the package document.
 * The OPF is EPUB 3.0 with DC metadata, dcterms:modified, a nav manifest
 * item, and — for the fixed-layout variant — rendition pre-paginated metadata
 * and svg page items.
 */

import type { EpubMetadata, EpubVariant } from './types';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function containerXml(opfPath: string): string {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
    '  <rootfiles>',
    `    <rootfile full-path="${opfPath}" media-type="application/oebps-package+xml"/>`,
    '  </rootfiles>',
    '</container>',
    '',
  ].join('\n');
}

export interface OpfManifestItem {
  id: string;
  href: string;
  mediaType: string;
  /** EPUB properties token list (e.g. "nav", "svg"). */
  properties?: string;
}

export interface OpfSpineItem {
  idref: string;
  linear?: boolean;
}

export function buildOpf(input: {
  variant: EpubVariant;
  metadata: EpubMetadata;
  manifest: OpfManifestItem[];
  spine: OpfSpineItem[];
}): string {
  const { variant, metadata, manifest, spine } = input;
  const modified = metadata.modifiedISO ?? '2026-01-01T00:00:00Z';

  const manifestLines = manifest.map((item) => {
    const props = item.properties ? ` properties="${item.properties}"` : '';
    return `    <item id="${esc(item.id)}" href="${esc(item.href)}" media-type="${esc(item.mediaType)}"${props}/>`;
  });
  const spineLines = spine.map((item) => {
    const linear = item.linear === false ? ' linear="no"' : '';
    return `    <itemref idref="${item.idref}"${linear}/>`;
  });

  const rendition =
    variant === 'fixed-layout'
      ? [
          '    <meta property="rendition:layout">pre-paginated</meta>',
          '    <meta property="rendition:orientation">landscape</meta>',
        ]
      : ['    <meta property="rendition:layout">reflowable</meta>'];

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="es">',
    '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '    <dc:identifier id="pub-id">' + esc(metadata.identifier) + '</dc:identifier>',
    `    <dc:title>${esc(metadata.title)}</dc:title>`,
    `    <dc:language>${esc(metadata.language)}</dc:language>`,
    ...(metadata.author ? [`    <dc:creator>${esc(metadata.author)}</dc:creator>`] : []),
    `    <meta property="dcterms:modified">${modified}</meta>`,
    ...rendition,
    '  </metadata>',
    '  <manifest>',
    ...manifestLines,
    '  </manifest>',
    '  <spine>',
    ...spineLines,
    '  </spine>',
    '</package>',
    '',
  ].join('\n');
}
