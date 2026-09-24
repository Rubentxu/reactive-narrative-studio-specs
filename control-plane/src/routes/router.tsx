import { createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
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
import { Home } from '../views/Home';
import { ReaderUat } from '../views/ReaderUat';
import { Storyboard } from '../views/Storyboard';

// Capability catalog views
import { CapabilitiesOverview } from '../features/capability-catalog/views/Overview';
import { KindList } from '../features/capability-catalog/views/KindList';
import { CapabilityDetail } from '../features/capability-catalog/views/CapabilityDetail';

// Root layout: SourcePicker remains the project-loading surface, but child
// routes (e.g. /create) only mount through <Outlet/> (PR-6, M10.2.1 audit).
const rootRoute = createRootRoute({
  component: () => (
    <>
      <SourcePicker />
      <Outlet />
    </>
  ),
});

// Existing routes
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/home', component: Home });
const readerUatRoute = createRoute({ getParentRoute: () => rootRoute, path: '/reader-uat', component: ReaderUat });
const storyboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/storyboard', component: Storyboard });
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

// Capability catalog routes.
// PR-7 (M10.2.1 baseline audit): /capabilities is a LAYOUT route — without an
// <Outlet/> here the six kind pages and the detail route never mounted in the
// built app (caught by SCN-M10-02-001). The overview is now the index route.
const capabilitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/capabilities',
  component: () => <Outlet />,
});
const capabilitiesIndexRoute = createRoute({
  getParentRoute: () => capabilitiesRoute,
  path: '/',
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
  homeRoute,
  readerUatRoute,
  storyboardRoute,
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
  capabilitiesIndexRoute,
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
