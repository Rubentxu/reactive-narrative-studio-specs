// @vitest-environment jsdom
/**
 * decisions-view.spec.ts — /decisions view tests (M17 write-capable CP).
 *
 * Requirements: REQ-M17-7 (/decisions view lists decisions, prefills the
 * composer, store round-trip no-op), REQ-M17-5 (invalid records never reach
 * the outbound sink — submit gating).
 *
 * - Round-trip no-op: after loading the snapshot-valid bundle, mounting the
 *   Decisions view must leave useProjectionStore.getState() deep-equal (the
 *   view is read-only; the store round-trip is the executable oracle).
 * - Rendering: 3 decision rows (silver-key, nora-arc, iron-door) with their
 *   statuses from the golden cp-decisions.json projection.
 * - Row action prefill: clicking decision-nora-arc-approve prefills the
 *   command composer with the nora-arc targetRef/subjectDecision/kind.
 * - Invalid-input gating: a comment with empty text renders the validation
 *   error list and never reaches a command sink (no write result rendered).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useProjectionStore } from '../src/store/projectionStore';
import { SnapshotProjectSource } from '../src/loader/SnapshotProjectSource';
import { Decisions } from '../src/views/Decisions';
import { buildCommandRecord } from '../src/features/decisions/record';
import { validateCommandRecord } from '../src/features/decisions/validate';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const GOLDEN_ROOT = resolve(process.cwd(), '../golden/control-plane');

function newFileListFromDir(relativeDir: string): File[] {
  const fullDir = join(GOLDEN_ROOT, relativeDir);
  const entries = readdirSync(fullDir, { recursive: true });
  return entries
    .filter((f): f is string => typeof f === 'string')
    .filter((f) => f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.md'))
    .map((f) => {
      const bytes = readFileSync(join(fullDir, f));
      return new File([bytes as BlobPart], f);
    });
}

async function loadSnapshotValid(): Promise<void> {
  useProjectionStore.getState().reset();
  const source = new SnapshotProjectSource(newFileListFromDir('snapshot-valid'));
  await useProjectionStore.getState().loadFrom(source, 'snapshot-valid');
  expect(useProjectionStore.getState().status).toBe('loaded');
}

/** The prefill composer is the FIRST CommandComposer in the view. */
function prefillComposer(): { kind: HTMLSelectElement; targetRef: HTMLInputElement; subjectDecision: HTMLInputElement; submit: HTMLButtonElement } {
  return {
    kind: screen.getAllByTestId('command-kind')[0] as HTMLSelectElement,
    targetRef: screen.getAllByTestId('command-target-ref')[0] as HTMLInputElement,
    subjectDecision: screen.getAllByTestId('command-subject-decision')[0] as HTMLInputElement,
    submit: screen.getAllByTestId('command-submit')[0] as HTMLButtonElement,
  };
}

describe('Decisions view (M17)', () => {
  afterEach(() => {
    cleanup();
    useProjectionStore.getState().reset();
  });

  describe('round-trip no-op', () => {
    it('useProjectionStore.getState() is deep-equal before and after mounting the Decisions view', async () => {
      await loadSnapshotValid();

      const snapshotBefore = JSON.parse(JSON.stringify(useProjectionStore.getState()));
      render(<Decisions />);
      const snapshotAfter = JSON.parse(JSON.stringify(useProjectionStore.getState()));

      expect(snapshotAfter).toEqual(snapshotBefore);
    });
  });

  describe('rendering', () => {
    beforeEach(async () => {
      await loadSnapshotValid();
      render(<Decisions />);
    });

    it('renders the 3 golden decision rows with their statuses', () => {
      expect(screen.getByTestId('decisions-count').textContent).toBe('3');
      expect(screen.getByTestId('decision-row-silver-key')).toBeTruthy();
      expect(screen.getByTestId('decision-row-nora-arc')).toBeTruthy();
      expect(screen.getByTestId('decision-row-iron-door')).toBeTruthy();
      expect(screen.getByTestId('decision-status-silver-key').textContent).toBe('accepted');
      expect(screen.getByTestId('decision-status-nora-arc').textContent).toBe('pending');
      expect(screen.getByTestId('decision-status-iron-door').textContent).toBe('rejected');
    });

    it('clicking decision-nora-arc-approve prefills the composer', () => {
      fireEvent.click(screen.getByTestId('decision-nora-arc-approve'));
      const composer = prefillComposer();
      expect(composer.kind.value).toBe('approve');
      expect(composer.targetRef.value).toBe('Character:demo/nora');
      expect(composer.subjectDecision.value).toBe('nora-arc');
    });

    it('comment with empty text is gated: validation error renders, no write happens', () => {
      const composer = prefillComposer();
      fireEvent.change(composer.kind, { target: { value: 'comment' } });
      // text left empty
      fireEvent.click(composer.submit);

      expect(screen.queryByTestId('command-validation-error')).not.toBeNull();
      // No sink side effect anywhere: neither composer reached the write path.
      expect(screen.queryAllByTestId('command-write-result')).toHaveLength(0);
      expect(screen.queryAllByTestId('command-record-json')).toHaveLength(0);
    });

    it('empty-text comment also fails the validateCommandRecord unit boundary', () => {
      const record = buildCommandRecord({
        command: 'comment',
        targetRef: 'Scene:demo/scene-silver-key',
        payload: { text: '' },
        id: 'cmd-view-gate',
        now: () => '2026-01-01T00:00:00Z',
      });
      const errors = validateCommandRecord(record);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
