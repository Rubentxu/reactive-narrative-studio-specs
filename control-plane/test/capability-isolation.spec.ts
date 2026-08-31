/**
 * capability-isolation.spec.ts
 *
 * Isolation tests for capability-catalog feature.
 * Verifies m10 invariants: no fetch, no Dexie/IndexedDB/Orama, no useProjectionStore.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

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
});
