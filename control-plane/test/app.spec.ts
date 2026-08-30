import { describe, it, expect } from 'vitest';
import { router } from '../src/routes/router';
import { useProjectionStore } from '../src/store/projectionStore';
import { catalogSelectors } from '../src/store/catalogSelectors';

describe('App', () => {
  it('router is defined and has a routeTree', () => {
    expect(router).toBeDefined();
    expect(typeof router.navigate).toBe('function');
    expect(typeof router.buildLocation).toBe('function');
  });

  it('projectionStore has catalogEntities field', () => {
    const store = useProjectionStore.getState();
    expect('catalogEntities' in store).toBe(true);
    expect(Array.isArray(store.catalogEntities)).toBe(true);
  });

  it('projectionStore has bundle field', () => {
    const store = useProjectionStore.getState();
    expect('bundle' in store).toBe(true);
  });

  it('catalogSelectors count returns 0 when store is empty', () => {
    const count = catalogSelectors.count('Character');
    expect(count).toBe(0);
  });
});
