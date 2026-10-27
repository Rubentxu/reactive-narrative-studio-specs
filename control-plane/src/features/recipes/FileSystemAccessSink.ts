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

  // Write each skeleton file — RENDERED content from the plan (PR-2, M10.2.1);
  // falls back to the caller-provided map only for plans without content.
  // Skeleton paths may span directories, so each parent segment is resolved
  // (created on demand) before the file itself: the File System Access API
  // takes a file NAME, never a path.
  for (const entry of plan.skeleton) {
    const content = entry.content ?? skeletonContents[entry.path] ?? '';
    const segments = entry.path.split('/').filter((part) => part.length > 0);
    const fileName = segments.pop()!;
    let scope = dirHandle;
    for (const directory of segments) {
      scope = await scope.getDirectoryHandle(directory, { create: true });
    }
    const handle = await scope.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    // Normalize line endings to LF, UTF-8
    const normalized = content.replace(/\r\n/g, '\n');
    await writable.write(normalized);
    await writable.close();
    const sha = await sha256(normalized);
    written.push({ path: entry.path, sha256: sha });
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
