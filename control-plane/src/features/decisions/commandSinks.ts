/**
 * CommandSinks — outbound writers for decision-command records (M17).
 *
 * Mirrors the recipes sink pair (FileSystemAccessSink / DownloadPlanSink):
 * prefer the File System Access API when the browser exposes the directory
 * picker, otherwise fall back to a browser download. Records are written as
 * SINGLE-LINE JSON (no indentation) so each file is one grep-able row.
 *
 * NEVER imports the projection store — writes ONLY the user-selected
 * directory or a download. No network I/O.
 */

import type { CommandRecord } from './types';
import { triggerDownload } from '../../lib/download';

export interface CommandWriteResult {
  fileName: string;
  mode: 'file-system-access' | 'download';
}

export interface CommandSink {
  /** Check whether this sink can run in the current environment. */
  isSupported(): boolean;
  /** Write a single command record. */
  write(record: CommandRecord): Promise<CommandWriteResult>;
}

function fsaIsSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

async function fsaWrite(record: CommandRecord): Promise<CommandWriteResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
  const commandsDir = await dirHandle.getDirectoryHandle('commands', { create: true });
  const fileHandle = await commandsDir.getFileHandle(`${record.id}.json`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(record));
  await writable.close();
  return { fileName: `commands/${record.id}.json`, mode: 'file-system-access' };
}

export const fileSystemAccessCommandSink: CommandSink = {
  isSupported: fsaIsSupported,
  write: fsaWrite,
};

function downloadIsSupported(): boolean {
  return typeof document !== 'undefined';
}

function downloadWrite(record: CommandRecord): Promise<CommandWriteResult> {
  const json = JSON.stringify(record);
  triggerDownload(json, `${record.id}.json`, 'application/json');
  return Promise.resolve({ fileName: `${record.id}.json`, mode: 'download' });
}

export const downloadCommandSink: CommandSink = {
  isSupported: downloadIsSupported,
  write: downloadWrite,
};
