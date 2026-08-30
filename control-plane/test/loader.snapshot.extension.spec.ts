import { describe, it, expect } from 'vitest';
import { SnapshotProjectSource } from '../src/loader/SnapshotProjectSource';
import { newFileListFromDir, loadFixtureText } from './support/fixtures';

function newFileFromText(text: string, fileName: string): File {
  return new File([text], fileName);
}

describe('SnapshotProjectSource - catalog entities', () => {
  it('loads yaml catalog entities from snapshot-valid/catalog/', async () => {
    const jsonFiles = newFileListFromDir('snapshot-valid', '.json');
    const noraYaml = loadFixtureText('snapshot-valid/catalog/nora.yaml');
    const buildYaml = loadFixtureText('snapshot-valid/catalog/build.yaml');

    const yamlFiles = [
      newFileFromText(noraYaml, 'catalog/nora.yaml'),
      newFileFromText(buildYaml, 'catalog/build.yaml'),
    ];

    const allFiles = [...jsonFiles, ...yamlFiles];
    const source = new SnapshotProjectSource(allFiles);
    const result = await source.load('snapshot-valid');

    if (!result.ok) {
      console.error('load errors:', JSON.stringify(result.errors, null, 2));
    }
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { catalogEntities } = result.data;
    expect(Array.isArray(catalogEntities)).toBe(true);
    expect(catalogEntities.length).toBeGreaterThan(0);
  });

  it('catalogEntities contains Character kind from nora.yaml', async () => {
    const jsonFiles = newFileListFromDir('snapshot-valid', '.json');
    const noraYaml = loadFixtureText('snapshot-valid/catalog/nora.yaml');
    const buildYaml = loadFixtureText('snapshot-valid/catalog/build.yaml');

    const yamlFiles = [
      newFileFromText(noraYaml, 'catalog/nora.yaml'),
      newFileFromText(buildYaml, 'catalog/build.yaml'),
    ];

    const allFiles = [...jsonFiles, ...yamlFiles];
    const source = new SnapshotProjectSource(allFiles);
    const result = await source.load('snapshot-valid');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const nora = result.data.catalogEntities.find(
      (e: any) => e.metadata?.name === 'nora' && e.kind === 'Character'
    );
    expect(nora).toBeDefined();
    if (!nora) return;
    expect(nora.apiVersion).toBe('narrative.dev/v1alpha1');
  });

  it('catalogEntities contains Build kind from build.yaml', async () => {
    const jsonFiles = newFileListFromDir('snapshot-valid', '.json');
    const noraYaml = loadFixtureText('snapshot-valid/catalog/nora.yaml');
    const buildYaml = loadFixtureText('snapshot-valid/catalog/build.yaml');

    const yamlFiles = [
      newFileFromText(noraYaml, 'catalog/nora.yaml'),
      newFileFromText(buildYaml, 'catalog/build.yaml'),
    ];

    const allFiles = [...jsonFiles, ...yamlFiles];
    const source = new SnapshotProjectSource(allFiles);
    const result = await source.load('snapshot-valid');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const build = result.data.catalogEntities.find(
      (e: any) => e.metadata?.name === 'build-001' && e.kind === 'Build'
    );
    expect(build).toBeDefined();
    if (!build) return;
    expect(build.apiVersion).toBe('narrative.dev/v1alpha1');
  });

  it('catalogEntities are returned alongside bundle (not inside it)', async () => {
    const jsonFiles = newFileListFromDir('snapshot-valid', '.json');
    const noraYaml = loadFixtureText('snapshot-valid/catalog/nora.yaml');
    const buildYaml = loadFixtureText('snapshot-valid/catalog/build.yaml');

    const yamlFiles = [
      newFileFromText(noraYaml, 'catalog/nora.yaml'),
      newFileFromText(buildYaml, 'catalog/build.yaml'),
    ];

    const allFiles = [...jsonFiles, ...yamlFiles];
    const source = new SnapshotProjectSource(allFiles);
    const result = await source.load('snapshot-valid');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { bundle, catalogEntities } = result.data;
    expect(bundle).toBeDefined();
    expect(Array.isArray(catalogEntities)).toBe(true);
    expect(catalogEntities.length).toBeGreaterThan(0);
  });
});
