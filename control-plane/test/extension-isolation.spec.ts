import { describe, it, expect } from 'vitest';
import { extensionRegistry, kindIs } from '../src/extensions';
import { execSync } from 'child_process';

describe('extension-isolation', () => {
  it('extensions targeting Character do not leak to Build entities', () => {
    const characterEntity = {
      apiVersion: 'narrative.dev/v1alpha1',
      kind: 'Character',
      metadata: { name: 'nora', namespace: 'demo', relations: [] },
    } as const;

    const buildEntity = {
      apiVersion: 'narrative.dev/v1alpha1',
      kind: 'Build',
      metadata: { name: 'build-001', namespace: 'demo', relations: [] },
    } as const;

    const charTabs = extensionRegistry.resolveEntityTabs(characterEntity);
    const buildTabs = extensionRegistry.resolveEntityTabs(buildEntity);

    // The character entity tabs should not include tabs with targetKind='Build'
    const buildOnlyTabs = charTabs.filter((t) => t.targetKind === 'Build');
    expect(buildOnlyTabs).toHaveLength(0);

    // The build entity should also not have character-specific tabs
    const charOnlyTabs = buildTabs.filter((t) => t.targetKind === 'Character');
    expect(charOnlyTabs).toHaveLength(0);
  });

  it('extension render functions are called with a valid ExtensionContext shape', () => {
    const entity = {
      apiVersion: 'narrative.dev/v1alpha1',
      kind: 'Character',
      metadata: { name: 'nora', namespace: 'demo', relations: [] },
    } as const;

    const tabs = extensionRegistry.resolveEntityTabs(entity);
    for (const tab of tabs) {
      const div = tab.render({
        entity,
        entityRef: { kind: 'Character', namespace: 'demo', name: 'nora' },
        getProjection: () => undefined,
        now: () => new Date(),
      });
      expect(div).toBeDefined();
      expect(typeof div).toBe('object');
    }
  });

  it('predicate kindIs helper matches exact kind string', () => {
    const pred = kindIs('Character');
    expect(pred({ kind: 'Character', metadata: {} } as any)).toBe(true);
    expect(pred({ kind: 'Build', metadata: {} } as any)).toBe(false);
  });

  it('no cross-folder imports exist in feature source tree', () => {
    const featuresDir = 'src/features';
    // Match any import referencing another feature folder (cross-folder)
    const grepResult = execSync(
      `grep -rE 'from.*features/story/|from.*features/visual/|from.*features/catalog/|from.*features/continuity/' ${featuresDir}/ 2>/dev/null || true`,
      { encoding: 'utf8' }
    );
    const matches = grepResult.trim().split('\n').filter((line) => line.length > 0);
    expect(matches, `Cross-folder imports found:\n${matches.join('\n')}`).toHaveLength(0);
  });

  // INC-008: relative-escape oracle — catches imports that use ../.. to reach feature folders
  // This closes atomically with Block PF pre-flight; features/docs/ land in Block 3
  it('no relative-escape imports bypass feature isolation (INC-008)', () => {
    // Pattern: from\s+['"]\.\.\/\.\.\/(story|visual|catalog|continuity|docs)\/
    const pattern = String.raw`from\s+['"]` + String.raw`\.\.\/` + String.raw`\.\.\/` +
      '(story|visual|catalog|continuity|docs)' + '/';
    const grepResult = execSync(
      'grep -rE -- ' + JSON.stringify(pattern) + ' src/ 2>/dev/null || true',
      { encoding: 'utf8' }
    );
    const matches = grepResult.trim().split('\n').filter((line) => line.length > 0);
    expect(matches, `Relative-escape imports found (INC-008):\n${matches.join('\n')}`).toHaveLength(0);
  });
});
