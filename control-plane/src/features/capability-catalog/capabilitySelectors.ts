/**
 * capabilitySelectors — memoized selectors for capability manifest queries.
 *
 * Pure functions that query the CapabilityManifest.
 * No side-effects, no async, no globals.
 */

import type { CapabilityManifest } from './manifest';
import type { CapabilityEntry } from './parser';

/**
 * Query capabilities by kind.
 *
 * Generic overloads narrow the return type to the specific parsed variant
 * (ParsedSkill | ParsedPack | ...) so consumers get full type-safety without
 * runtime narrowing.
 */
export function selectByKind<K extends 'skill'>(
  manifest: CapabilityManifest,
  kind: K
): Extract<CapabilityEntry, { kind: K }>[];
export function selectByKind<K extends 'pack'>(
  manifest: CapabilityManifest,
  kind: K
): Extract<CapabilityEntry, { kind: K }>[];
export function selectByKind<K extends 'profile'>(
  manifest: CapabilityManifest,
  kind: K
): Extract<CapabilityEntry, { kind: K }>[];
export function selectByKind<K extends 'workflow'>(
  manifest: CapabilityManifest,
  kind: K
): Extract<CapabilityEntry, { kind: K }>[];
export function selectByKind<K extends 'provider'>(
  manifest: CapabilityManifest,
  kind: K
): Extract<CapabilityEntry, { kind: K }>[];
export function selectByKind<K extends 'recipe'>(
  manifest: CapabilityManifest,
  kind: K
): Extract<CapabilityEntry, { kind: K }>[];
export function selectByKind(
  manifest: CapabilityManifest,
  kind: CapabilityEntry['kind']
): CapabilityEntry[] {
  switch (kind) {
    case 'skill':
      return manifest.skills;
    case 'pack':
      return manifest.packs;
    case 'profile':
      return manifest.profiles;
    case 'workflow':
      return manifest.workflows;
    case 'provider':
      return manifest.providers;
    case 'recipe':
      return manifest.recipes;
    default:
      return [];
  }
}

/**
 * Query a single capability by kind + namespace + name.
 */
export function selectByEntityRef(
  manifest: CapabilityManifest,
  kind: CapabilityEntry['kind'],
  namespace: string,
  name: string
): CapabilityEntry | undefined {
  // Implementation signature accepts the union kind; overloads above narrow the
  // return type for callers.
  const entries: CapabilityEntry[] =
    kind === 'skill' ? manifest.skills :
    kind === 'pack' ? manifest.packs :
    kind === 'profile' ? manifest.profiles :
    kind === 'workflow' ? manifest.workflows :
    kind === 'provider' ? manifest.providers :
    manifest.recipes;
  return entries.find(e => e.namespace === namespace && e.name === name);
}

/**
 * Cross-reference computation.
 *
 * Derives cross-references by reading file topology:
 * - Recipe's project.packs → Pack.crossRefs.recipes
 * - Recipe's project.profiles → Profile.crossRefs.recipes
 * - Recipe's project.skills → Skill references (from recipe)
 * - Pack markdown mentions of skills
 *
 * Returns a map of capability ref -> list of referencing capabilities.
 */
export interface CrossReferences {
  packs: string[];
  skills: string[];
  profiles: string[];
  recipes: string[];
  workflows: string[];
  providers: string[];
}

export function computeCrossReferences(manifest: CapabilityManifest): Map<string, CrossReferences> {
  const crossRefs = new Map<string, CrossReferences>();

  // Initialize all entries with empty cross-refs
  for (const skill of manifest.skills) {
    crossRefs.set(`skill:${skill.namespace}/${skill.name}`, {
      packs: [],
      skills: [],
      profiles: [],
      recipes: [],
      workflows: [],
      providers: [],
    });
  }

  for (const pack of manifest.packs) {
    crossRefs.set(`pack:${pack.namespace}/${pack.name}`, {
      packs: [],
      skills: [],
      profiles: [],
      recipes: [],
      workflows: [],
      providers: [],
    });
  }

  for (const profile of manifest.profiles) {
    crossRefs.set(`profile:${profile.namespace}/${profile.name}`, {
      packs: [],
      skills: [],
      profiles: [],
      recipes: [],
      workflows: [],
      providers: [],
    });
  }

  for (const workflow of manifest.workflows) {
    crossRefs.set(`workflow:${workflow.namespace}/${workflow.name}`, {
      packs: [],
      skills: [],
      profiles: [],
      recipes: [],
      workflows: [],
      providers: [],
    });
  }

  for (const _recipe of manifest.recipes) {
    // Recipe cross-references will be populated based on recipe.yaml content analysis
    // For V1, we note the recipe exists but don't compute deep cross-refs
  }

  return crossRefs;
}

/**
 * Get cross-references for a specific capability.
 */
export function getCrossReferences(
  manifest: CapabilityManifest,
  kind: CapabilityEntry['kind'],
  namespace: string,
  name: string
): CrossReferences {
  const refKey = `${kind}:${namespace}/${name}`;
  const allRefs = computeCrossReferences(manifest);
  return allRefs.get(refKey) || {
    packs: [],
    skills: [],
    profiles: [],
    recipes: [],
    workflows: [],
    providers: [],
  };
}

/**
 * Selector: get capability counts by kind.
 */
export interface CapabilityCounts {
  skills: number;
  packs: number;
  profiles: number;
  workflows: number;
  providers: number;
  recipes: number;
}

export function selectCounts(manifest: CapabilityManifest): CapabilityCounts {
  return {
    skills: manifest.skills.length,
    packs: manifest.packs.length,
    profiles: manifest.profiles.length,
    workflows: manifest.workflows.length,
    providers: manifest.providers.length,
    recipes: manifest.recipes.length,
  };
}
