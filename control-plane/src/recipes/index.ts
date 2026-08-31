/**
 * Narrative recipes — creation-recipe engine for Reactive Narrative Studio.
 *
 * Python-equivalent TypeScript modules:
 * - templateEngine: mustache-subset template rendering
 * - parameterValidator: JSON Schema parameter validation (Ajv 8)
 * - recipeLoader: recipe bundle loading + schema validation
 * - projectRenderer: full project rendering from a recipe bundle
 * - equivalenceOracle: canonical JSON equality (JCS/RFC 8785 subset)
 *
 * All modules are pure functions — no eval, exec, filesystem writes, or network I/O
 * (except recipeLoader which reads recipe files from disk, per REQ-CR-12).
 */

export { TemplateEngine, TemplateError } from "./templateEngine.js";
export type { TemplateErrorCode, Token, TokenType } from "./templateEngine.js";

export { ParameterValidator, validateParameters } from "./parameterValidator.js";

export { loadRecipe, RecipeLayoutError } from "./recipeLoader.js";
export type { RecipeBundle } from "./recipeLoader.js";

export { renderProject } from "./projectRenderer.js";
export type { RenderOptions, RenderResult } from "./projectRenderer.js";

export {
  canonicalJson,
  canonicalJsonEqual,
  stripRecipeOwned,
  checkEquivalence,
} from "./equivalenceOracle.js";

export { ok, err } from "./result.js";
export type { Result } from "./result.js";
