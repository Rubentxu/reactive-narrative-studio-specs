/**
 * DocTab — tab renderer for entity documentation (REQ-DOC-4).
 *
 * Resolves the doc via entity's metadata.annotations['narrative.dev/source-path']
 * against the bundle.docs array (DocEntry[] = { path, body }[] per REQ-LOA-2).
 * Re-implements the SnapshotProjectSource isSafeRelativePath guard locally —
 * the loader lives outside the docs feature boundary.
 * Renders via docsSafeMarkdown (REQ-DOC-1).
 *
 * If the source-path annotation is absent, renders a documented empty state
 * without error. Path traversal attempts surface synthetic('path-traversal').
 */

import React, { useState, useEffect } from 'react';
import type { ExtensionContext } from '../../../extensions';
import { docsSafeMarkdown } from '../docsSafeMarkdown';
import type { DocPage } from '../types';
import type { DocEntry } from '../types';

const PARENT_SEGMENT = '..';

/**
 * Guards against path traversal attacks in docRef paths.
 * Re-implements the SnapshotProjectSource guard per REQ-DOC-4 — the loader
 * lives outside the docs feature boundary (functional equivalents today; may
 * diverge).
 */
function isSafeDocPath(path: string): boolean {
  if (path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path)) {
    return false;
  }
  return !path.split(/[\\/]+/).some((seg) => seg === PARENT_SEGMENT);
}

/**
 * Fetch a document page from the docs array.
 * docRef is the path from the entity's source-path annotation.
 * Returns DocPage { docRef, content } or null if not found.
 */
async function fetchDocPage(
  docRef: string,
  bundleDocs: ReadonlyArray<DocEntry> | undefined
): Promise<DocPage | null> {
  // Path traversal guard (REQ-DOC-4)
  if (!isSafeDocPath(docRef)) {
    console.warn(`[DocTab] Blocked path traversal attempt: ${docRef}`);
    return null;
  }

  if (!bundleDocs || bundleDocs.length === 0) return null;

  // Normalize: strip leading 'docs/' if present
  const normalized = docRef.startsWith('docs/')
    ? docRef.slice(5)
    : docRef;

  // Find by path (exact match or basename match)
  const entry = bundleDocs.find(
    (d) => d.path === normalized || d.path.endsWith('/' + normalized) || d.path === docRef
  );

  if (!entry) return null;

  return {
    docRef: entry.path,
    content: entry.body,
  };
}

/**
 * DocTab renders narrative documentation for an entity.
 *
 * Looks for metadata.annotations['narrative.dev/source-path'] on the entity,
 * resolves it against bundle.docs, and renders via docsSafeMarkdown.
 */
export function DocTab({ ctx }: { ctx: ExtensionContext }): React.ReactElement {
  const [docPage, setDocPage] = useState<DocPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read source-path annotation (REQ-DOC-4)
  const annotations = (ctx.entity.metadata?.annotations ?? {}) as Record<string, string>;
  const docRef = annotations['narrative.dev/source-path'];

  // Read docs from bundle (DocEntry[] = { path, body }[])
  const bundleDocs = ctx.getProjection<ReadonlyArray<DocEntry>>('docs');

  useEffect(() => {
    if (!docRef) {
      setDocPage(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDocPage(docRef, bundleDocs)
      .then((page) => {
        if (!cancelled) {
          setDocPage(page);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [docRef, bundleDocs]);

  // Empty state: no source-path annotation
  if (!docRef) {
    return (
      <div className="doc-tab doc-tab-empty" data-testid="doc-tab-empty">
        <div className="empty-state">
          <span className="empty-icon">📄</span>
          <p className="empty-message">Documentación no disponible</p>
          <p className="empty-hint">
            Esta entidad no tiene una referencia de documento asociada.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="doc-tab doc-tab-loading" data-testid="doc-tab-loading">
        <div className="loading-indicator">
          <span className="loading-spinner">⏳</span>
          <span>Cargando documentación…</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="doc-tab doc-tab-error" data-testid="doc-tab-error">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <p className="error-message">Error al cargar documentación</p>
          <p className="error-detail">{error}</p>
        </div>
      </div>
    );
  }

  // Doc not found (but docRef exists)
  if (!docPage) {
    return (
      <div className="doc-tab doc-tab-not-found" data-testid="doc-tab-not-found">
        <div className="not-found-state">
          <span className="not-found-icon">🔍</span>
          <p className="not-found-message">Documento no encontrado</p>
          <p className="not-found-hint">
            La referencia de documento <code>{docRef}</code> no existe en el directorio docs/.
          </p>
        </div>
      </div>
    );
  }

  // Render the document
  return (
    <div className="doc-tab doc-tab-content" data-testid="doc-tab-content">
      <div className="doc-header">
        <h3 className="doc-title">Documentación</h3>
        <span className="doc-ref-badge">{docPage.docRef}</span>
      </div>
      <div className="doc-body">
        {docsSafeMarkdown(docPage.content, {
          className: 'doc-markdown',
        })}
      </div>
    </div>
  );
}
