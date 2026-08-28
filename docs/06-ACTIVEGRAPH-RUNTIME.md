# ActiveGraph Runtime Integration

## Why ActiveGraph

ActiveGraph provides a useful match for narrative production:
- event-sourced graph runtime;
- typed object/relation packs;
- reactive function/class/LLM behaviors;
- relation behaviors;
- policies and approvals;
- replay;
- fork/diff/promote;
- SQLite/Postgres stores;
- packs and fixtures.

Upstream repository: `https://github.com/yoheinakajima/activegraph`

## Boundary rule

ActiveGraph is an infrastructure adapter.

```text
Domain/Application
      |
GraphRuntimePort
      |
ActiveGraphRuntimeAdapter
```

The project MUST remain migratable to another runtime.

## Object mapping

Initial mapping examples:

| Domain | ActiveGraph object type |
|---|---|
| Character | `character` |
| Scene | `scene` |
| Fact | `fact` |
| Promise | `promise` |
| Asset | `asset` |
| Evaluation | `evaluation` |
| Approval | ActiveGraph policy/approval + domain record |

## Behaviors

### Deterministic behaviors
Examples:
- mark asset stale after dependency update;
- close promise after explicit payoff relation;
- produce projection invalidation;
- enqueue publishing preflight after proof approval.

### LLM behaviors
Examples:
- developmental editor;
- synthetic reader;
- visual scene planner;
- repair-plan proposer.

LLM behaviors MUST emit structured output validated by Pydantic.

### Relation behaviors
Especially useful for:

```text
Asset --DEPENDS_ON--> CharacterVisualIdentity
```

When the identity changes, the relation behavior marks downstream assets stale.

## Policies

Use policy gates for:
- canonical story changes;
- final visual approval;
- external publishing;
- destructive replacements;
- expensive provider calls above configured budget.

## Fork/diff

Narrative use cases:
- alternative endings;
- tone variants;
- audience adaptations;
- visual style alternatives;
- provider quality experiments.

A fork MUST be identifiable as experimental until promoted/accepted.

## Replay

Replay is useful for:
- reconstructing trace;
- reproducing deterministic behavior;
- evaluating new pack versions against recorded fixtures.

Do not assume all external model calls are reproducible. Cache/provenance must distinguish:
- deterministic replay;
- recorded response replay;
- fresh provider execution.

## Per-project storage

Default:

```text
.narrative/runtime/activegraph.sqlite
```

No shared global DB.

## Event export

Use JSONL export as a Git-friendly evidence path:

```text
.narrative/events/YYYY-MM.jsonl
```

Avoid putting binary SQLite diffs under source control.

## Stability strategy

Because ActiveGraph is still young:
- pin exact compatible versions in lockfile;
- wrap public surfaces;
- write contract tests around adapter behavior;
- maintain a runtime compatibility matrix;
- keep fixtures that can be replayed with an alternate runtime adapter.
