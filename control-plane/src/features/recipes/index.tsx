/**
 * recipes feature — registers the RecipeWidgetExtension against the Extension Registry.
 *
 * Extension kind: 'wizard' — app-level wizard at /create route.
 * Not bound to any entity (no predicate needed).
 */

import { registerRecipeWizard } from '../../extensions/registry';
import { CreateWizard } from './CreateWizard';

// Register the recipe wizard extension
registerRecipeWizard({
  apiVersion: 'control-plane.extensions/v1',
  id: 'create-wizard',
  kind: 'wizard',
  priority: 100,
  render: () => <CreateWizard />,
});

export { CreateWizard };
export { loadRecipeBundle } from './useRecipeLoader';
export { emitPlan } from './RecipePlanEmitter';
export { fileSystemAccessSink } from './FileSystemAccessSink';
export { downloadPlanSink } from './DownloadPlanSink';
