import { describe, it, expect } from 'vitest';
import { routePaths } from '../src/routes/routes';

describe('F-004 oracle — routePaths coverage', () => {
  it('routePaths has exactly 16 entries (m10.2 adds 8 capability catalog routes)', () => {
    expect(routePaths.length).toBe(16);
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

  // M10.2 capability catalog routes
  it('includes /capabilities overview route', () => {
    expect(routePaths.some((p) => p === "path: '/capabilities'")).toBe(true);
  });

  it('includes /capabilities/skills route', () => {
    expect(routePaths.some((p) => p === "path: '/capabilities/skills'")).toBe(true);
  });

  it('includes /capabilities/packs route', () => {
    expect(routePaths.some((p) => p === "path: '/capabilities/packs'")).toBe(true);
  });

  it('includes /capabilities/profiles route', () => {
    expect(routePaths.some((p) => p === "path: '/capabilities/profiles'")).toBe(true);
  });

  it('includes /capabilities/workflows route', () => {
    expect(routePaths.some((p) => p === "path: '/capabilities/workflows'")).toBe(true);
  });

  it('includes /capabilities/providers route', () => {
    expect(routePaths.some((p) => p === "path: '/capabilities/providers'")).toBe(true);
  });

  it('includes /capabilities/recipes route', () => {
    expect(routePaths.some((p) => p === "path: '/capabilities/recipes'")).toBe(true);
  });

  it('includes /capabilities/$kind/$namespace/$name detail route', () => {
    expect(routePaths.some((p) => p === "path: '/capabilities/$kind/$namespace/$name'")).toBe(true);
  });
});
