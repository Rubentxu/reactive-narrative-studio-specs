/**
 * capability-catalog feature — read-only catalog of creative toolchain capabilities.
 *
 * Provides:
 * - CapabilityManifest (build-time static enumeration via import.meta.glob)
 * - useCapabilityManifest hook (synchronous, memoized)
 * - View components (Overview, KindList, CapabilityDetail)
 * - Parser functions (parseSkill, parsePack, parseProfile, etc.)
 *
 * Routes are registered in router.ts, not via Extension Registry.
 *
 * m10 invariants preserved:
 * - serverless: import.meta.glob at build time, no runtime fetch
 * - no Dexie/IndexedDB/Orama: pure in-memory manifest
 * - no-write-CP: zero imports from useProjectionStore
 */

// Re-export public API
export { capabilityManifest, loadManifest } from './manifest';
export type { CapabilityManifest } from './manifest';
export { useCapabilityManifest } from './useCapabilityManifest';
export {
  selectByKind,
  selectByEntityRef,
  computeCrossReferences,
  getCrossReferences,
  selectCounts,
} from './capabilitySelectors';
export type { CrossReferences, CapabilityCounts } from './capabilitySelectors';
export {
  parseSkill,
  parsePack,
  parseProfile,
  parseWorkflow,
  parseProvider,
  parseRecipe,
  computeSha256,
} from './parser';
export type {
  ParsedSkill,
  ParsedPack,
  ParsedProfile,
  ParsedWorkflow,
  ParsedProvider,
  ParsedRecipe,
  CapabilityEntry,
} from './parser';
