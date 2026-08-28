# Control Plane Data Contracts

## Goal

Make the Control Plane replaceable and independently evolvable.

## Contract families

### Projection envelope

```json
{
  "schema": "control-plane/project/v1",
  "generatedAt": "...",
  "sourceRevision": "...",
  "data": {}
}
```

### Catalog entity
`catalog-entity/v1alpha1`

### Search document
`search-document/v1`

### Recipe
`creation-recipe/v1`

### Extension configuration
`control-plane-extension-config/v1`

## Projection freshness

Every projection SHOULD declare:
- source revision;
- generated time;
- builder version.

UI compares projection revision with SCM projection.

If stale:

```text
Projection may be outdated
source: abc123
current: def456
```

It must not silently present stale data as current.

## Validation pipeline

```text
bytes
 -> parse
 -> schema select
 -> AJV validate
 -> normalize
 -> store
 -> render
```

Invalid input:
- does not enter typed store;
- produces actionable diagnostic;
- does not crash whole portal.

## Schema migration

Frontend may support a bounded set:
- current;
- previous compatible version.

Migration is explicit and pure.

Do not mutate project files automatically during read-only loading.

## Entity references

Canonical string:

```text
Kind:namespace/name
```

Project namespace may be the project ID.

## Projection boundaries

Do not include:
- secret API keys;
- full model prompts if not needed;
- private raw child UAT identity;
- image bytes.

Use asset refs/hashes.

## Snapshot format

A snapshot may package:

```text
snapshot/
├── manifest.json
├── projections/
├── thumbnails/
└── docs/
```

No runtime DB required.

## Static dashboard build

`narrative dashboard build` can emit a self-contained immutable snapshot
targeting the same contracts.
