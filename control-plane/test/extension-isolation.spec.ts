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
    // Extended to include docs, capability-catalog, recipes and human-reader (M11/INC-008)
    const grepResult = execSync(
      `grep -rE 'from.*features/story/|from.*features/visual/|from.*features/catalog/|from.*features/continuity/|from.*features/docs/|from.*features/capability-catalog/|from.*features/recipes/|from.*features/human-reader/' ${featuresDir}/ 2>/dev/null || true`,
      { encoding: 'utf8' }
    );
    const matches = grepResult.trim().split('\n').filter((line) => line.length > 0);
    expect(matches, `Cross-folder imports found:\n${matches.join('\n')}`).toHaveLength(0);
  });

  // INC-008: relative-escape oracle — catches imports that use ../.. to reach
  // SIBLING feature folders. The previous name-alternation grep was ambiguous
  // (`recipes` exists both as a shared module src/recipes and as a feature
  // folder features/recipes) and could not catch deeper escapes; this oracle
  // resolves every relative import inside src/features and flags the ones that
  // land in a DIFFERENT feature folder. New feature folders are covered
  // automatically — no alternation list to maintain (M11/INC-008 closure).
  it('no relative-escape imports bypass feature isolation (INC-008)', () => {
    const { readdirSync, readFileSync } = require('node:fs') as typeof import('node:fs');
    const { dirname, resolve, relative, sep } = require('node:path') as typeof import('node:path');

    const featuresRoot = resolve('src/features');

    const walk = (dir: string, acc: string[] = []): string[] => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) walk(full, acc);
        else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(full);
      }
      return acc;
    };

    const importSpecRe = /from\s+['"]((?:\.\.\/)+[^'"]+)['"]/g;

    // Declared, audited cross-feature dependencies. Each entry must be USED by
    // the source file (stale allowlist entries fail the test). New escapes are
    // violations unless declared here with a reason and a tracking INC.
    const DECLARED_CROSS_FEATURE: Array<{ from: string; to: string; reason: string }> = [
      {
        from: 'capability-catalog/m16EntityBridge.tsx',
        to: 'catalog',
        reason:
          'REQ-CR-CAP-5: capability detail composes m16 EntityHeader/MetadataCard/RelationsList; ' +
          'registry-mediated composition refactor tracked as INC-M11-001 (vault incidences/)',
      },
      {
        from: 'epub/epub.ts',
        to: 'comic-renderer',
        reason:
          'REQ-M15-02: the fixed-layout EPUB embeds the comic renderer layered SVG pages ' +
          '(doc 14: publishing adapters compose presentation output; art/lettering stay layered)',
      },
    ];

    const violations: string[] = [];
    const usedExceptions = new Set<string>();
    for (const file of walk(featuresRoot)) {
      const relFile = relative(featuresRoot, file).split(sep).join('/');
      const currentFeature = relFile.split('/')[0];
      const text = readFileSync(file, 'utf8');
      // Type-only imports are CONTRACT dependencies (e.g. comic-renderer
      // consuming the sequential-art IR types) — no runtime coupling, exempt.
      const runtimeText = text.replace(/^import\s+type\s[^;]+;\s*$/gm, '');
      for (const match of runtimeText.matchAll(importSpecRe)) {
        const spec = match[1];
        if (!spec) continue;
        const resolved = resolve(dirname(file), spec);
        const rel = relative(resolve('src'), resolved).split(sep).join('/');
        const parts = rel.split('/');
        if (parts[0] === 'features' && parts[1] && parts[1] !== currentFeature) {
          const declared = DECLARED_CROSS_FEATURE.find((ex) => ex.from === relFile && ex.to === parts[1]);
          if (declared) usedExceptions.add(`${declared.from}→${declared.to}`);
          else violations.push(`${relFile}: ${spec} → src/${rel}`);
        }
      }
    }
    for (const exception of DECLARED_CROSS_FEATURE) {
      expect(
        usedExceptions.has(`${exception.from}→${exception.to}`),
        `Stale declared exception (import no longer exists): ${exception.from}→${exception.to}`,
      ).toBe(true);
    }
    expect(
      violations,
      `Relative-escape imports into sibling feature folders found (INC-008):\n${violations.join('\n')}`,
    ).toHaveLength(0);
  });
});
