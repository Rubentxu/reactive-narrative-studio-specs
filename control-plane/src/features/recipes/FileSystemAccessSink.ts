/**
 * FileSystemAccessSink — write project tree via Chromium File System Access API.
 *
 * REQ-CR-8: Uses window.showDirectoryPicker() to get a user-granted directory handle,
 * then writes each skeleton file via getFileHandle().createWritable().
 *
 * NEVER imports useProjectionStore — writes ONLY to the user-selected handle.
 * Requires explicit user grant per session (detected via 'showDirectoryPicker' in window).
 */

import type { CreatePlan } from './RecipePlanEmitter';

export interface WriteResult {
  written: Array<{ path: string; sha256: string }>;
  createPlanSha256: string;
}

export interface FileSystemAccessSink {
  /** Check if File System Access API is available. */
  isSupported(): boolean;
  /**
   * Write a create-plan to the user-selected directory.
   * Shows directory picker to user, writes all skeleton files, then .narrative/create-plan.json.
   */
  write(plan: CreatePlan, skeletonContents: Record<string, string>): Promise<WriteResult>;
}

function isSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

async function write(
  plan: CreatePlan,
  skeletonContents: Record<string, string>,
): Promise<WriteResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });

  const written: Array<{ path: string; sha256: string }> = [];

  // Write each skeleton file
  for (const [path, content] of Object.entries(skeletonContents)) {
    const handle = await dirHandle.getFileHandle(path, { create: true });
    const writable = await handle.createWritable();
    // Normalize line endings to LF, UTF-8
    const normalized = content.replace(/\r\n/g, '\n');
    await writable.write(normalized);
    await writable.close();
    const sha = await sha256(content);
    written.push({ path, sha256: sha });
  }

  // Write .narrative/create-plan.json
  const narrativeDir = await dirHandle.getDirectoryHandle('.narrative', { create: true });
  const planHandle = await narrativeDir.getFileHandle('create-plan.json', { create: true });
  const planWritable = await planHandle.createWritable();
  const planJson = JSON.stringify(plan, null, 2);
  await planWritable.write(planJson);
  await planWritable.close();

  return { written, createPlanSha256: plan.createPlanSha256 };
}

async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const buf = await crypto.subtle.digest('SHA-256', data);
  const arr = new Uint8Array(buf);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const fileSystemAccessSink: FileSystemAccessSink = {
  isSupported,
  write,
};
