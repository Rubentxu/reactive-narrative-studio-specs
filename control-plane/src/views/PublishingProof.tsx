/**
 * PublishingProof — EPUB publishing view at /publish (M15, roadmap exit).
 *
 * Two export targets from the SAME sample chapter: a reflowable EPUB from the
 * ChapterManuscript (prose + dialogue as real text) and a fixed-layout EPUB
 * embedding the comic renderer's layered SVG pages (lettering stays editable
 * SVG text). The validation adapter runs client-side on the built artifacts
 * and its findings are rendered — the proof is inspectable, not asserted.
 */

import React, { useMemo, useState } from 'react';
import { SAMPLE_CHAPTER } from '../features/sequential-art/fixtures/sample-chapter';
import { adaptChapterToSequentialIr } from '../features/sequential-art/adapter';
import { COMIC_PROFILE } from '../features/comic-renderer/types';
import { buildEpubReflowable, buildEpubFixedLayout, validateEpub } from '../features/epub';
import type { EpubMetadata, ValidationResult } from '../features/epub/types';

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

const EPUB_MIME = 'application/epub+zip';

function ValidationPanel({ result, testId }: { result: ValidationResult; testId: string }): React.ReactElement {
  const errors = result.findings.filter((f) => f.severity === 'error');
  const warnings = result.findings.filter((f) => f.severity === 'warning');
  return (
    <div className="epub-validation" data-testid={testId} data-ok={String(result.ok)}>
      <p>
        validation: <strong>{result.ok ? 'OK' : 'FAILED'}</strong> · {errors.length} errors · {warnings.length} warnings
      </p>
      {result.findings.length > 0 && (
        <ul>
          {result.findings.map((f, i) => (
            <li key={i}>
              [{f.severity}] {f.code}: {f.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PublishingProof(): React.ReactElement {
  const manuscript = SAMPLE_CHAPTER;
  const comicDoc = useMemo(() => adaptChapterToSequentialIr(manuscript), [manuscript]);
  const [lastDownload, setLastDownload] = useState<string | null>(null);

  const metadata: EpubMetadata = useMemo(
    () => ({
      title: manuscript.title,
      language: 'es',
      identifier: `urn:uuid:reactive-narrative-studio-${manuscript.chapterId}`,
      author: 'Reactive Narrative Studio',
    }),
    [manuscript],
  );

  const reflowable = useMemo(() => buildEpubReflowable(manuscript, metadata), [manuscript, metadata]);
  const fxl = useMemo(() => buildEpubFixedLayout(comicDoc, COMIC_PROFILE, metadata), [comicDoc, metadata]);

  const reflowableValidation = useMemo(() => validateEpub(reflowable), [reflowable]);
  const fxlValidation = useMemo(() => validateEpub(fxl), [fxl]);

  const downloadReflowable = (): void => {
    downloadBlob(reflowable as unknown as BlobPart, 'book-reflowable.epub', EPUB_MIME);
    setLastDownload('book-reflowable.epub');
  };
  const downloadFxl = (): void => {
    downloadBlob(fxl as unknown as BlobPart, 'book-fxl.epub', EPUB_MIME);
    setLastDownload('book-fxl.epub');
  };

  return (
    <div className="view-publish">
      <h1>Publishing Proof</h1>
      <p className="publish-meta">
        Sample chapter (M12 beats) · two EPUB 3 targets over the same source: <strong>reflowable</strong> (prose from
        manuscript scenes/beats) and <strong>fixed-layout</strong> (layered comic SVG pages, lettering never baked).
        Both artifacts pass the validation adapter (reader-entry contract) before download.
      </p>

      <div className="publish-controls">
        <button type="button" data-testid="download-reflowable" onClick={downloadReflowable} disabled={!reflowableValidation.ok}>
          Download reflowable EPUB
        </button>
        <button type="button" data-testid="download-fxl" onClick={downloadFxl} disabled={!fxlValidation.ok}>
          Download fixed-layout EPUB
        </button>
      </div>

      <section className="publish-artifact">
        <h2>book-reflowable.epub</h2>
        <ValidationPanel result={reflowableValidation} testId="validation-reflowable" />
      </section>

      <section className="publish-artifact">
        <h2>book-fxl.epub</h2>
        <ValidationPanel result={fxlValidation} testId="validation-fxl" />
      </section>

      {lastDownload && (
        <p className="publish-downloaded" data-download={lastDownload}>
          Proof ready: <code>{lastDownload}</code>
        </p>
      )}
    </div>
  );
}
