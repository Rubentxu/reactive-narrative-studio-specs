# Narrative Docs and Search

## Narrative Docs

Docs are Git-controlled Markdown rendered inside entity/project context.

Sources:
- Story Bible;
- character notes;
- worldbuilding;
- visual bible;
- ADRs;
- production/UAT docs.

## Safe rendering

Allowed:
- Markdown;
- GFM tables/tasks;
- code blocks;
- safe links;
- images from project asset adapters.

Not allowed:
- arbitrary HTML script;
- executable MDX;
- inline JavaScript.

Use sanitization.

## Entity linking

Support a safe link form such as:

```text
[[Character:Nora]]
[[NarrativeObject:Silver-Key]]
```

A parser maps it to a catalog/entity route.

Future enhancement:
- hover card;
- backlinks;
- state summary.

## Docs addons

Potential extension contributions:
- Backlinks
- SourcePath
- GitHistory
- ContinuityWarnings
- AssetPreview
- UATReferences

All addons are read-only in V1.

## Narrative Search

Search index is assembled from collators.

```text
StoryCollator
CharacterCollator
ChapterCollator
AssetCollator
DecisionCollator
UATCollator
DocsCollator
CapabilityCollator
      |
      v
    Orama
```

## Search document contract

```json
{
  "id": "character:nora",
  "type": "character",
  "title": "Nora",
  "text": "...",
  "tags": ["protagonist"],
  "projectId": "la-biblioteca-secreta",
  "entityRef": "Character:la-biblioteca-secreta/nora",
  "sourcePath": "canon/characters/nora.yaml"
}
```

## Result rendering

Result types can render specialized metadata:

Character:
- current canon state;
- scenes;
- visual warning.

Asset:
- thumbnail;
- generation state;
- usage.

Decision:
- action;
- target;
- date.

## Search scope

Filters:
- current project;
- all opened projects;
- entity kind;
- lifecycle;
- tag.

## No vector search in V1

Full text is enough to validate product value.

Vector/hybrid search can be explored later only if:
- users repeatedly fail to find concepts using full text;
- a privacy-safe local embedding strategy is available.

## Index persistence

Orama index MAY be:
- rebuilt from projections;
- cached in IndexedDB.

It is derived state.
