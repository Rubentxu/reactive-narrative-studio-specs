/**
 * Recipe loader — loads and validates creation recipes.
 *
 * Loads a recipe from a directory containing recipe.yaml, parameters.schema.json,
 * skeleton/, and optionally ui.schema.json and recipe.lock.json.
 *
 * Raises RecipeLayoutError BEFORE any schema validation if required files are missing.
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";
import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "yaml";

import type { Result } from "./result.js";

const ajv = new Ajv({ allErrors: true, strict: true, validateFormats: true });
addFormats(ajv);

// Load creation-recipe schema — resolve from project root at runtime
const SCHEMA_PATH = path.join(process.cwd(), "specs", "creation-recipe.schema.json");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CREATION_SCHEMA: Record<string, unknown> = JSON.parse(
  fs.readFileSync(SCHEMA_PATH, "utf-8"),
);

/** Recipe bundle — a loaded recipe with all its components. */
export interface RecipeBundle {
  recipeId: string;
  recipeYaml: Record<string, unknown>;
  parametersSchema: Record<string, unknown>;
  uiSchema: Record<string, unknown> | null;
  skeletonFiles: Record<string, string>;
  lockData: Record<string, unknown> | null;
}

/** Error thrown when a required recipe file is missing. */
export class RecipeLayoutError extends Error {
  readonly code = "recipe-layout-error" as const;
  readonly path: string;

  constructor(code: string, message: string, filePath: string) {
    super(message);
    this.name = "RecipeLayoutError";
    this.code = code as "recipe-layout-error";
    this.path = filePath;
  }
}

/** Load a recipe bundle from a directory. */
export function loadRecipe(
  recipeId: string,
  recipesRoot: string,
): Result<RecipeBundle> {
  const recipesRootPath = path.resolve(recipesRoot);
  const recipeDir = path.join(recipesRootPath, recipeId);

  // Step 1: Layout check BEFORE Ajv
  const required = ["recipe.yaml", "parameters.schema.json"];
  for (const name of required) {
    const filePath = path.join(recipeDir, name);
    if (!fs.existsSync(filePath)) {
      return {
        ok: false,
        code: "recipe-layout-error",
        message: `required file missing: ${name}`,
      };
    }
  }

  // Step 2: Load and validate recipe.yaml
  const recipeYamlPath = path.join(recipeDir, "recipe.yaml");
  let recipeYaml: Record<string, unknown>;
  try {
    const content = fs.readFileSync(recipeYamlPath, "utf-8");
    recipeYaml = yaml.parse(content) as Record<string, unknown>;
  } catch (e) {
    return {
      ok: false,
      code: "recipe-load-error",
      message: `Failed to parse recipe.yaml: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const validate = ajv.compile(CREATION_SCHEMA);
  if (!validate(recipeYaml)) {
    const firstError = validate.errors?.[0];
    return {
      ok: false,
      code: "recipe-schema-error",
      message: `recipe.yaml: ${firstError?.message ?? "schema validation failed"}`,
    };
  }

  // Step 3: Load parameters.schema.json
  const paramsSchemaPath = path.join(recipeDir, "parameters.schema.json");
  let parametersSchema: Record<string, unknown>;
  try {
    parametersSchema = JSON.parse(fs.readFileSync(paramsSchemaPath, "utf-8"));
  } catch (e) {
    return {
      ok: false,
      code: "recipe-load-error",
      message: `Failed to parse parameters.schema.json: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Step 4: Load ui.schema.json (optional)
  const uiSchemaPath = path.join(recipeDir, "ui.schema.json");
  let uiSchema: Record<string, unknown> | null = null;
  if (fs.existsSync(uiSchemaPath)) {
    uiSchema = JSON.parse(fs.readFileSync(uiSchemaPath, "utf-8"));
  }

  // Step 5: Load skeleton files
  const skeletonDir = path.join(recipeDir, "skeleton");
  const skeletonFiles: Record<string, string> = {};
  if (fs.existsSync(skeletonDir)) {
    for (const entry of fs.readdirSync(skeletonDir, { recursive: true })) {
      const fullPath = path.join(skeletonDir, entry as string);
      if (fs.statSync(fullPath).isFile()) {
        const rel = path.relative(skeletonDir, fullPath);
        skeletonFiles[rel] = fs.readFileSync(fullPath, "utf-8");
      }
    }
  }

  // Step 6: Load lock data (optional)
  const lockPath = path.join(recipeDir, "recipe.lock.json");
  let lockData: Record<string, unknown> | null = null;
  if (fs.existsSync(lockPath)) {
    lockData = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
  }

  return {
    ok: true,
    code: "recipe-valid",
    message: "Recipe loaded successfully",
    data: {
      recipeId,
      recipeYaml,
      parametersSchema,
      uiSchema,
      skeletonFiles,
      lockData,
    },
  };
}
