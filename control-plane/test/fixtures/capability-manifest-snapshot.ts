/**
 * Capability catalog test fixtures
 *
 * Expected manifest at HEAD 364571c:
 * - skills: 3 (character-consistency, narrative-arc, scene-validator)
 * - packs: 4 (story_core, characters, editorial, visual_core)
 * - profiles: 2 (middle-grade-10-11 from examples, middle-grade-10-11 from recipe skeleton)
 * - workflows: 1 (sdxl-illustrated-page)
 * - providers: 0
 * - recipes: 1 (middle-grade-illustrated)
 */

export const expectedManifestCounts = {
  skills: 3,
  packs: 4,
  profiles: 2,
  workflows: 1,
  providers: 0,
  recipes: 1,
} as const;

export const expectedSkillIds = [
  'skill-character-consistency',
  'skill-narrative-arc',
  'skill-scene-validator',
] as const;

export const expectedPackIds = [
  'pack-story_intake',
  'pack-character_design',
  'pack-editorial_pass',
  'pack-visual_bible_seed',
] as const;

export const expectedProfileIds = [
  'profile-middle-grade-10-11',
] as const;

export const expectedWorkflowIds = [
  'workflow-sdxl-illustrated-page',
] as const;

export const expectedRecipeIds = [
  'recipe-middle-grade-illustrated',
] as const;
