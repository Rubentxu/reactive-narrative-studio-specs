/**
 * DocTab types for the docs feature extension.
 * These types define the document reference model used by the docs feature.
 *
 * DocEntry shape matches REQ-LOA-2: { path: string, body: string }.
 * Re-exported from SnapshotProjectSource for convenience.
 */

import type { DocEntry as LoaderDocEntry } from '../../loader/SnapshotProjectSource';

// Re-export so consumers can import from one place
export type { LoaderDocEntry as DocEntry };

/**
 * A loaded document page containing the markdown content.
 * DocPage shape: { docRef: path, content: body }.
 */
export interface DocPage {
  readonly docRef: string;
  readonly content: string;
}
