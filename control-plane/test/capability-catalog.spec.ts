/**
 * capability-catalog.spec.ts
 *
 * Tests for the capability catalog overview, per-kind pages, and detail page.
 * Verifies that the manifest is built correctly and routes are wired.
 */

import { describe, it, expect } from 'vitest';
import { capabilityManifest } from '../src/features/capability-catalog/manifest';
import { selectCounts, selectByKind } from '../src/features/capability-catalog/capabilitySelectors';
import { expectedManifestCounts } from './fixtures/capability-manifest-snapshot';

describe('capability-catalog manifest', () => {
  it('has correct skill count', () => {
    expect(capabilityManifest.skills.length).toBe(expectedManifestCounts.skills);
  });

  it('has correct pack count', () => {
    expect(capabilityManifest.packs.length).toBe(expectedManifestCounts.packs);
  });

  it('has correct profile count', () => {
    expect(capabilityManifest.profiles.length).toBe(expectedManifestCounts.profiles);
  });

  it('has correct workflow count', () => {
    expect(capabilityManifest.workflows.length).toBe(expectedManifestCounts.workflows);
  });

  it('has correct provider count (empty)', () => {
    expect(capabilityManifest.providers.length).toBe(expectedManifestCounts.providers);
  });

  it('has correct recipe count', () => {
    expect(capabilityManifest.recipes.length).toBe(expectedManifestCounts.recipes);
  });
});

describe('capability counts selector', () => {
  it('returns correct counts', () => {
    const counts = selectCounts(capabilityManifest);
    expect(counts.skills).toBe(3);
    expect(counts.packs).toBe(4);
    expect(counts.profiles).toBe(2);
    expect(counts.workflows).toBe(1);
    expect(counts.providers).toBe(0);
    expect(counts.recipes).toBe(1);
  });
});

describe('selectByKind', () => {
  it('returns skills array', () => {
    const skills = selectByKind(capabilityManifest, 'skill');
    expect(skills).toHaveLength(3);
    expect(skills[0].kind).toBe('skill');
  });

  it('returns packs array', () => {
    const packs = selectByKind(capabilityManifest, 'pack');
    expect(packs).toHaveLength(4);
    expect(packs[0].kind).toBe('pack');
  });

  it('returns profiles array', () => {
    const profiles = selectByKind(capabilityManifest, 'profile');
    expect(profiles).toHaveLength(2);
    expect(profiles[0].kind).toBe('profile');
  });

  it('returns workflows array', () => {
    const workflows = selectByKind(capabilityManifest, 'workflow');
    expect(workflows).toHaveLength(1);
    expect(workflows[0].kind).toBe('workflow');
  });

  it('returns providers array (empty)', () => {
    const providers = selectByKind(capabilityManifest, 'provider');
    expect(providers).toHaveLength(0);
  });

  it('returns recipes array', () => {
    const recipes = selectByKind(capabilityManifest, 'recipe');
    expect(recipes).toHaveLength(1);
    expect(recipes[0].kind).toBe('recipe');
  });
});

describe('skill entries', () => {
  it('have correct properties', () => {
    const skills = selectByKind(capabilityManifest, 'skill');
    for (const skill of skills) {
      expect(skill.kind).toBe('skill');
      expect(skill.namespace).toBe('default');
      expect(skill.name).toBeTruthy();
      expect(skill.purpose).toBeTruthy();
      expect(skill.path).toContain('/examples/skills/');
      expect(skill.origin).toBe('global');
    }
  });

  it('include character-consistency', () => {
    const skills = selectByKind(capabilityManifest, 'skill');
    const charConsistency = skills.find(s => s.name === 'character-consistency');
    expect(charConsistency).toBeDefined();
    expect(charConsistency?.purpose).toContain('validation framework');
  });
});

describe('pack entries', () => {
  it('have recipe origin for recipe-scoped packs', () => {
    const packs = selectByKind(capabilityManifest, 'pack');
    for (const pack of packs) {
      expect(pack.kind).toBe('pack');
      expect(pack.origin).toMatch(/^recipe:/);
      expect(pack.namespace).toBe('recipe:middle-grade-illustrated');
    }
  });
});

describe('profile entries', () => {
  it('have both default and recipe-scoped profiles', () => {
    const profiles = selectByKind(capabilityManifest, 'profile');
    const defaultProfile = profiles.find(p => p.namespace === 'default');
    const recipeProfile = profiles.find(p => p.namespace === 'recipe:middle-grade-illustrated');
    expect(defaultProfile).toBeDefined();
    expect(recipeProfile).toBeDefined();
  });
});

describe('workflow entries', () => {
  it('have correct properties', () => {
    const workflows = selectByKind(capabilityManifest, 'workflow');
    expect(workflows).toHaveLength(1);
    expect(workflows[0].provider).toBe('comfyui');
    expect(workflows[0].model).toBe('sdxl-1.0');
  });
});

describe('recipe entries', () => {
  it('have correct properties', () => {
    const recipes = selectByKind(capabilityManifest, 'recipe');
    expect(recipes).toHaveLength(1);
    expect(recipes[0].title).toBe('Middle Grade Illustrated Novel');
  });
});
