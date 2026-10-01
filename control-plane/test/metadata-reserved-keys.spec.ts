import { describe, expect, it } from 'vitest';
import {
  METADATA_RESERVED_KEYS,
  isReservedMetadataKey,
} from '../src/lib/metadata-reserved-keys';

// REQ-CP-008 — the reserved-keys set is an explicit cross-feature contract
// (MetadataCard skip-list <-> m16EntityBridge 'content' injection). This test
// FIXES the set: adding or removing a key without updating it must break.
describe('METADATA_RESERVED_KEYS contract (REQ-CP-008)', () => {
  it('exports exactly the reserved keys of the current contract', () => {
    expect([...METADATA_RESERVED_KEYS]).toEqual(['name', 'namespace', 'content']);
  });

  it('isReservedMetadataKey matches exactly the exported set (case-sensitive)', () => {
    for (const key of METADATA_RESERVED_KEYS) expect(isReservedMetadataKey(key)).toBe(true);
    for (const key of ['Name', 'namespaces', 'contents', 'purpose', 'description', '']) {
      expect(isReservedMetadataKey(key)).toBe(false);
    }
  });
});
