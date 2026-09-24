/**
 * EPUB publishing types (M15, docs/14-PUBLISHING.md).
 *
 * Two experimental export targets over existing sources:
 * - reflowable: prose chapters from the ChapterManuscript (M12 authoring
 *   surface) — readers reflow the text, dialogue is real text.
 * - fixed-layout: pre-paginated pages embedding the comic renderer's layered
 *   SVG pages (M13/M14) — lettering stays editable SVG text, never raster.
 *
 * validate.ts is the deterministic validation adapter implementing the
 * reader-entry contract (what reference readers check when opening an EPUB).
 */

export type EpubVariant = 'reflowable' | 'fixed-layout';

export interface EpubMetadata {
  title: string;
  language: string;
  /** Stable unique identifier (e.g. a URN) for the publication. */
  identifier: string;
  author?: string;
  /** ISO-8601 last-modified timestamp; defaults to a fixed epoch for determinism. */
  modifiedISO?: string;
}

export interface ValidationFinding {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  /** Zip entry or OPF path the finding refers to, when applicable. */
  path?: string;
}

export interface ValidationResult {
  ok: boolean;
  findings: ValidationFinding[];
}
