/**
 * human-reader feature barrel (M11) — registers the anonymized reader feedback
 * form as an app-level extension and exposes its components.
 */

import { registerReaderFeedback } from '../../extensions/registry';
import { ReaderFeedbackForm } from './ReaderFeedbackForm';

registerReaderFeedback({
  apiVersion: 'control-plane.extensions/v1',
  id: 'human-reader.anonymized-feedback-form',
  kind: 'reader-feedback',
  priority: 10,
  render: () => <ReaderFeedbackForm />,
});

export { ReaderFeedbackForm } from './ReaderFeedbackForm';
export type { FeedbackEntry } from './types';
export { buildEntry, roundReportToJsonl, parseJsonl } from './feedbackSerializer';
export { getOrCreateReaderId, newRoundId } from './readerId';
