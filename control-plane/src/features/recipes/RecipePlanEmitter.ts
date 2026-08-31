/**
 * RecipePlanEmitter — emit create-plan.json artifact (CLI-consumable).
 *
 * The plan is canonical JSON (RFC 8785 subset via equivalenceOracle.canonicalJson).
 * Shape per REQ-CR-5:
 *   { recipe, recipeLockSha256, manifest, skeleton: [{path, sha256, bytes}], createPlanSha256 }
 *
 * This module is purely functional — NO filesystem write, NO useProjectionStore.
 */

import { canonicalJson } from '@recipes/equivalenceOracle';
import type { RenderResult } from '@recipes/projectRenderer';

export interface SkeletonFileEntry {
  path: string;
  sha256: string;
  bytes: number;
}

export interface CreatePlan {
  recipe: string;
  recipeLockSha256: string;
  manifest: Record<string, unknown>;
  skeleton: SkeletonFileEntry[];
  createPlanSha256: string;
}

/** Compute SHA-256 of a string (UTF-8) asynchronously. */
export async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const buf = await crypto.subtle.digest('SHA-256', data);
  const arr = new Uint8Array(buf);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Emit a create-plan.json artifact from a render result. */
export async function emitPlan(
  recipeId: string,
  renderResult: RenderResult,
  skeletonContents: Record<string, string>,
): Promise<CreatePlan> {
  const { manifest } = renderResult;

  // Skeleton file list
  const skeleton: SkeletonFileEntry[] = await Promise.all(
    Object.entries(skeletonContents).map(async ([path, content]) => ({
      path,
      sha256: await sha256(content),
      bytes: new TextEncoder().encode(content).length,
    })),
  );

  const plan: CreatePlan = {
    recipe: recipeId,
    recipeLockSha256: '',
    manifest,
    skeleton,
    createPlanSha256: '',
  };

  // Compute createPlanSha256
  const planJson = canonicalJson(plan as unknown as Record<string, unknown>);
  plan.createPlanSha256 = await sha256(planJson);

  return plan;
}
