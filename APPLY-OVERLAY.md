# Backstage-Inspired Control Plane Overlay

This ZIP is a **mergeable overlay** for the previous
`reactive-narrative-studio-specs.zip`.

## Apply

From the directory that contains the previous extracted folder:

```bash
unzip reactive-narrative-studio-control-plane-overlay.zip
```

The archive uses the same root path:

```text
reactive-narrative-studio-specs/
```

Files with the same path are complete replacements. New files are additive.

## What this overlay changes

The Control Plane evolves from a static dashboard into a **serverless creative
production portal** inspired by the strongest Backstage patterns:

- Narrative Catalog;
- entity pages;
- typed extension points;
- Studio Home and Workbench;
- Narrative Search;
- Narrative Docs;
- Creation Recipes;
- capability catalog;
- client-side federated catalog providers;
- lifecycle/status projections;
- graph lenses;
- stable JSON contracts.

It deliberately **does not adopt Backstage itself** and does not add:

- a Node/Express backend;
- a central catalog DB;
- backend plugins;
- remote dynamic plugins;
- Elasticsearch;
- organization/user management;
- a server-side scaffolder.

## Compatibility

This overlay preserves the main architecture:

```text
Git project
  + canonical source/evidence
  + per-project ActiveGraph runtime
  + projections
  -> static Control Plane
```

The Catalog remains a **projection**, never the source of truth.
