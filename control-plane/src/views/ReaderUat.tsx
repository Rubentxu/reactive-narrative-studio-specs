/**
 * ReaderUat view — host for the anonymized human-reader feedback form at
 * /reader-uat (M11, UAT-M11-01). Renders the registered reader-feedback
 * extension; falls back to the direct component if no extension is registered.
 */

import { extensionRegistry } from '../extensions/registry';
import '../features/human-reader';
import { ReaderFeedbackForm } from '../features/human-reader/ReaderFeedbackForm';

export function ReaderUat() {
  const extension = extensionRegistry.resolveReaderFeedback();
  if (extension) return extension.render();
  return <ReaderFeedbackForm />;
}
