/**
 * RecipePlanEmitter — emit create-plan.json artifact (CLI-consumable).
 *
 * Shape parity with the Python CLI plan (narrative_cli/init.py:_build_plan_artifact):
 *   { recipe, recipeLockSha256, manifest, skeleton: [{path, sha256, bytes, content}], createPlanSha256 }
 * The `content` field is required so `narrative init --plan` can replay the plan
 * without recipe lookup.
 *
 * This module is purely functional — NO filesystem write, NO useProjectionStore.
 */

import { canonicalJson } from '@recipes/equivalenceOracle';

export interface SkeletonFileEntry {
  path: string;
  sha256: string;
  bytes: number;
  content: string;
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

/**
 * Reproduce Python `json.dumps(obj, sort_keys=True)` byte-for-byte (ASCII data).
 * Python's default separators are (', ', ': ') — compact JSON.stringify differs.
 */
export function pythonSortedJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pythonSortedJson).join(', ')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}: ${pythonSortedJson(record[k])}`).join(', ')}}`;
}

/** recipeLockSha256 — sha256 over json.dumps(lock, sort_keys=True), matching the CLI. */
export async function recipeLockSha256(lockData: Record<string, unknown>): Promise<string> {
  return sha256(pythonSortedJson(lockData));
}

/**
 * Emit a create-plan.json artifact from a rendered project.
 * `manifest` is the parsed rendered narrative.yaml (same source of truth as Python),
 * `renderedSkeleton` maps path → rendered content.
 */
export async function emitPlan(
  recipeId: string,
  manifest: Record<string, unknown>,
  renderedSkeleton: Record<string, string>,
  lockSha: string,
): Promise<CreatePlan> {
  const skeleton: SkeletonFileEntry[] = Object.entries(renderedSkeleton).map(([path, content]) => ({
    path,
    sha256: '',
    bytes: new TextEncoder().encode(content).length,
    content,
  }));
  // sha256 needs async; fill after building entries.
  const withShas: SkeletonFileEntry[] = await Promise.all(
    skeleton.map(async (entry) => ({ ...entry, sha256: await sha256(entry.content) })),
  );

  // createPlanSha256 is computed over the plan WITHOUT the key itself (same as Python).
  const plan: CreatePlan = {
    recipe: recipeId,
    recipeLockSha256: lockSha,
    manifest,
    skeleton: withShas,
    createPlanSha256: '',
  };
  const { createPlanSha256: _omit, ...planWithoutSha } = plan;

  // Python: json.dumps(plan, sort_keys=True, separators=(",",":"), ensure_ascii=False), NFC, sha256.
  plan.createPlanSha256 = await sha256(canonicalJson(planWithoutSha));

  return plan;
}
