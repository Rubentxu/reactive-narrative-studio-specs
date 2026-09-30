// @vitest-environment jsdom
/**
 * doc-source-path.spec.tsx (m16-doc-entity-links, REQ-DOC-4)
 *
 * Evidencia de test del REQ-DOC-4: resolución source-path de documentación
 * de entidad. Dos capas, cada una con su oráculo (design C3/C4):
 *
 * (i) Componente DocTab: lee metadata.annotations['narrative.dev/source-path'],
 *     resuelve contra la proyección 'docs' (DocEntry[] = { path, body }) vía
 *     fetchDocPage con guard local isSafeDocPath, y renderiza el body vía
 *     docsSafeMarkdown. La resolución es asíncrona (useEffect + Promise):
 *     aserciones con findByTestId, nunca síncronas sobre el primer render.
 *
 * (ii) Capa de carga loadDocs (SnapshotProjectSource): el guard existente
 *      isSafeRelativePath (m14) produce los Diagnostics sintéticos
 *      'path-traversal' y 'missing-entry'.
 *
 * Precisión de contrato (design C4): el campo discriminator del Diagnostic
 * es AjvError.keyword (no 'code'); 'path-traversal' es el keyword que la capa
 * lleva emitiendo desde m14.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ExtensionContext } from '../src/extensions';
import { DocTab } from '../src/features/docs/character/DocTab';
import { loadDocs, type DocEntry } from '../src/loader/SnapshotProjectSource';

// Explicit cleanup: vitest runs with globals:false in this package (same
// convention as decisions-view.spec.tsx and search.spec.tsx).
afterEach(() => {
  cleanup();
});

const DOC_BODY = '# Nora — personaje de prueba';

function makeCtx(overrides: {
  annotations?: Record<string, string>;
  docs?: ReadonlyArray<DocEntry> | undefined;
}): ExtensionContext {
  return {
    entity: {
      apiVersion: 'narrative.dev/v1alpha1',
      kind: 'Character',
      metadata: {
        name: 'nora',
        namespace: 'demo',
        annotations: overrides.annotations ?? {},
      },
    },
    entityRef: { kind: 'Character', namespace: 'demo', name: 'nora' },
    getProjection: <T,>(key: string): T | undefined =>
      (key === 'docs' ? (overrides.docs as unknown as T) : undefined),
    now: () => new Date('2026-01-01T00:00:00Z'),
  };
}

describe('DocTab source-path resolution — REQ-DOC-4 (component layer)', () => {
  it('REQ-DOC-4: annotation + matching docs projection resolves and renders the doc body', async () => {
    const ctx = makeCtx({
      annotations: { 'narrative.dev/source-path': 'docs/nora.md' },
      docs: [{ path: 'docs/nora.md', body: DOC_BODY }],
    });
    const { findByTestId, getByText, queryByTestId } = render(<DocTab ctx={ctx} />);
    const content = await findByTestId('doc-tab-content');
    expect(getByText(/Nora/)).toBeDefined();
    expect(queryByTestId('doc-tab-empty')).toBeNull();
    expect(content.querySelector('.doc-body')).not.toBeNull();
  });

  it('REQ-DOC-4: missing source-path annotation renders the documented empty state, without error', () => {
    const ctx = makeCtx({ docs: [{ path: 'docs/nora.md', body: DOC_BODY }] });
    const { getByTestId, queryByTestId } = render(<DocTab ctx={ctx} />);
    // Synchronous empty state: no annotation → no fetch at all.
    expect(getByTestId('doc-tab-empty')).toBeDefined();
    expect(queryByTestId('doc-tab-content')).toBeNull();
    expect(queryByTestId('doc-tab-error')).toBeNull();
  });

  it('REQ-DOC-4: traversal annotation (../../etc/passwd) is blocked by the local guard → doc-tab-not-found (not error)', async () => {
    // Precision of oracle (design C3): the component layer surfaces
    // doc-tab-not-found (local guard returns null silently); the
    // Diagnostic 'path-traversal' belongs to the loadDocs layer only —
    // each layer keeps its own oracle.
    const ctx = makeCtx({
      annotations: { 'narrative.dev/source-path': '../../etc/passwd' },
      docs: [{ path: 'docs/nora.md', body: DOC_BODY }],
    });
    const { findByTestId, queryByTestId } = render(<DocTab ctx={ctx} />);
    await findByTestId('doc-tab-not-found');
    expect(queryByTestId('doc-tab-content')).toBeNull();
    expect(queryByTestId('doc-tab-error')).toBeNull();
  });
});

describe('loadDocs source-path guard — REQ-DOC-4 (load layer)', () => {
  it('REQ-DOC-4 (AC-2): unsafe relative path in manifest.docs → Diagnostic path-traversal', async () => {
    const files: File[] = [new File(['# nora'], 'nora.md')];
    const result = await loadDocs(files, { version: '1', projections: [], docs: ['../../etc/passwd'] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Field precision (design C4): the Diagnostic discriminator field is
      // AjvError.keyword (not 'code'); 'path-traversal' is the keyword this
      // layer has emitted since m14.
      expect(result.errors.some((e) => e.keyword === 'path-traversal')).toBe(true);
      const traversal = result.errors.find((e) => e.keyword === 'path-traversal');
      expect(traversal?.message).toContain('../../etc/passwd');
    }
  });

  it('REQ-DOC-4: docs entry without a matching file → Diagnostic missing-entry', async () => {
    const files: File[] = [new File(['# nora'], 'nora.md')];
    const result = await loadDocs(files, { version: '1', projections: [], docs: ['inexistente.md'] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.keyword === 'missing-entry')).toBe(true);
    }
  });
});
