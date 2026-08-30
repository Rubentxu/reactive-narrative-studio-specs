import type { Diagnostic } from '../diagnostics/types';
import type { ProjectionBundle, ProjectSource } from './ProjectSource';
import { fromAjv, synthetic } from '../diagnostics/types';
import { schemaIdFor, get } from '../schema/registry';

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

  async load(_projectId: string): Promise<Diagnostic<ProjectionBundle>> {
    const fileArray = Array.from(this.files);

    const manifestFile = fileArray.find((f) => f.name === 'manifest.json');
    if (!manifestFile) {
      return { ok: false, errors: [synthetic('missing-entry', '', 'manifest.json not found')] };
    }

    let manifest: { version?: string; projections?: string[] };
    try {
      const text = await manifestFile.text();
      manifest = JSON.parse(text);
    } catch {
      return { ok: false, errors: [synthetic('parse-error', '/manifest.json', 'Invalid JSON')] };
    }

    const projectionNames = manifest.projections ?? [];

    for (const name of projectionNames) {
      if (!isSafeRelativePath(name)) {
        return {
          ok: false,
          errors: [synthetic('path-traversal', `projections/${name}`, `Unsafe path: ${name}`)],
        };
      }
    }

    const projections: Record<string, unknown> = {};
    const errors: ReturnType<typeof synthetic>[] = [];

    for (const projName of projectionNames) {
      const projFile = fileArray.find((f) => f.name === `projections/${projName}` || f.name === projName);
      if (!projFile) {
        errors.push(synthetic('missing-entry', `projections/${projName}`, `File not found: ${projName}`));
        continue;
      }

      try {
        const text = await projFile.text();
        const data = JSON.parse(text);
        const dispatch = schemaIdFor(data);
        if (!dispatch) {
          errors.push(synthetic('unknown-schema', `projections/${projName}`, 'Cannot determine schema'));
          continue;
        }
        const validator = get(dispatch.id);
        const valid = validator(data);
        if (!valid) {
          errors.push(...fromAjv(validator.errors ?? []));
          continue;
        }
        // Explicit key assembly per EVT-PLP-01 structural intent — seven known bundle keys
        const KNOWN_KEYS: Record<string, string> = {
          'cp-project.json': 'project',
          'cp-chapters.json': 'chapters',
          'cp-characters.json': 'characters',
          'cp-assets.json': 'assets',
          'cp-uat.json': 'uat',
          'cp-visual-quality.json': 'visualQuality',
          'cp-history.json': 'history',
        };
        const key = KNOWN_KEYS[projName] ?? projName.replace(/\.json$/, '').replace(/^cp-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        projections[key] = data;
      } catch (err) {
        errors.push(synthetic('parse-error', `projections/${projName}`, String(err)));
      }
    }

    if (errors.length > 0) return { ok: false, errors };

    const bundle: ProjectionBundle = {
      project: projections['project'],
      chapters: projections['chapters'],
      characters: projections['characters'],
      assets: projections['assets'],
      uat: projections['uat'],
      visualQuality: projections['visualQuality'],
      history: projections['history'],
    };

    return { ok: true, data: bundle };
  }
}
