/**
 * generate-recipe-assets.mjs — build-time generation of the recipe asset bundle.
 *
 * Same pattern as the m10.2 capability-catalog manifest: import.meta.glob cannot
 * reliably include files outside the Vite project root (recipes/ lives at the
 * repo root, one level above control-plane/), so we pre-compute a JSON bundle
 * that the app imports statically. NO fetch(), build-time only (AC-INV-serverless).
 *
 * Usage: node scripts/generate-recipe-assets.mjs   (run from control-plane/)
 */

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const controlPlaneRoot = process.cwd();
const repoRoot = join(controlPlaneRoot, '..');
const recipesRoot = join(repoRoot, 'recipes');
const outFile = join(controlPlaneRoot, 'src', 'generated', 'recipe-assets.json');

function walk(dir, base = dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, base, acc);
    else acc.push(relative(base, full).split('\\').join('/'));
  }
  return acc;
}

const bundle = {};
for (const recipeDir of readdirSync(recipesRoot)) {
  const recipePath = join(recipesRoot, recipeDir);
  if (!statSync(recipePath).isDirectory()) continue;

  const entry = {};
  const staticFiles = ['recipe.yaml', 'parameters.schema.json', 'ui.schema.json', 'recipe.lock.json'];
  for (const name of staticFiles) {
    try {
      entry[name] = readFileSync(join(recipePath, name), 'utf8');
    } catch {
      // optional file for this recipe
    }
  }
  const skeletonDir = join(recipePath, 'skeleton');
  try {
    const skeleton = {};
    for (const rel of walk(skeletonDir)) {
      skeleton[rel] = readFileSync(join(skeletonDir, rel), 'utf8');
    }
    entry.skeleton = skeleton;
  } catch {
    // recipe without skeleton
  }
  bundle[recipeDir] = entry;
}

mkdirSync(join(controlPlaneRoot, 'src', 'generated'), { recursive: true });
writeFileSync(outFile, JSON.stringify(bundle, null, 2) + '\n', 'utf8');
const skeletonCount = Object.values(bundle).reduce((n, e) => n + Object.keys(e.skeleton ?? {}).length, 0);
console.log(`recipe-assets.json written: ${Object.keys(bundle).length} recipe(s), ${skeletonCount} skeleton file(s)`);
