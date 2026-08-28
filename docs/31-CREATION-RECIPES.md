# Creation Recipes

## Purpose

Creation Recipes are the narrative equivalent of a scaffolding template.

They answer:

> How should a new project of this class be initialized?

They are NOT a generic workflow DSL.

## Uses

A recipe drives:
- `narrative init --recipe ...`
- Control Plane `Create` wizard.

One source, two user interfaces.

## Contents

```text
recipes/middle-grade-illustrated/
├── recipe.yaml
├── parameters.schema.json
├── ui.schema.json        # optional frontend presentation hints
├── skeleton/
└── README.md
```

## Recipe declares

- metadata;
- supported format;
- parameter JSON Schema;
- profile defaults;
- packs;
- skills;
- publishing targets;
- project skeleton;
- initial goals/checklist.

It does NOT embed arbitrary Python or JavaScript.

## Example flow

```text
Create
  |
  +-- Illustrated Middle Grade
  |
  +-- Audience 10–11
  |
  +-- Fantasy + Mystery
  |
  +-- Local preferred images
  |
  +-- Print PDF
  |
  v
Project scaffold
```

## Security

Recipe data from an untrusted project:
- validate against schema;
- never execute scripts;
- never install dependencies automatically;
- external provider enabling requires explicit user action.

## Recipe inheritance

Avoid sophisticated inheritance in V1.

If repeated configuration becomes painful, allow:
- `extends: recipe-id`

only after a spike defines deterministic merge semantics.

## Relationship to ActiveGraph

Recipe initializes state/config.

ActiveGraph behaviors manage subsequent reactive evolution.

Do not model every narrative production step in the recipe.

## Recipe catalog

The Control Plane MAY display:
- title;
- target audience;
- format;
- profiles;
- expected outputs;
- capabilities required.

## Acceptance

A recipe is good if a user can create a valid project without knowing the
internal directory schema.
