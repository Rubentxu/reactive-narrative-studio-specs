import { describe, it, expect } from 'vitest';
import { routePaths } from '../src/routes/routes';

describe('F-004 oracle — routePaths coverage', () => {
  it('routePaths has exactly 8 entries (m10 adds /create)', () => {
    expect(routePaths.length).toBe(8);
  });

  it('includes the /search route entry', () => {
    const hasSearch = routePaths.some((p) => p === "path: '/search'");
    expect(hasSearch).toBe(true);
  });

  it('includes the /create wizard route entry', () => {
    const hasCreate = routePaths.some((p) => p === "path: '/create'");
    expect(hasCreate).toBe(true);
  });

  it('preserves all 7 existing entries from m15 baseline', () => {
    const existingRoutes = [
      "path: '/'",
      "path: '/overview'",
      "path: '/story'",
      "path: '/visual'",
      "path: '/qa'",
      "path: '/history'",
    ] as const;
    for (const r of existingRoutes) {
      expect(routePaths.some((p) => p === r)).toBe(true);
    }
  });
});
