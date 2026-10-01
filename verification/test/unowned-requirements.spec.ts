import { describe, expect, it } from 'vitest';
import { findUnownedRequirements } from '../src/traceability/build.ts';
import type { MilestoneRecord } from '../src/traceability/build.ts';

// Requirements: REQ-DEI-8 — silent-drop guard: a harvested requirement that
// belongs to no milestone must surface as a gap (the M11 / REQ-DOC-3/4 /
// REQ-DEI defect class), never vanish from the inventory without a trace.
describe('findUnownedRequirements (REQ-DEI-8)', () => {
  const milestone = (id: string, reqIds: string[]): MilestoneRecord =>
    ({
      id,
      uats: [],
      requirements: reqIds.map((id2) => ({ id: id2, sources: [], scenarios: [], testRefs: [], status: 'MAPPED' })),
    }) as unknown as MilestoneRecord;

  it('returns harvested-but-unowned requirements sorted, with their sources', () => {
    const reqSources = new Map<string, string[]>([
      ['REQ-M11-1', ['m11/spec.md']],
      ['REQ-DEI-1', ['debt/spec.md', 'debt/design.md']],
      ['REQ-M17-1', ['m17/spec.md']],
    ]);
    const milestones = [milestone('M11', ['REQ-M11-1']), milestone('M17', ['REQ-M17-1'])];
    const result = findUnownedRequirements(reqSources, milestones);
    expect(result).toEqual([{ reqId: 'REQ-DEI-1', sources: ['debt/spec.md', 'debt/design.md'] }]);
  });

  it('empty when every harvested requirement is owned by some milestone', () => {
    const reqSources = new Map<string, string[]>([['REQ-A-1', ['a/spec.md']]]);
    const milestones = [milestone('M17', ['REQ-A-1'])];
    expect(findUnownedRequirements(reqSources, milestones)).toEqual([]);
  });

  it('empty when nothing was harvested', () => {
    expect(findUnownedRequirements(new Map(), [milestone('M17', [])])).toEqual([]);
  });
});
