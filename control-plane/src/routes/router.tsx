import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router';
import { SourcePicker } from '../app/SourcePicker';
import { Overview } from '../views/Overview';
import { Story } from '../views/Story';
import { Visual } from '../views/Visual';
import { QA } from '../views/QA';
import { History } from '../views/History';
import { Search } from '../views/Search';
import { Catalog } from '../views/Catalog';
import { EntityPage } from '../views/EntityPage';
import { Create } from '../views/Create';

// Capability catalog views
import { CapabilitiesOverview } from '../features/capability-catalog/views/Overview';
import { KindList } from '../features/capability-catalog/views/KindList';
import { CapabilityDetail } from '../features/capability-catalog/views/CapabilityDetail';

const rootRoute = createRootRoute({ component: SourcePicker });

// Existing routes
const overviewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/overview', component: Overview });
const storyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/story', component: Story });
const visualRoute = createRoute({ getParentRoute: () => rootRoute, path: '/visual', component: Visual });
const qaRoute = createRoute({ getParentRoute: () => rootRoute, path: '/qa', component: QA });
const historyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/history', component: History });
const searchRoute = createRoute({ getParentRoute: () => rootRoute, path: '/search', component: Search });
const catalogRoute = createRoute({ getParentRoute: () => rootRoute, path: '/catalog', component: Catalog });
const entityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entity/$kind/$namespace/$name',
  component: EntityPage,
});
const createWizardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/create', component: Create });

// Capability catalog routes
const capabilitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/capabilities',
  component: CapabilitiesOverview,
});
const capabilitiesSkillsRoute = createRoute({
  getParentRoute: () => capabilitiesRoute,
  path: '/skills',
  component: () => <KindList kind="skill" />,
});
const capabilitiesPacksRoute = createRoute({
  getParentRoute: () => capabilitiesRoute,
  path: '/packs',
  component: () => <KindList kind="pack" />,
});
const capabilitiesProfilesRoute = createRoute({
  getParentRoute: () => capabilitiesRoute,
  path: '/profiles',
  component: () => <KindList kind="profile" />,
});
const capabilitiesWorkflowsRoute = createRoute({
  getParentRoute: () => capabilitiesRoute,
  path: '/workflows',
  component: () => <KindList kind="workflow" />,
});
const capabilitiesProvidersRoute = createRoute({
  getParentRoute: () => capabilitiesRoute,
  path: '/providers',
  component: () => <KindList kind="provider" />,
});
const capabilitiesRecipesRoute = createRoute({
  getParentRoute: () => capabilitiesRoute,
  path: '/recipes',
  component: () => <KindList kind="recipe" />,
});
const capabilityDetailRoute = createRoute({
  getParentRoute: () => capabilitiesRoute,
  path: '/$kind/$namespace/$name',
  component: CapabilityDetail,
});

const routeTree = rootRoute.addChildren([
  overviewRoute,
  storyRoute,
  visualRoute,
  qaRoute,
  historyRoute,
  searchRoute,
  catalogRoute,
  entityRoute,
  createWizardRoute,
  // Capability catalog routes
  capabilitiesRoute,
  capabilitiesSkillsRoute,
  capabilitiesPacksRoute,
  capabilitiesProfilesRoute,
  capabilitiesWorkflowsRoute,
  capabilitiesProvidersRoute,
  capabilitiesRecipesRoute,
  capabilityDetailRoute,
]);
export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router; }
}
