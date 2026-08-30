import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router';
import { SourcePicker } from '../app/SourcePicker';
import { Overview } from '../views/Overview';
import { Story } from '../views/Story';
import { Visual } from '../views/Visual';
import { QA } from '../views/QA';
import { History } from '../views/History';

const rootRoute = createRootRoute({ component: SourcePicker });
const overviewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/overview', component: Overview });
const storyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/story', component: Story });
const visualRoute = createRoute({ getParentRoute: () => rootRoute, path: '/visual', component: Visual });
const qaRoute = createRoute({ getParentRoute: () => rootRoute, path: '/qa', component: QA });
const historyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/history', component: History });

const routeTree = rootRoute.addChildren([overviewRoute, storyRoute, visualRoute, qaRoute, historyRoute]);
export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router; }
}
