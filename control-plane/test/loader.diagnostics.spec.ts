// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { validate, schemaIdFor } from '../src/schema/registry';
import { loadFixtureText } from './support/fixtures';
import { isSafeRelativePath, isAbsolutePath } from '../src/loader/SnapshotProjectSource';

describe('diagnostics', () => {
  describe('project-invalid-schema fixture', () => {
    it('validate returns ok: false with errors', () => {
      const doc = JSON.parse(loadFixtureText('project-invalid-schema/cp-project.missing-schema.json'));
      // REQ-DEI-3: no `schema` const / `apiVersion` → undispatchable, not an
      // arbitrary schema's errors from insertion-order fallback.
      expect(schemaIdFor(doc)).toBeNull();
      const result = validate(doc);
      expect(result.valid).toBe(false);
    });

    it('does not throw', () => {
      const doc = JSON.parse(loadFixtureText('project-invalid-schema/cp-project.missing-schema.json'));
      expect(() => validate(doc)).not.toThrow();
    });

    it('returns errors with instancePath, keyword, message', () => {
      const doc = JSON.parse(loadFixtureText('project-invalid-schema/cp-project.missing-schema.json'));
      const result = validate(doc);
      expect(result.valid).toBe(false);
      if (result.valid) return;
      expect(result.errors.length).toBeGreaterThan(0);
      const err = result.errors[0] as any;
      expect(err.instancePath).toBeDefined();
      expect(err.keyword).toBe('schema-undispatchable');
      expect(err.message).toBeDefined();
    });
  });

  describe('path-traversal guard', () => {
    it('isAbsolutePath returns true for /tmp/escape.json', () => {
      expect(isAbsolutePath('/tmp/escape.json')).toBe(true);
    });

    it('isAbsolutePath returns false for relative paths', () => {
      expect(isAbsolutePath('cp-project.json')).toBe(false);
      expect(isAbsolutePath('projections/cp-project.json')).toBe(false);
    });

    it('isSafeRelativePath returns false for absolute paths', () => {
      expect(isSafeRelativePath('/tmp/escape.json')).toBe(false);
    });

    it('isSafeRelativePath returns false for ../ paths', () => {
      expect(isSafeRelativePath('../../../etc/passwd')).toBe(false);
      expect(isSafeRelativePath('foo/../../../etc/passwd')).toBe(false);
    });

    it('isSafeRelativePath returns true for safe relative paths', () => {
      expect(isSafeRelativePath('cp-project.json')).toBe(true);
      expect(isSafeRelativePath('projections/cp-project.json')).toBe(true);
    });
  });
});
