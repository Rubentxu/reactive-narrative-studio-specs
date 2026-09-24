/**
 * ComicProof — comic proof viewer at /comic (M13, roadmap exit criterion).
 *
 * Renders the layered SVG page model with independent art/lettering toggles
 * (proving the separation) and exports the CBZ proof + per-page SVG locally.
 * No images are generated: art is placeholder slots; lettering is editable
 * <text> and is never baked into any raster.
 */

import React, { useMemo, useState } from 'react';
import { adaptChapterToSequentialIr } from '../features/sequential-art/adapter';
import { SAMPLE_CHAPTER } from '../features/sequential-art/fixtures/sample-chapter';
import { COMIC_PROFILE } from '../features/comic-renderer/types';
import { renderPageSvg } from '../features/comic-renderer/svg';
import { buildCbz } from '../features/comic-renderer/cbz';

function downloadBlob(bytes: BlobPart, filename: string, type: string): void {
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ComicProof(): React.ReactElement {
  const doc = useMemo(() => adaptChapterToSequentialIr(SAMPLE_CHAPTER), []);
  const [pageIndex, setPageIndex] = useState(0);
  const [showArt, setShowArt] = useState(true);
  const [showLettering, setShowLettering] = useState(true);
  const [lastDownload, setLastDownload] = useState<string | null>(null);

  const baseSvg = useMemo(() => renderPageSvg(doc, pageIndex, COMIC_PROFILE), [doc, pageIndex]);
  const svg = useMemo(() => {
    let out = baseSvg;
    if (!showArt) out = out.replace('<g class="comic-art-layer">', '<g class="comic-art-layer" style="display:none">');
    if (!showLettering) out = out.replace('<g class="comic-lettering-layer">', '<g class="comic-lettering-layer" style="display:none">');
    return out;
  }, [baseSvg, showArt, showLettering]);

  const downloadSvg = (): void => {
    downloadBlob(svg, `comic-page-${String(pageIndex + 1).padStart(2, '0')}.svg`, 'image/svg+xml');
    setLastDownload(`comic-page-${String(pageIndex + 1).padStart(2, '0')}.svg`);
  };

  const downloadCbz = (): void => {
    const bytes = buildCbz(doc, COMIC_PROFILE, {
      series: SAMPLE_CHAPTER.title,
      title: `${SAMPLE_CHAPTER.title} — comic proof`,
      languageISO: 'es',
    });
    downloadBlob(bytes as unknown as BlobPart, `comic-proof-${SAMPLE_CHAPTER.chapterId}.cbz`, 'application/vnd.comicbook+zip');
    setLastDownload(`comic-proof-${SAMPLE_CHAPTER.chapterId}.cbz`);
  };

  return (
    <div className="view-comic">
      <h1>Comic Proof</h1>
      <p className="comic-meta">
        Sample chapter (M12 beats) · profile <strong>{COMIC_PROFILE.label}</strong> · page{' '}
        <strong data-testid="comic-page-number">{pageIndex + 1}</strong> of {doc.pages.length} · art layer holds
        placeholder slots (image generation comes later); lettering is editable text.
      </p>

      <div className="comic-controls">
        <button type="button" onClick={() => setPageIndex((i) => Math.max(0, i - 1))} disabled={pageIndex === 0}>
          ‹ Prev
        </button>
        <button type="button" onClick={() => setPageIndex((i) => Math.min(doc.pages.length - 1, i + 1))} disabled={pageIndex === doc.pages.length - 1}>
          Next ›
        </button>
        <label className="comic-toggle">
          <input type="checkbox" checked={showArt} onChange={(e) => setShowArt(e.target.checked)} /> Art layer
        </label>
        <label className="comic-toggle">
          <input type="checkbox" checked={showLettering} onChange={(e) => setShowLettering(e.target.checked)} /> Lettering layer
        </label>
        <button type="button" onClick={downloadSvg}>Download page SVG</button>
        <button type="button" className="comic-download-cbz" onClick={downloadCbz}>Download CBZ proof</button>
      </div>

      <div className="comic-page-view" data-testid="comic-page-view" dangerouslySetInnerHTML={{ __html: svg }} />

      {lastDownload && (
        <p className="comic-downloaded" data-download={lastDownload}>
          Proof ready: <code>{lastDownload}</code>
        </p>
      )}
    </div>
  );
}
