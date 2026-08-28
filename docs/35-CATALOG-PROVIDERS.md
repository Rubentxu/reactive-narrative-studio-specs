# Client-Side Catalog Providers

## Purpose

Allow the Studio to aggregate explicitly selected project sources without a
server-side catalog.

## Port

```ts
interface CatalogProvider {
  id: string
  discover(): Promise<CatalogEntity[]>
  refresh(): Promise<CatalogEntity[]>
}
```

Provider-specific handles remain private to provider implementation.

## M10 providers

### DirectoryProjectProvider
User selects project directory.

Reads:
- `narrative.yaml`;
- `.narrative/projections`;
- allowed docs/assets.

### SnapshotProvider
Loads an exported static snapshot/ZIP.

Works where File System Access API is unavailable.

## Studio project registry

IndexedDB stores:
- provider type;
- display title;
- last opened;
- permission/handle metadata where browser permits;
- favorites.

It does NOT store canonical project content as sole copy.

## Multiple projects

CatalogStore can merge entities from:
- Project A directory;
- Project B directory;
- imported snapshot.

Namespace/project IDs prevent collisions.

## Future providers

Only after need:
- read-only Git repository snapshot provider;
- browser OPFS import;
- shared folder provider.

Do not add OAuth/provider SDK complexity to M10.

## Conflict strategy

Same entityRef from two providers:
1. identify source project/revision;
2. do not silently merge incompatible payloads;
3. mark conflict;
4. let user choose source.

## Refresh

User-driven or bounded polling only while project is open.

No background daemon is required.
