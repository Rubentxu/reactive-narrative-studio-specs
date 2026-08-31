/**
 * Equivalence Oracle — canonical JSON equality per RFC 8785 JCS subset.
 *
 * Provides:
 * - canonicalJson(value): serializes with sorted keys, no insignificant whitespace
 * - canonicalJsonEqual(a, b): compares canonical forms
 * - stripRecipeOwned(manifest): removes timestamp/non-recipe-owned fields
 *
 * Recipe-owned fields (per UAT-M10-04):
 * - manifest.audience.profile
 * - manifest.format
 * - manifest.publishing
 * - project.profiles, project.packs, project.skills, project.publishingTargets
 * - initialGoals
 *
 * Non-recipe-owned (stripped):
 * - createdAt (timestamp)
 * - title, id, and other metadata fields
 */

import { ok, err, type Result } from "./result.js";

/**
 * Serialize a value to canonical JSON (RFC 8785 JCS subset).
 *
 * Properties:
 * - Keys are sorted lexicographically
 * - No insignificant whitespace
 * - UTF-8 encoding
 * - NFC Unicode normalization
 */
export function canonicalJson(value: unknown): string {
  const serialized = JSON.stringify(value, Object.keys(value as object).sort(), 0);
  return serialized.normalize("NFC");
}

/** Check if two values are equal when serialized to canonical JSON. */
export function canonicalJsonEqual(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

/** Remove non-recipe-owned fields from a project manifest. */
export function stripRecipeOwned(manifest: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const recipeOwnedToplevel = new Set(["audience", "format", "publishing", "initialGoals"]);

  for (const [key, value] of Object.entries(manifest)) {
    if (recipeOwnedToplevel.has(key)) {
      result[key] = value;
    } else if (key === "project" && typeof value === "object" && value !== null) {
      const project = value as Record<string, unknown>;
      const projectRecipeOwned = new Set(["profiles", "packs", "skills", "publishingTargets"]);
      const resultProject: Record<string, unknown> = {};
      for (const [pk, pv] of Object.entries(project)) {
        if (projectRecipeOwned.has(pk)) {
          resultProject[pk] = pv;
        }
      }
      if (Object.keys(resultProject).length > 0) {
        result["project"] = resultProject;
      }
    }
  }

  return result;
}

/** Check round-trip equivalence between two manifests. */
export function checkEquivalence(
  manifestA: Record<string, unknown>,
  manifestB: Record<string, unknown>,
): Result<void> {
  try {
    const strippedA = stripRecipeOwned(manifestA);
    const strippedB = stripRecipeOwned(manifestB);
    const equal = canonicalJsonEqual(strippedA, strippedB);
    return equal
      ? ok("equivalence-equal", "Manifests are equivalent (recipe-owned fields match)")
      : err("equivalence-not-equal", "Manifests differ in recipe-owned fields");
  } catch (e) {
    return err(
      "canonical-json-error",
      `Failed to compute canonical JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
