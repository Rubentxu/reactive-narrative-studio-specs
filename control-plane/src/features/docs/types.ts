/**
 * DocTab types for the docs feature extension.
 * These types define the document reference model used by the docs feature.
 */

/**
 * Unique identifier for a document.
 */
export type DocId = string;

/**
 * Reference to a document, stored as a path relative to the docs/ directory.
 * Example: "narrative.md", "characters/nora-backstory.md"
 */
export type DocRef = string;

/**
 * A loaded document page containing the markdown content.
 */
export interface DocPage {
  readonly docRef: DocRef;
  readonly content: string;
}
