/**
 * generate-capability-manifest.mjs — build-time generation of the
 * capability-catalog manifest bundle.
 *
 * Same pattern as scripts/generate-recipe-assets.mjs: the capability catalog
 * must read files that live outside the Vite project root (examples/ and
 * recipes/ sit at the repo root, one level above control-plane/), so we
 * pre-compute a JSON bundle that the app imports statically. NO fetch(),
 * build-time only (AC-INV-serverless / m10 no-write invariant).
 *
 * Contract (design D2/§3.6 of cycle m10-2-1-crossref-render):
 *   - paths are repo-root-relative with a leading slash ('/examples/...'),
 *     machine-independent; parseProfile derives the recipe namespace from
 *     path.includes('/recipes/') so the leading slash is load-bearing.
 *   - packs carry origin 'recipe:<recipe-dir>'.
 *   - every item of skills/packs/profiles/workflows/recipes carries a build-time
 *     'sha256' hex digest of its content (REQ-DEI-2) — the catalog surfaces it
 *     as evidence; the runtime never computes hashes. Providers carry no sha
 *     (DD-4 empty-state: no provider source exists yet).
 *   - deterministic: same tree → same bytes (sorted reads, stable ids,
 *     collections sorted by path, node:crypto digests).
 *   - fail-fast: if the collection counts drift from the committed snapshot
 *     the script exits non-zero BEFORE vite build (counts are pinned by
 *     control-plane/test/fixtures/capability-manifest-snapshot.ts).
 *
 * Usage: node scripts/generate-capability-manifest.mjs   (any cwd; wired into pnpm build)
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const controlPlaneRoot = join(scriptDir, '..');
const repoRoot = join(controlPlaneRoot, '..');
const outFile = join(
  controlPlaneRoot,
  'src',
  'features',
  'capability-catalog',
  'data',
  'manifest-data.json',
);

// Counts pinned by control-plane/test/fixtures/capability-manifest-snapshot.ts
// and asserted by test/capability-catalog.spec.ts.
const EXPECTED_COUNTS = { skills: 3, packs: 4, profiles: 2, workflows: 1, providers: 0, recipes: 1 };

function toRepoPath(absPath) {
  return '/' + relative(repoRoot, absPath).split('\\').join('/');
}

/** Build-time sha256 hex digest of file content (REQ-DEI-2). */
function sha256Hex(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/** Sorted directory entries that are directories (empty when the dir is absent). */
function sortedDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .sort()
    .filter((name) => statSync(join(dir, name)).isDirectory());
}

/** Sorted file names inside dir matching the given suffix (empty when absent). */
function sortedFiles(dir, suffix) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .sort()
    .filter((name) => name.endsWith(suffix) && statSync(join(dir, name)).isFile());
}

const skills = [];
for (const dir of sortedDirs(join(repoRoot, 'examples', 'skills'))) {
  const abs = join(repoRoot, 'examples', 'skills', dir, 'SKILL.md');
  if (!existsSync(abs)) continue;
  const content = readFileSync(abs, 'utf8');
  skills.push({
    id: `skill-${dir}`,
    path: toRepoPath(abs),
    content,
    sha256: sha256Hex(content),
  });
}

const packs = [];
for (const recipeDir of sortedDirs(join(repoRoot, 'recipes'))) {
  const packsRoot = join(repoRoot, 'recipes', recipeDir, 'skeleton', 'packs');
  for (const packDir of sortedDirs(packsRoot)) {
    for (const file of sortedFiles(join(packsRoot, packDir), '.md')) {
      const abs = join(packsRoot, packDir, file);
      const content = readFileSync(abs, 'utf8');
      packs.push({
        id: `pack-${basename(file, '.md')}`,
        path: toRepoPath(abs),
        content,
        sha256: sha256Hex(content),
        origin: `recipe:${recipeDir}`,
      });
    }
  }
}

const profiles = [];
for (const file of sortedFiles(join(repoRoot, 'examples'), '-profile.yaml')) {
  const abs = join(repoRoot, 'examples', file);
  const content = readFileSync(abs, 'utf8');
  profiles.push({
    id: `profile-${basename(file, '.yaml')}`,
    path: toRepoPath(abs),
    content,
    sha256: sha256Hex(content),
  });
}
for (const recipeDir of sortedDirs(join(repoRoot, 'recipes'))) {
  const profilesRoot = join(repoRoot, 'recipes', recipeDir, 'skeleton', 'profiles');
  for (const file of sortedFiles(profilesRoot, '.yaml')) {
    const abs = join(profilesRoot, file);
    const content = readFileSync(abs, 'utf8');
    profiles.push({
      id: `profile-${basename(file, '.yaml')}`,
      path: toRepoPath(abs),
      content,
      sha256: sha256Hex(content),
    });
  }
}

const workflows = [];
for (const file of sortedFiles(join(repoRoot, 'control-plane', 'workflows', 'comfyui'), '.workflow.json')) {
  const abs = join(repoRoot, 'control-plane', 'workflows', 'comfyui', file);
  const content = readFileSync(abs, 'utf8');
  workflows.push({
    id: `workflow-${basename(file, '.workflow.json')}`,
    path: toRepoPath(abs),
    content,
    sha256: sha256Hex(content),
  });
}

// DD-4 empty-state: no provider manifest source exists yet.
const providers = [];

const recipes = [];
for (const recipeDir of sortedDirs(join(repoRoot, 'recipes'))) {
  const abs = join(repoRoot, 'recipes', recipeDir, 'recipe.yaml');
  if (!existsSync(abs)) continue;
  const content = readFileSync(abs, 'utf8');
  recipes.push({
    id: `recipe-${recipeDir}`,
    path: toRepoPath(abs),
    content,
    sha256: sha256Hex(content),
  });
}

// Deterministic output: sort each collection by path.
for (const collection of [skills, packs, profiles, workflows, recipes]) {
  collection.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

const bundle = { skills, packs, profiles, workflows, providers, recipes };

const drift = Object.entries(EXPECTED_COUNTS)
  .filter(([key, expected]) => bundle[key].length !== expected)
  .map(([key, expected]) => `${key}: expected ${expected}, got ${bundle[key].length}`);
if (drift.length > 0) {
  console.error('generate-capability-manifest: collection count drift (fail-fast before vite build):');
  for (const line of drift) console.error(`  - ${line}`);
  process.exit(1);
}

writeFileSync(outFile, JSON.stringify(bundle, null, 2) + '\n', 'utf8');
console.log(
  `manifest-data.json written: ${skills.length} skill(s), ${packs.length} pack(s), ` +
    `${profiles.length} profile(s), ${workflows.length} workflow(s), ${providers.length} provider(s), ` +
    `${recipes.length} recipe(s)`,
);
