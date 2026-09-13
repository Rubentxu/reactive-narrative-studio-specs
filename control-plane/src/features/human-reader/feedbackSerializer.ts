/**
 * feedbackSerializer — pure JSONL round-report serialization (M11, REQ-M11-2).
 *
 * One JSON line per feedback entry; no I/O, no browser APIs — unit-testable.
 */

import { MAX_FREE_TEXT_HIGHLIGHTS, type FeedbackEntry } from './types.ts';

export const FEEDBACK_SCHEMA = 'human-reader-uat/feedback/v1';

export interface EntryInput {
  roundId: string;
  readerId: string;
  ageBracket?: FeedbackEntry['ageBracket'];
  engagement?: FeedbackEntry['engagement'];
  likert?: FeedbackEntry['likert'];
  freeTextHighlights?: string[];
  revisionImpact?: FeedbackEntry['revisionImpact'];
  manuscriptRevision?: string;
  submittedAt?: string;
}

/**
 * Build a canonical entry. Every field except the anonymous ids and the
 * timestamp is optional — a completely empty form still yields a valid entry
 * (UAT-M11-01: no PII field is required).
 */
export function buildEntry(input: EntryInput, now: () => string = () => new Date().toISOString()): FeedbackEntry {
  const entry: FeedbackEntry = {
    schema: FEEDBACK_SCHEMA,
    source: 'human-reader',
    roundId: input.roundId,
    readerId: input.readerId,
    submittedAt: input.submittedAt ?? now(),
  };
  if (input.ageBracket) entry.ageBracket = input.ageBracket;
  if (input.engagement) entry.engagement = input.engagement;
  if (input.likert && Object.keys(input.likert).length > 0) entry.likert = { ...input.likert };
  if (input.freeTextHighlights && input.freeTextHighlights.length > 0) {
    entry.freeTextHighlights = input.freeTextHighlights.slice(0, MAX_FREE_TEXT_HIGHLIGHTS);
  }
  if (input.revisionImpact) entry.revisionImpact = input.revisionImpact;
  if (input.manuscriptRevision && input.manuscriptRevision.trim().length > 0) {
    entry.manuscriptRevision = input.manuscriptRevision.trim();
  }
  return entry;
}

/** One JSONL line (no trailing newline). */
export function serializeEntry(entry: FeedbackEntry): string {
  return JSON.stringify(entry);
}

/** Round report: one line per entry, newline-terminated. */
export function roundReportToJsonl(entries: FeedbackEntry[]): string {
  return entries.map(serializeEntry).join('\n') + (entries.length > 0 ? '\n' : '');
}

export function parseJsonl(jsonl: string): FeedbackEntry[] {
  return jsonl
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as FeedbackEntry);
}
