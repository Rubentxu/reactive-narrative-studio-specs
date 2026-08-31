// D7 boundary: router and views read the Zustand projectionStore for state
export const routePaths = [
  "path: '/'",
  "path: '/overview'",
  "path: '/story'",
  "path: '/visual'",
  "path: '/qa'",
  "path: '/history'",
  "path: '/search'",
  "path: '/create'",
  // Capability catalog routes (m10.2)
  "path: '/capabilities'",
  "path: '/capabilities/skills'",
  "path: '/capabilities/packs'",
  "path: '/capabilities/profiles'",
  "path: '/capabilities/workflows'",
  "path: '/capabilities/providers'",
  "path: '/capabilities/recipes'",
  "path: '/capabilities/$kind/$namespace/$name'",
] as const;
