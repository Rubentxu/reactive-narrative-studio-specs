import type { Diagnostic } from '../diagnostics/types';
import type { ProjectionBundle, ProjectSource, CatalogEntity } from './ProjectSource';
import { fromAjv, synthetic } from '../diagnostics/types';
import { schemaIdFor, get } from '../schema/registry';
import yaml from 'yaml';

const PARENT_SEGMENT = '..';

export function isAbsolutePath(p: string): boolean {
  return p.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(p);
}

export function isSafeRelativePath(p: string): boolean {
  if (isAbsolutePath(p)) return false;
  return !p.split(/[\\/]+/).some((seg) => seg === PARENT_SEGMENT);
}

export class SnapshotProjectSource implements ProjectSource {
  constructor(private readonly files: ReadonlyArray<File> | FileList) {}

  async discover(): Promise<Diagnostic<readonly string[]>> {
    try {
      const fileNames = Array.from(this.files).map((f) => f.name);
      return { ok: true, data: fileNames };
    } catch (err) {
      return { ok: false, errors: [synthetic('parse-error', '', String(err))] };
    }
  }

  async load(_projectId: string): Promise<Diagnostic<{ bundle: ProjectionBundle; catalogEntities: CatalogEntity[] }>> {
    const fileArray = Array.from(this.files);

    const m = await parseManifest(fileArray);
    if (!m.ok) {
      return { ok: false, errors: m.errors };
    }

    const projDiag = await validateAndLoadProjections(fileArray, m.data.projections);
    if (!projDiag.ok) {
      return { ok: false, errors: projDiag.errors };
    }

    const catDiag = await loadCatalogEntities(fileArray);
    if (!catDiag.ok) {
      return { ok: false, errors: catDiag.errors };
    }

    // Load decisions and docs using new helpers
    const decisionsDiag = await parseDecisions(fileArray, m.data);
    const docsDiag = await loadDocs(fileArray, m.data);

    // Collect errors from decisions and docs helpers only
    // (projDiag and catDiag already validated ok above)
    const allErrors: ReturnType<typeof synthetic>[] = [
      ...(decisionsDiag.ok ? [] : decisionsDiag.errors),
      ...(docsDiag.ok ? [] : docsDiag.errors),
    ];

    if (allErrors.length > 0) {
      return { ok: false, errors: allErrors };
    }

    const bundle = assembleBundle(
      projDiag.data,
      decisionsDiag.ok ? decisionsDiag.data.decisions : undefined,
      docsDiag.ok ? docsDiag.data.docs : undefined
    );

    return { ok: true, data: { bundle, catalogEntities: catDiag.data } };
  }
}

export function parseManifest(
  files: ReadonlyArray<File>
): Promise<Diagnostic<{ version?: string; projections: string[]; docs?: string[] }>> {
  return (async () => {
    const manifestFile = files.find((f) => f.name === 'manifest.json');
    if (!manifestFile) {
      return { ok: false, errors: [synthetic('missing-entry', '', 'manifest.json not found')] };
    }

    let manifest: { version?: string; projections?: string[]; docs?: string[]; snapshot?: { docs?: string[] } };
    try {
      const text = await manifestFile.text();
      manifest = JSON.parse(text);
    } catch {
      return { ok: false, errors: [synthetic('parse-error', '/manifest.json', 'Invalid JSON')] };
    }

    const projectionNames = manifest.projections ?? [];
    // docs may be at manifest.docs or manifest.snapshot.docs (两种fixture格式都兼容)
    const docs = manifest.docs ?? manifest.snapshot?.docs ?? [];
    const result: { version?: string; projections: string[]; docs: string[] } = {
      projections: projectionNames,
      docs,
    };
    if (manifest.version !== undefined) result.version = manifest.version;
    return { ok: true, data: result };
  })();
}

export function validateAndLoadProjections(
  files: ReadonlyArray<File>,
  projectionNames: string[]
): Promise<Diagnostic<Record<string, unknown>>> {
  return (async () => {
    const projections: Record<string, unknown> = {};
    const errors: ReturnType<typeof synthetic>[] = [];

    for (const name of projectionNames) {
      if (!isSafeRelativePath(name)) {
        errors.push(synthetic('path-traversal', `projections/${name}`, `Unsafe path: ${name}`));
        continue;
      }
    }

    for (const projName of projectionNames) {
      const projFile = files.find((f) => f.name === `projections/${projName}` || f.name === projName);
      if (!projFile) {
        errors.push(synthetic('missing-entry', `projections/${projName}`, `File not found: ${projName}`));
        continue;
      }

      try {
        const text = await projFile.text();
        const data = JSON.parse(text);
        const dispatch = schemaIdFor(data);
        if (!dispatch) {
          // Unknown projName surfaces synthetic unknown-schema (no regex fallback)
          errors.push(synthetic('unknown-schema', `projections/${projName}`, 'Cannot determine schema'));
          continue;
        }
        const validator = get(dispatch.id);
        const valid = validator(data);
        if (!valid) {
          errors.push(...fromAjv(validator.errors ?? []));
          continue;
        }
        projections[projName] = data;
      } catch (err) {
        errors.push(synthetic('parse-error', `projections/${projName}`, String(err)));
      }
    }

    if (errors.length > 0) return { ok: false, errors };
    return { ok: true, data: projections };
  })();
}

export function loadCatalogEntities(
  files: ReadonlyArray<File>
): Promise<Diagnostic<CatalogEntity[]>> {
  return (async () => {
    const catalogEntities: CatalogEntity[] = [];
    const errors: ReturnType<typeof synthetic>[] = [];

    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.json') && !file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
        continue;
      }
      try {
        const text = await file.text();
        let data: unknown;
        if (file.name.endsWith('.json')) {
          data = JSON.parse(text);
        } else {
          // YAML file - parse with yaml package
          data = yaml.parse(text);
        }
        if (!data || typeof data !== 'object') continue;

        const dispatch = schemaIdFor(data);
        if (!dispatch) continue;
        if (dispatch.id !== 'https://narrative.dev/schemas/catalog-entity-v1alpha1.json') continue;

        const validator = get(dispatch.id);
        const valid = validator(data);
        if (!valid) {
          errors.push(...fromAjv(validator.errors ?? []));
          continue;
        }
        catalogEntities.push(data as CatalogEntity);
      } catch {
        // skip malformed files
      }
    }

    if (errors.length > 0) return { ok: false, errors };
    return { ok: true, data: catalogEntities };
  })();
}

export function assembleBundle(
  projections: Record<string, unknown>,
  decisions?: unknown,
  docs?: DocEntry[]
): ProjectionBundle {
  // Seven known bundle keys - unknown projNames surface synthetic('unknown-schema')
  return {
    project: projections['cp-project.json'] ?? projections['project'],
    chapters: projections['cp-chapters.json'] ?? projections['chapters'],
    characters: projections['cp-characters.json'] ?? projections['characters'],
    assets: projections['cp-assets.json'] ?? projections['assets'],
    uat: projections['cp-uat.json'] ?? projections['uat'],
    visualQuality: projections['cp-visual-quality.json'] ?? projections['visualQuality'],
    history: projections['cp-history.json'] ?? projections['history'],
    decisions: decisions ?? projections['cp-decisions.json'] ?? projections['decisions'],
    docs: docs,
  };
}

/**
 * Parse and validate a decisions projection from the given manifest.
 * Uses the same path-traversal guard as other projection loaders.
 */
export function parseDecisions(
  files: ReadonlyArray<File>,
  manifest: { version?: string; projections: string[] }
): Promise<Diagnostic<{ decisions: unknown }>> {
  return (async () => {
    const decisionsProjection = manifest.projections.find(
      (p) => p === 'cp-decisions.json' || p === 'decisions'
    );
    if (!decisionsProjection) {
      // No decisions projection in manifest - return empty
      return { ok: true, data: { decisions: undefined } };
    }

    if (!isSafeRelativePath(decisionsProjection)) {
      return {
        ok: false,
        errors: [synthetic('path-traversal', `projections/${decisionsProjection}`, `Unsafe path: ${decisionsProjection}`)],
      };
    }

    const decisionsFile = files.find(
      (f) => f.name === `projections/${decisionsProjection}` || f.name === decisionsProjection
    );
    if (!decisionsFile) {
      return {
        ok: false,
        errors: [synthetic('missing-entry', `projections/${decisionsProjection}`, `File not found: ${decisionsProjection}`)],
      };
    }

    try {
      const text = await decisionsFile.text();
      const data = JSON.parse(text);
      return { ok: true, data: { decisions: data } };
    } catch (err) {
      return { ok: false, errors: [synthetic('parse-error', `projections/${decisionsProjection}`, String(err))] };
    }
  })();
}

/**
 * A loaded document with its relative path and markdown body.
 * Shape matches REQ-LOA-2: { path: string, body: string }[].
 */
export interface DocEntry {
  readonly path: string;
  readonly body: string;
}

/**
 * Load docs entries from the docs/ directory referenced in manifest.
 * Returns { path, body }[] with the markdown body content loaded.
 * Uses the existing isSafeRelativePath guard (REQ-LOA-2).
 */
export function loadDocs(
  files: ReadonlyArray<File>,
  manifest: { version?: string; projections: string[]; docs?: string[] }
): Promise<Diagnostic<{ docs: DocEntry[] }>> {
  return (async () => {
    const docsPaths = manifest.docs ?? [];
    const validDocs: DocEntry[] = [];

    for (const docPath of docsPaths) {
      if (!isSafeRelativePath(docPath)) {
        return {
          ok: false,
          errors: [synthetic('path-traversal', `docs/${docPath}`, `Unsafe path: ${docPath}`)],
        };
      }

      const docFile = files.find((f) => f.name === `docs/${docPath}` || f.name === docPath);
      if (!docFile) {
        return {
          ok: false,
          errors: [synthetic('missing-entry', `docs/${docPath}`, `File not found: ${docPath}`)],
        };
      }

      try {
        const body = await docFile.text();
        validDocs.push({ path: docPath, body });
      } catch {
        return {
          ok: false,
          errors: [synthetic('parse-error', `docs/${docPath}`, 'Could not read doc body')],
        };
      }
    }

    return { ok: true, data: { docs: validDocs } };
  })();
}
