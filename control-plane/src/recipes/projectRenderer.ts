/**
 * Project renderer — renders a full project from a recipe bundle.
 *
 * Renders skeleton template files using the TemplateEngine, merges parameters
 * with recipe defaults, validates parameters, and produces a runnable project manifest.
 *
 * All operations are pure functions — no filesystem writes, no network I/O.
 */

import { TemplateEngine } from "./templateEngine.js";
import { validateParameters } from "./parameterValidator.js";
import type { Result } from "./result.js";

export interface RenderOptions {
  /** Override parameters (user-supplied). */
  parameters: Record<string, unknown>;
  /** Project ID for the new project. */
  projectId: string;
  /** Skeleton files as a map of relative path → template content. */
  skeletonFiles: Record<string, string>;
  /** Recipe's parameter schema. */
  parametersSchema: Record<string, unknown>;
  /** Default parameter values from recipe.yaml */
  defaultParameters: Record<string, unknown>;
  /** Recipe ID for provenance. */
  recipeId: string;
}

export interface RenderResult extends Result<void> {
  /** Rendered skeleton files (path → rendered content). */
  skeletonFiles: Record<string, string>;
  /** Final merged manifest. */
  manifest: Record<string, unknown>;
  /** Parameter validation warnings (soft). */
  warnings: string[];
}

/** Render a project from a recipe bundle. */
export function renderProject(options: RenderOptions): RenderResult {
  const { parameters, projectId, skeletonFiles, parametersSchema, defaultParameters, recipeId } = options;
  const warnings: string[] = [];

  // Step 1: Merge default parameters with user-supplied parameters (user wins on conflict)
  const mergedParams = { ...defaultParameters, ...parameters };

  // Step 2: Validate merged parameters
  const validation = validateParameters(mergedParams, parametersSchema);
  if (!validation.ok) {
    return {
      ok: false,
      code: "parameter-validation-error",
      message: validation.message,
      skeletonFiles: {},
      manifest: {},
      warnings,
    };
  }

  // Step 3: Render skeleton template files
  const engine = new TemplateEngine();
  const renderedSkeleton: Record<string, string> = {};
  for (const [filePath, templateContent] of Object.entries(skeletonFiles)) {
    try {
      renderedSkeleton[filePath] = engine.render(templateContent, mergedParams);
    } catch (e) {
      return {
        ok: false,
        code: "template-error",
        message: `Failed to render ${filePath}: ${e instanceof Error ? e.message : String(e)}`,
        skeletonFiles: {},
        manifest: {},
        warnings,
      };
    }
  }

  // Step 4: Build the manifest
  const createdAt = new Date().toISOString();
  const manifest: Record<string, unknown> = {
    id: projectId,
    createdAt,
    recipeId,
    audience: mergedParams["audience"] ?? null,
    format: mergedParams["format"] ?? null,
    publishing: mergedParams["publishing"] ?? null,
    initialGoals: mergedParams["initialGoals"] ?? [],
    project: {
      profiles: mergedParams["profiles"] ?? [],
      packs: mergedParams["packs"] ?? [],
      skills: mergedParams["skills"] ?? [],
      publishingTargets: mergedParams["publishingTargets"] ?? [],
    },
  };

  return {
    ok: true,
    code: "render-ok",
    message: "Project rendered successfully",
    skeletonFiles: renderedSkeleton,
    manifest,
    warnings,
  };
}
