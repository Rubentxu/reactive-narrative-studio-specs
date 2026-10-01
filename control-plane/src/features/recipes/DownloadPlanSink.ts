/**
 * DownloadPlanSink — browser download fallback for Firefox/Safari.
 *
 * REQ-CR-9: Fallback when File System Access API (showDirectoryPicker) is unavailable.
 * Emits create-plan.json as a browser download through the shared
 * triggerDownload helper (src/lib/download.ts).
 *
 * NEVER imports useProjectionStore — no state changes.
 */

import type { CreatePlan } from './RecipePlanEmitter';
import { triggerDownload } from '../../lib/download';

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
  const url = triggerDownload(json, 'create-plan.json', 'application/json');
  return Promise.resolve({ downloadUrl: url });
}

export const downloadPlanSink: DownloadPlanSink = {
  isSupported,
  write,
};
