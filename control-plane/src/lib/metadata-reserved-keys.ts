/**
 * METADATA_RESERVED_KEYS — explicit cross-feature metadata contract (REQ-CP-008).
 *
 * Producer:  m16EntityBridge (features/capability-catalog) injects the SKILL.md
 *            body as baseMetadata 'content'.
 * Consumer:  MetadataCard (features/catalog) skips reserved keys in its flat
 *            metadata dump; the capability card renders 'content' via
 *            docsSafeMarkdown (REQ-CR-CAP-13: no flat [[...]] dump).
 *
 * Before v0.24.1 this was an undeclared convention spread across two files as
 * magic strings. The module lives in src/lib (precedent: store-zip.ts,
 * download.ts) so neither consumer widens the declared cross-feature edge —
 * the extension-isolation guard only watches features/* → features/* imports.
 */
export const METADATA_RESERVED_KEYS = ['name', 'namespace', 'content'] as const;

export type MetadataReservedKey = (typeof METADATA_RESERVED_KEYS)[number];

/** True iff `key` is reserved by the metadata-card contract (exact match). */
export function isReservedMetadataKey(key: string): key is MetadataReservedKey {
  return (METADATA_RESERVED_KEYS as readonly string[]).includes(key);
}
