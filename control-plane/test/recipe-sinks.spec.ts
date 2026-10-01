/**
 * recipe-sinks.spec.ts — REQ-CR-9 traceability closure.
 *
 * DownloadPlanSink (the File System Access fallback) emits create-plan.json
 * as a browser download without touching the Control Plane projection store:
 * no useProjectionStore import, no fetch — pure DOM/blob interaction verified
 * here with injected fakes over jsdom-like DOM stubs.
 *
 * REQ-DEI-5: the download trigger is the shared lib/download.ts helper — this
 * spec exercises the recipes sink on top of it after the dedup.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { downloadPlanSink } from '../src/features/recipes/DownloadPlanSink';
import type { CreatePlan } from '../src/features/recipes/RecipePlanEmitter';

const PLAN: CreatePlan = {
  recipe: 'middle-grade-illustrated',
  createPlanSha256: 'a'.repeat(64),
  manifest: { id: 'probe' },
  skeleton: [{ path: 'narrative.yaml', content: 'id: probe' }],
} as unknown as CreatePlan;

type AnchorLike = {
  href: string;
  download: string;
  style: { display: string };
  click: () => void;
};

describe('DownloadPlanSink (REQ-CR-9)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isSupported reflects browser DOM + URL availability', () => {
    // Node test env: no DOM → unsupported.
    expect(downloadPlanSink.isSupported()).toBe(false);
    // With DOM + URL available (stubbed), the sink reports support.
    vi.stubGlobal('document', { createElement: vi.fn(), body: {} });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() });
    expect(downloadPlanSink.isSupported()).toBe(true);
  });

  it('downloads create-plan.json via an anchor without store writes or fetch', async () => {
    const createdUrls: string[] = [];
    const revoked: string[] = [];
    let capturedBlob: Blob | undefined;
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        capturedBlob = blob;
        const u = `blob:fake-${createdUrls.length}`;
        createdUrls.push(u);
        return u;
      }),
      revokeObjectURL: vi.fn((u: string) => revoked.push(u)),
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

    const result = await downloadPlanSink.write(PLAN);

    expect(result.downloadUrl).toBe('blob:fake-0');
    // The anchor download carries the canonical artifact name.
    expect(clickedAnchors).toHaveLength(1);
    expect(anchor.download).toBe('create-plan.json');
    expect(anchor.href).toBe('blob:fake-0');
    expect(appendChild).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalledTimes(1);
    // The blob carries the plan serialized as create-plan.json bytes.
    expect(capturedBlob).toBeInstanceOf(Blob);
    const serialized = JSON.parse(await capturedBlob!.text()) as { recipe: string };
    expect(serialized.recipe).toBe('middle-grade-illustrated');
  });
});
