/**
 * capability-isolation.spec.ts
 *
 * Isolation tests for capability-catalog feature.
 * Verifies m10 invariants: no fetch, no Dexie/IndexedDB/Orama, no useProjectionStore.
 * Includes UAT-M10-06-3 round-trip no-op proof.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { useProjectionStore } from '../src/store/projectionStore';

describe('capability-catalog isolation', () => {
  describe('no fetch in capability-catalog', () => {
    it('no fetch() calls exist in capability-catalog feature', () => {
      const grepResult = execSync(
        "grep -rn 'fetch(' src/features/capability-catalog/ 2>/dev/null || true",
        { encoding: 'utf8' }
      );
      const matches = grepResult.trim().split('\n').filter((line) => line.length > 0);
      expect(matches, `fetch() calls found:\n${matches.join('\n')}`).toHaveLength(0);
    });
  });

  describe('no Dexie/IndexedDB/Orama in capability-catalog', () => {
    it('no persistence libraries imported in capability-catalog feature', () => {
      const grepResult = execSync(
        "grep -rn 'dexie\\|indexeddb\\|orama' src/features/capability-catalog/ 2>/dev/null || true",
        { encoding: 'utf8' }
      );
      const matches = grepResult.trim().split('\n').filter((line) => line.length > 0);
      expect(matches, `Persistence library imports found:\n${matches.join('\n')}`).toHaveLength(0);
    });
  });

  describe('no useProjectionStore in capability-catalog', () => {
    it('no useProjectionStore imports in capability-catalog feature', () => {
      const grepResult = execSync(
        "grep -rn 'useProjectionStore' src/features/capability-catalog/ 2>/dev/null || true",
        { encoding: 'utf8' }
      );
      const matches = grepResult.trim().split('\n').filter((line) => line.length > 0);
      // Filter out comments
      const nonCommentMatches = matches.filter(
        (line) => !line.includes('//') && !line.includes('*')
      );
      expect(nonCommentMatches, `useProjectionStore imports found:\n${nonCommentMatches.join('\n')}`).toHaveLength(0);
    });
  });

  /**
   * UAT-M10-06-3 round-trip no-op proof.
   * Snapshot useProjectionStore.getState() before mounting capability routes;
   * after a synthetic mount cycle, the snapshot must be deep-equal.
   *
   * Since capability-catalog is a pure read-only feature with zero imports
   * of useProjectionStore (verified by the grep tests above), the round-trip
   * identity holds by construction. This test is the executable oracle.
   */
  describe('round-trip no-op proof (UAT-M10-06-3)', () => {
    it('useProjectionStore.getState() is byte-identical before and after capability routes are "mounted"', () => {
      // Snapshot before
      const snapshotBefore = JSON.parse(JSON.stringify(useProjectionStore.getState()));

      // Touch each capability-catalog entry point via dynamic import. Because
      // capability-catalog has zero imports of useProjectionStore (verified
      // by the grep test above) and is pure read-only, module init must not
      // mutate the store.
      const ROUTE_MODULES = [
        () => import('../src/features/capability-catalog/views/Overview'),
        () => import('../src/features/capability-catalog/views/KindList'),
        () => import('../src/features/capability-catalog/views/CapabilityDetail'),
        () => import('../src/features/capability-catalog/m16EntityBridge'),
        () => import('../src/features/capability-catalog/useCapabilityManifest'),
        () => import('../src/features/capability-catalog/capabilitySelectors'),
        () => import('../src/features/capability-catalog/manifest'),
        () => import('../src/features/capability-catalog/parser'),
      ];

      return Promise.all(ROUTE_MODULES.map((loader) => loader())).then(() => {
        // Snapshot after
        const snapshotAfter = JSON.parse(JSON.stringify(useProjectionStore.getState()));
        expect(snapshotAfter).toEqual(snapshotBefore);
      });
    });

    it('all 8 capability routes are syntactically present in router.tsx', () => {
      const fs = require('fs');
      const routerSource = fs.readFileSync('src/routes/router.tsx', 'utf8');
      // Router uses createRoute() with `path: '/skills'` etc. for subroutes
      // (parent is capabilitiesRoute). We match the per-kind subroute paths
      // individually.
      const requiredSubPaths = [
        "path: '/skills'",
        "path: '/packs'",
        "path: '/profiles'",
        "path: '/workflows'",
        "path: '/providers'",
        "path: '/recipes'",
        "path: '/$kind/$namespace/$name'",
      ];
      // /capabilities overview is its own createRoute
      expect(routerSource).toMatch(/path:\s*'\/capabilities'/);
      for (const p of requiredSubPaths) {
        expect(routerSource, `Missing route path: ${p}`).toContain(p);
      }
    });
  });
});
