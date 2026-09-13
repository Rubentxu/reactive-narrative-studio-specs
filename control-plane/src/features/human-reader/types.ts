/**
 * Human reader UAT feedback types (M11, UAT-M11-01).
 *
 * ADR-019: human-reader feedback is stored separately from synthetic-reader
 * output — the `source: 'human-reader'` marker makes the separation explicit in
 * every exported artifact.
 */

export type AgeBracket = 'child' | 'middle_grade' | 'ya' | 'adult' | 'undisclosed';
export type Engagement = 'cover_to_cover' | 'selected_chapters' | 'first_chapter';
export type RevisionImpact = 'none' | 'minor' | 'major' | 'blocker';
export type LikertDimension = 'pacing' | 'clarity' | 'emotional_impact' | 'age_appropriateness';
export type LikertValue = 1 | 2 | 3 | 4 | 5;

export interface FeedbackEntry {
  schema: 'human-reader-uat/feedback/v1';
  /** ADR-019 separation marker: never conflated with synthetic reader panels. */
  source: 'human-reader';
  roundId: string;
  /** Anonymous session-scoped id (hex). No PII is ever collected. */
  readerId: string;
  ageBracket?: AgeBracket;
  engagement?: Engagement;
  likert?: Partial<Record<LikertDimension, LikertValue>>;
  freeTextHighlights?: string[];
  revisionImpact?: RevisionImpact;
  /** Links the report to the manuscript revision decision context (free text). */
  manuscriptRevision?: string;
  submittedAt: string;
}

export const LIKERT_DIMENSIONS: ReadonlyArray<LikertDimension> = [
  'pacing',
  'clarity',
  'emotional_impact',
  'age_appropriateness',
];

export const MAX_FREE_TEXT_HIGHLIGHTS = 10;
