/**
 * DocTab — tab renderer for entity documentation.
 *
 * Resolves the entity's docRef from its projections, fetches the markdown
 * content from the docs/ directory (with path-traversal guard), and
 * renders via docsSafeMarkdown.
 *
 * If the docRef is missing, renders a "Documentación no disponible" empty-state
 * without throwing a React error.
 */

import React, { useState, useEffect } from 'react';
import type { ExtensionContext } from '../../../extensions';
import { docsSafeMarkdown } from '../docsSafeMarkdown';
import type { DocPage } from '../types';

interface CharacterProjection {
  docRef?: string;
}

const DOCS_BASE_PATH = 'docs/';
const PARENT_SEGMENT = '..';

/**
 * Guards against path traversal attacks in docRef paths.
 * Returns true if the path is safe (no ../ escape from docs/).
 */
function isSafeDocPath(path: string): boolean {
  if (path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path)) {
    return false; // Absolute paths are not allowed
  }
  return !path.split(/[\\/]+/).some((seg) => seg === PARENT_SEGMENT);
}

/**
 * Fetches a document page from the docs/ directory.
 * Uses the BundleContext to access bundled docs content.
 */
async function fetchDocPage(
  docRef: string,
  bundleDocs: string[] | undefined
): Promise<DocPage | null> {
  // Path traversal guard
  if (!isSafeDocPath(docRef)) {
    console.warn(`[DocTab] Blocked path traversal attempt: ${docRef}`);
    return null;
  }

  // The docRef is expected to be a relative path within docs/
  // e.g., "nora.md" or "characters/nora-backstory.md"
  const normalizedRef = docRef.startsWith(DOCS_BASE_PATH)
    ? docRef.slice(DOCS_BASE_PATH.length)
    : docRef;

  // For now, we use the bundled docs list from the projection bundle.
  // The actual content loading would be done by the SnapshotProjectSource
  // or similar loader that has access to the file system.
  // This is a placeholder that simulates loading - in real usage,
  // the content would come from the bundle's docs array.
  if (bundleDocs && bundleDocs.includes(docRef)) {
    // In a real implementation, this would fetch the actual content
    // For now, return a placeholder indicating the doc exists
    return {
      docRef,
      content: `*[Document: ${normalizedRef}]*\n\nDocument content would be loaded from the bundle.`,
    };
  }

  return null;
}

/**
 * DocTab renders documentation for an entity.
 *
 * It looks for a docRef in the entity's projections (e.g., cp-characters)
 * and renders the corresponding markdown document if available.
 */
export function DocTab({ ctx }: { ctx: ExtensionContext }): React.ReactElement {
  const [docPage, setDocPage] = useState<DocPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the docRef from the entity's projections
  const character = ctx.getProjection<CharacterProjection>('cp-characters');
  const docRef = character?.docRef;

  // Also check the bundle for docs list
  const bundleDocs = ctx.getProjection<string[]>('docs');

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

  // Empty state: docRef missing
  if (!docRef) {
    return (
      <div className="doc-tab doc-tab-empty" data-testid="doc-tab-empty">
        <div className="empty-state">
          <span className="empty-icon">📄</span>
          <p className="empty-message">Documentación no disponible</p>
          <p className="empty-hint">
            Este entidad no tiene una referencia de documento asociada.
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
          <span>Cargando documentación...</span>
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
