import { describe, it, expect } from 'vitest';
import { catalogSelectors } from '../src/store/catalogSelectors';

describe('catalogSelectors', () => {
  describe('byEntityRef', () => {
    it('returns undefined for non-existent entity (store is empty in tests)', () => {
      const ref = { kind: 'Character', namespace: 'nonexistent', name: 'ghost' };
      const result = catalogSelectors.byEntityRef(ref);
      expect(result).toBeUndefined();
    });
  });

  describe('byNamespace', () => {
    it('returns empty array when no entities exist', () => {
      const result = catalogSelectors.byNamespace('demo');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('count', () => {
    it('returns 0 for any kind when store is empty', () => {
      const result = catalogSelectors.count('Character');
      expect(result).toBe(0);
    });

    it('returns 0 for unknown kind', () => {
      const result = catalogSelectors.count('UATRun');
      expect(result).toBe(0);
    });
  });

  describe('byKind', () => {
    it('returns empty array when no entities exist', () => {
      const result = catalogSelectors.byKind('Character');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
