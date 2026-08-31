/**
 * useRecipeLoader — React hook that loads recipe bundles via import.meta.glob.
 *
 * Uses Vite's static glob import to load recipe YAML and schemas at build time.
 * NO fetch(), NO network I/O — per AC-INV-serverless.
 *
 * Recipe bundles are loaded from:
 *   /recipes/<id>/recipe.yaml
 *   /recipes/<id>/parameters.schema.json
 *   /recipes/<id>/ui.schema.json
 *
 * Usage:
 *   const { recipe, parametersSchema, uiSchema } = useRecipeLoader('middle-grade-illustrated');
 */

import { useMemo } from 'react';
import { parse as parseYaml } from 'yaml';
import type { RecipeBundle } from '@recipes/recipeLoader';
import type { Result } from '@recipes/result';

/** Lazy glob loaders — resolved at module load time (Vite) */
const recipeGlobs = import.meta.glob('/recipes/*/recipe.yaml', { query: '?raw', import: 'default', eager: false }) as Record<string, () => Promise<string>>;
const schemaGlobs = import.meta.glob('/recipes/*/parameters.schema.json', { query: '?raw', import: 'default', eager: false }) as Record<string, () => Promise<string>>;
const uiGlobs = import.meta.glob('/recipes/*/ui.schema.json', { query: '?raw', import: 'default', eager: false }) as Record<string, () => Promise<string>>;

/** Map of recipe ID → loaded recipe bundle (null if not loaded/found). */
const recipeCache = new Map<string, RecipeBundle | null>();

/** Synchronously get the glob keys for a recipe ID. */
function getGlobKeys(recipeId: string): {
  recipeKey: string | undefined;
  schemaKey: string | undefined;
  uiKey: string | undefined;
} {
  const keys = Object.keys(recipeGlobs);
  const recipeKey = keys.find(k => k === `/recipes/${recipeId}/recipe.yaml`);
  const schemaKey = Object.keys(schemaGlobs).find(k => k === `/recipes/${recipeId}/parameters.schema.json`);
  const uiKey = Object.keys(uiGlobs).find(k => k === `/recipes/${recipeId}/ui.schema.json`);
  return { recipeKey, schemaKey, uiKey };
}

/** Load a recipe bundle by ID (async). Uses cache for repeat calls. */
export async function loadRecipeBundle(recipeId: string): Promise<Result<RecipeBundle>> {
  if (recipeCache.has(recipeId)) {
    const cached = recipeCache.get(recipeId) as RecipeBundle | null;
    if (cached === null) {
      return { ok: false, code: 'recipe-not-found', message: `Recipe '${recipeId}' not found` };
    }
    return { ok: true, code: 'recipe-loaded', message: 'Loaded from cache', data: cached };
  }

  const { recipeKey, schemaKey, uiKey } = getGlobKeys(recipeId);

  if (!recipeKey || !schemaKey) {
    recipeCache.set(recipeId, null);
    return { ok: false, code: 'recipe-not-found', message: `Recipe '${recipeId}' not found` };
  }

  try {
    const [recipeYamlText, schemaText] = await Promise.all([
      recipeGlobs[recipeKey]!(),
      schemaGlobs[schemaKey]!(),
    ]);

    const recipeYaml = parseYaml(recipeYamlText);
    const parametersSchema = JSON.parse(schemaText);

    let uiSchema: Record<string, unknown> | null = null;
    if (uiKey) {
      const uiText = await uiGlobs[uiKey]!();
      uiSchema = JSON.parse(uiText);
    }

    const bundle: RecipeBundle = {
      recipeId,
      recipeYaml,
      parametersSchema,
      uiSchema,
      skeletonFiles: {}, // Skeleton files loaded separately by the renderer
      lockData: null,
    };

    recipeCache.set(recipeId, bundle);
    return { ok: true, code: 'recipe-loaded', message: 'Recipe loaded successfully', data: bundle };
  } catch (e) {
    recipeCache.set(recipeId, null);
    return {
      ok: false,
      code: 'recipe-load-error',
      message: `Failed to load recipe '${recipeId}': ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/** React hook wrapper around loadRecipeBundle. */
export function useRecipeLoader(recipeId: string): { bundle: RecipeBundle | null; loading: boolean; error: string | null } {
  return useMemo(() => {
    // This hook returns synchronously — actual loading happens via a separate data-fetching pattern
    // For the wizard, we use the async loadRecipeBundle and manage state in the component
    const cached = recipeCache.get(recipeId);
    return {
      bundle: cached ?? null,
      loading: false,
      error: cached === null && recipeCache.has(recipeId) ? `Recipe '${recipeId}' not found` : null,
    };
  }, [recipeId]);
}
