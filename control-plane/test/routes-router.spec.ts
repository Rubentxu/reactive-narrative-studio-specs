import { describe, it, expect } from 'vitest';
import { routePaths } from '../src/routes/routes';

describe('F-004 oracle — routePaths coverage', () => {
  it('routePaths has exactly 7 entries', () => {
    expect(routePaths.length).toBe(7);
  });

  it('includes the /search route entry', () => {
    const hasSearch = routePaths.some((p) => p === "path: '/search'");
    expect(hasSearch).toBe(true);
  });

  it('preserves all 6 existing entries from m15 baseline', () => {
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
