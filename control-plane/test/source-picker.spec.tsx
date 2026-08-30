import { describe, it, expect } from 'vitest';

describe('SourcePicker', () => {
  it('SourcePicker module is importable', async () => {
    const { SourcePicker } = await import('../src/app/SourcePicker');
    expect(typeof SourcePicker).toBe('function');
  });
});
