/**
 * capability-catalog manifest
 *
 * Build-time static manifest imported from pre-computed JSON.
 * NO runtime I/O, NO fetch, NO IndexedDB — per m10 serverless invariant.
 *
 * The manifest data is pre-computed by control-plane/scripts/
 * generate-capability-manifest.mjs (first step of `pnpm build`) and stored as
 * static JSON.
 */

import type { CapabilityEntry } from './parser';
import {
  parseSkill,
  parsePack,
  parseProfile,
  parseWorkflow,
  parseProvider,
  parseRecipe,
  computeSha256,
} from './parser';
import manifestData from './data/manifest-data.json';

// ============================================================================
// Types
// ============================================================================

export interface CapabilityManifest {
  skills: CapabilityEntry[];
  packs: CapabilityEntry[];
  profiles: CapabilityEntry[];
  workflows: CapabilityEntry[];
  providers: CapabilityEntry[];
  recipes: CapabilityEntry[];
}

// ============================================================================
// Manifest builder from pre-computed data
// ============================================================================

/**
 * Build the CapabilityManifest from pre-computed manifest data.
 * Called at module init time — synchronous.
 */
function buildManifest(): CapabilityManifest {
  const skills: CapabilityEntry[] = [];
  const packs: CapabilityEntry[] = [];
  const profiles: CapabilityEntry[] = [];
  const workflows: CapabilityEntry[] = [];
  const providers: CapabilityEntry[] = [];
  const recipes: CapabilityEntry[] = [];

  // Parse skills
  for (const item of manifestData.skills) {
    try {
      const skill = parseSkill(item.content, item.path);
      skills.push(skill);
    } catch (e) {
      console.warn(`[capability-catalog] Failed to parse skill at ${item.path}:`, e);
    }
  }

  // Parse packs (all from recipe skeletons for now)
  for (const item of manifestData.packs) {
    try {
      const pack = parsePack(item.content, item.path, item.origin as 'global' | `recipe:${string}`);
      packs.push(pack);
    } catch (e) {
      console.warn(`[capability-catalog] Failed to parse pack at ${item.path}:`, e);
    }
  }

  // Parse profiles
  for (const item of manifestData.profiles) {
    try {
      const profile = parseProfile(item.content, item.path);
      profiles.push(profile);
    } catch (e) {
      console.warn(`[capability-catalog] Failed to parse profile at ${item.path}:`, e);
    }
  }

  // Parse workflows
  for (const item of manifestData.workflows) {
    try {
      const workflow = parseWorkflow(item.content, item.path);
      workflows.push(workflow);
    } catch (e) {
      console.warn(`[capability-catalog] Failed to parse workflow at ${item.path}:`, e);
    }
  }

  // Providers: DD-4 empty-state — always empty until first provider yaml exists
  const providerEntries = parseProvider();
  providers.push(...providerEntries);

  // Parse recipes
  for (const item of manifestData.recipes) {
    try {
      const recipe = parseRecipe(item.content, item.path);
      recipes.push(recipe);
    } catch (e) {
      console.warn(`[capability-catalog] Failed to parse recipe at ${item.path}:`, e);
    }
  }

  return { skills, packs, profiles, workflows, providers, recipes };
}

// ============================================================================
// Module-level singleton manifest (computed once at import)
// ============================================================================

/**
 * The capability manifest — built at module init time from pre-computed data.
 * Synchronous, immutable, cached.
 */
export const capabilityManifest: CapabilityManifest = buildManifest();

/**
 * Convenience re-export for consumers.
 */
export function loadManifest(): CapabilityManifest {
  return capabilityManifest;
}

// Re-export computeSha256 for external use (e.g., fixture generation)
export { computeSha256 };
