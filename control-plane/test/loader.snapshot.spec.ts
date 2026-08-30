import { describe, it, expect } from 'vitest';
import { SnapshotProjectSource } from '../src/loader/SnapshotProjectSource';
import { newFileListFromDir } from './support/fixtures';

describe('SnapshotProjectSource', () => {
  it('loads snapshot-valid and returns ok: true with exactly 7 keys', async () => {
    const files = newFileListFromDir('snapshot-valid', '.json');
    const source = new SnapshotProjectSource(files);
    const result = await source.load('snapshot-valid');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bundle = result.data.bundle;
    expect(bundle).toHaveProperty('project');
    expect(bundle).toHaveProperty('chapters');
    expect(bundle).toHaveProperty('characters');
    expect(bundle).toHaveProperty('assets');
    expect(bundle).toHaveProperty('uat');
    expect(bundle).toHaveProperty('visualQuality');
    expect(bundle).toHaveProperty('history');
  });

  it('each projection carries its schema: const', async () => {
    const files = newFileListFromDir('snapshot-valid', '.json');
    const source = new SnapshotProjectSource(files);
    const result = await source.load('snapshot-valid');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bundle = result.data.bundle as any;
    expect(bundle.project.schema).toBe('control-plane/project/v1');
  });
});
