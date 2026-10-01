/**
 * decisions-command-sinks.spec.ts — outbound command sink tests (M17).
 *
 * Mirrors recipe-sinks.spec.ts: the File System Access command sink walks the
 * directory-handle chain and writes single-line JSON; the download command
 * sink emits the record via URL.createObjectURL + <a download>. Both write
 * ONLY the record — no projection store access, no fetch (purity asserted by
 * reading the feature sources below).
 *
 * Requirements: REQ-M17-6 (filesystem write path: FSA preferred, download
 * fallback), REQ-M17-8 (no persistent backend: purity/no-fetch).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  fileSystemAccessCommandSink,
  downloadCommandSink,
} from '../src/features/decisions/commandSinks';
import { buildCommandRecord } from '../src/features/decisions/record';
import type { CommandRecord } from '../src/features/decisions/types';

const RECORD: CommandRecord = buildCommandRecord({
  command: 'approve',
  targetRef: 'Scene:demo/scene-silver-key',
  payload: { subjectDecision: 'silver-key', rationale: 'Anchors the act-1 gate.' },
  id: 'cmd-test-001',
  now: () => '2026-01-01T00:00:00Z',
});

type AnchorLike = {
  href: string;
  download: string;
  style: { display: string };
  click: () => void;
};

describe('command sinks (M17)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('fileSystemAccessCommandSink', () => {
    it('isSupported reflects window.showDirectoryPicker availability', () => {
      // Node test env: no window → unsupported.
      expect(fileSystemAccessCommandSink.isSupported()).toBe(false);
      // With a window exposing the picker, the sink reports support.
      vi.stubGlobal('window', { showDirectoryPicker: vi.fn() });
      expect(fileSystemAccessCommandSink.isSupported()).toBe(true);
    });

    it('writes commands/<id>.json into a "commands" subdirectory as single-line JSON', async () => {
      const writable = {
        write: vi.fn(),
        close: vi.fn(),
      };
      const fileHandle = {
        createWritable: vi.fn(() => Promise.resolve(writable)),
      };
      const commandsDir = {
        getFileHandle: vi.fn(() => Promise.resolve(fileHandle)),
      };
      const dirHandle = {
        getDirectoryHandle: vi.fn(() => Promise.resolve(commandsDir)),
      };
      vi.stubGlobal('window', {
        showDirectoryPicker: vi.fn(() => Promise.resolve(dirHandle)),
      });

      const result = await fileSystemAccessCommandSink.write(RECORD);

      expect(result).toEqual({ fileName: 'commands/cmd-test-001.json', mode: 'file-system-access' });
      expect(dirHandle.getDirectoryHandle).toHaveBeenCalledWith('commands', { create: true });
      expect(commandsDir.getFileHandle).toHaveBeenCalledWith('cmd-test-001.json', { create: true });
      expect(fileHandle.createWritable).toHaveBeenCalledTimes(1);
      expect(writable.write).toHaveBeenCalledTimes(1);
      expect(writable.close).toHaveBeenCalledTimes(1);

      const payload = writable.write.mock.calls[0]![0] as string;
      expect(payload).not.toContain('\n');
      expect(JSON.parse(payload)).toEqual(RECORD);
    });
  });

  describe('downloadCommandSink', () => {
    it('isSupported reflects DOM availability', () => {
      // Node test env: no document → unsupported.
      expect(downloadCommandSink.isSupported()).toBe(false);
      vi.stubGlobal('document', { createElement: vi.fn(), body: {} });
      expect(downloadCommandSink.isSupported()).toBe(true);
    });

    it('downloads <id>.json via an anchor carrying the single-line record', async () => {
      const createdUrls: string[] = [];
      let capturedBlob: Blob | undefined;
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn((blob: Blob) => {
          capturedBlob = blob;
          const u = `blob:fake-${createdUrls.length}`;
          createdUrls.push(u);
          return u;
        }),
        revokeObjectURL: vi.fn(),
      });

      const clickedAnchors: AnchorLike[] = [];
      const anchor: AnchorLike = {
        href: '',
        download: '',
        style: { display: '' },
        click() {
          clickedAnchors.push(anchor);
        },
      };
      const appendChild = vi.fn();
      const removeChild = vi.fn();
      vi.stubGlobal('document', {
        createElement: vi.fn(() => anchor),
        body: { appendChild, removeChild },
      });

      const result = await downloadCommandSink.write(RECORD);

      expect(result).toEqual({ fileName: 'cmd-test-001.json', mode: 'download' });
      expect(clickedAnchors).toHaveLength(1);
      expect(anchor.download).toBe('cmd-test-001.json');
      expect(anchor.href).toBe('blob:fake-0');
      expect(appendChild).toHaveBeenCalledTimes(1);
      expect(removeChild).toHaveBeenCalledTimes(1);

      expect(capturedBlob).toBeInstanceOf(Blob);
      const serialized = await capturedBlob!.text();
      expect(serialized).not.toContain('\n');
      expect(JSON.parse(serialized)).toEqual(RECORD);
    });
  });

  describe('feature purity', () => {
    it('features/decisions sources contain no fetch and no projection store import', () => {
      const featureDir = resolve(__dirname, '../src/features/decisions');
      const sources = readdirSync(featureDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
      expect(sources.length).toBeGreaterThan(0);
      for (const file of sources) {
        const text = readFileSync(join(featureDir, file), 'utf8');
        expect(text, `${file} must not call fetch`).not.toContain('fetch(');
        expect(text, `${file} must not touch the projection store`).not.toContain('useProjectionStore');
      }
    });
  });
});
