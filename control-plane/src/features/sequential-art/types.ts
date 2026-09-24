/**
 * Sequential Art Core types (M12, docs/11-SEQUENTIAL-ART-IR.md).
 *
 * The adapter consumes a chapter reduced to typed BEATS (authoring contract);
 * prose-to-beat extraction is a future skill, not part of this module.
 */

export type BeatKind = 'establishing' | 'action' | 'dialogue' | 'reaction' | 'reveal' | 'transition';
export type ReadingDirection = 'ltr' | 'rtl' | 'vertical';
export type SpeechKind = 'speech' | 'thought' | 'caption' | 'sfx';

export interface BeatDialogue {
  speaker: string;
  /** Verbatim editable text — lettering stays out of generated images (doc 11). */
  text: string;
  kind?: SpeechKind;
}

export interface ChapterBeat {
  id: string;
  /** Narrative IR scene reference when the beat belongs to a structured scene. */
  sceneId?: string;
  kind: BeatKind;
  characters?: string[];
  /** Panel action / framing description; becomes the panel caption. */
  description: string;
  dialogue?: BeatDialogue[];
  /** Beat importance 0..1 (drives the graph lens visual weight). */
  importance?: number;
}

export interface ChapterScene {
  id: string;
  beats: ChapterBeat[];
}

export interface ChapterManuscript {
  chapterId: string;
  title: string;
  readingDirection: ReadingDirection;
  scenes: ChapterScene[];
}

/** Subset of the committed sequential-ir schema the adapter emits/validates. */
export interface SequentialSpeechBubble {
  speaker?: string;
  text: string;
  kind?: SpeechKind;
}

export interface SequentialPanel {
  id: string;
  shotRef: string;
  caption?: string;
  speech?: SequentialSpeechBubble[];
  gutterAfter?: 'none' | 'small' | 'medium' | 'large' | 'scene-break';
}

export interface SequentialPage {
  id: string;
  panels: SequentialPanel[];
  layout?: { rows?: number; columns?: number; template?: 'grid' | 'splash' | 'asymmetric' | 'modular' };
}

export interface SequentialIrDoc {
  schema: 'sequential-ir/v1';
  version: '1.0';
  pages: SequentialPage[];
}
