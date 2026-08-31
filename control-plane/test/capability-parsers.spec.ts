/**
 * capability-parsers.spec.ts
 *
 * Unit tests for individual parser functions.
 * Tests parseSkill, parsePack, parseProfile, parseWorkflow, parseProvider.
 */

import { describe, it, expect } from 'vitest';
import {
  parseSkill,
  parsePack,
  parseProfile,
  parseWorkflow,
  parseProvider,
  parseRecipe,
} from '../src/features/capability-catalog/parser';

// ============================================================================
// Skill parser tests
// ============================================================================

describe('parseSkill', () => {
  it('extracts name from H1', () => {
    const content = `# test-skill\n\n## Purpose\n\nTest purpose text.`;
    const result = parseSkill(content, '/examples/skills/test-skill/SKILL.md');
    expect(result.name).toBe('test-skill');
  });

  it('extracts purpose from ## Purpose section', () => {
    const content = `# test-skill\n\n## Purpose\n\nThis is the purpose text.\n\n## Other Section\n\nNot purpose.`;
    const result = parseSkill(content, '/examples/skills/test-skill/SKILL.md');
    expect(result.purpose).toContain('This is the purpose text');
  });

  it('returns correct structure', () => {
    const content = `# test-skill\n\n## Purpose\n\nTest purpose.`;
    const result = parseSkill(content, '/examples/skills/test-skill/SKILL.md');
    expect(result.kind).toBe('skill');
    expect(result.namespace).toBe('default');
    expect(result.origin).toBe('global');
    expect(result.path).toBe('/examples/skills/test-skill/SKILL.md');
    expect(result.id).toBe('skill-test-skill');
  });
});

// ============================================================================
// Pack parser tests
// ============================================================================

describe('parsePack', () => {
  it('extracts name from H1', () => {
    const content = `# Test Pack\n\nPack description text.`;
    const result = parsePack(content, '/recipes/test/skeleton/packs/test_pack/desc.md', 'recipe:test');
    expect(result.name).toBe('Test Pack');
  });

  it('extracts description', () => {
    const content = `# Test Pack\n\nThis is the description.`;
    const result = parsePack(content, '/recipes/test/skeleton/packs/test_pack/desc.md', 'recipe:test');
    expect(result.description).toContain('This is the description');
  });

  it('uses global origin correctly', () => {
    const content = `# Test Pack\n\nDescription.`;
    const result = parsePack(content, '/examples/packs/test_pack/desc.md', 'global');
    expect(result.origin).toBe('global');
    expect(result.namespace).toBe('default');
  });

  it('uses recipe origin correctly', () => {
    const content = `# Test Pack\n\nDescription.`;
    const result = parsePack(content, '/recipes/my-recipe/skeleton/packs/test_pack/desc.md', 'recipe:my-recipe');
    expect(result.origin).toBe('recipe:my-recipe');
    expect(result.namespace).toBe('recipe:my-recipe');
  });
});

// ============================================================================
// Profile parser tests
// ============================================================================

describe('parseProfile', () => {
  it('parses profile/v1 yaml correctly', () => {
    const content = `schema: profile/v1
profileId: test-profile
audience:
  ageBand: young-adult
format:
  medium: novel
voice:
  register: serious
guardrails:
  - violence
  - language`;
    const result = parseProfile(content, '/examples/test-profile.yaml');
    expect(result.kind).toBe('profile');
    expect(result.name).toBe('test-profile');
    expect(result.audience).toBe('young-adult');
    expect(result.format).toBe('novel');
    expect(result.voice).toBe('serious');
    expect(result.guardrails).toEqual(['violence', 'language']);
  });

  it('derives default namespace from examples path', () => {
    const content = `schema: profile/v1
profileId: test-profile`;
    const result = parseProfile(content, '/examples/test-profile.yaml');
    expect(result.namespace).toBe('default');
  });

  it('derives recipe namespace from recipes path', () => {
    const content = `audience: {}`;
    const result = parseProfile(content, '/recipes/my-recipe/skeleton/profiles/test.yaml');
    expect(result.namespace).toBe('recipe:my-recipe');
  });
});

// ============================================================================
// Workflow parser tests
// ============================================================================

describe('parseWorkflow', () => {
  it('parses workflow/v1 json correctly', () => {
    const content = JSON.stringify({
      schema: 'workflow/v1',
      workflowId: 'test.workflow',
      provider: 'test-provider',
      model: 'test-model',
      description: 'Test workflow description.',
    });
    const result = parseWorkflow(content, '/control-plane/workflows/test.workflow.json');
    expect(result.kind).toBe('workflow');
    expect(result.name).toBe('workflow');
    expect(result.provider).toBe('test-provider');
    expect(result.model).toBe('test-model');
    expect(result.description).toBe('Test workflow description.');
  });

  it('extracts name from workflowId', () => {
    const content = JSON.stringify({
      schema: 'workflow/v1',
      workflowId: 'provider.special.workflow',
      provider: 'p',
      model: 'm',
      description: 'Desc',
    });
    const result = parseWorkflow(content, '/test.json');
    expect(result.name).toBe('workflow');
  });
});

// ============================================================================
// Provider parser tests
// ============================================================================

describe('parseProvider', () => {
  it('returns empty array', () => {
    const result = parseProvider();
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

// ============================================================================
// Recipe parser tests
// ============================================================================

describe('parseRecipe', () => {
  it('parses creation-recipe/v1 yaml correctly', () => {
    const content = `schema: creation-recipe/v1
metadata:
  id: test-recipe
  title: Test Recipe
  description: A test recipe.`;
    const result = parseRecipe(content, '/recipes/test-recipe/recipe.yaml');
    expect(result.kind).toBe('recipe');
    expect(result.name).toBe('test-recipe');
    expect(result.title).toBe('Test Recipe');
    expect(result.description).toBe('A test recipe.');
    expect(result.namespace).toBe('default');
    expect(result.id).toBe('recipe-test-recipe');
  });
});
