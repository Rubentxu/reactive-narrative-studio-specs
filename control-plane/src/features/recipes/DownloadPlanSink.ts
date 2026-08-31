/**
 * DownloadPlanSink — browser download fallback for Firefox/Safari.
 *
 * REQ-CR-9: Fallback when File System Access API (showDirectoryPicker) is unavailable.
 * Emits create-plan.json as a browser download via URL.createObjectURL + <a download>.
 *
 * NEVER imports useProjectionStore — no state changes.
 */

import type { CreatePlan } from './RecipePlanEmitter';

export interface DownloadResult {
  downloadUrl: string;
}

export interface DownloadPlanSink {
  isSupported(): boolean;
  /**
   * Download the create-plan.json as a file.
   * Returns a temporary URL for the download.
   */
  write(plan: CreatePlan): Promise<DownloadResult>;
}

function isSupported(): boolean {
  return typeof document !== 'undefined' && typeof URL !== 'undefined';
}

function write(plan: CreatePlan): Promise<DownloadResult> {
  const json = JSON.stringify(plan, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Trigger download
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'create-plan.json';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoke after a short delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  return Promise.resolve({ downloadUrl: url });
}

export const downloadPlanSink: DownloadPlanSink = {
  isSupported,
  write,
};
