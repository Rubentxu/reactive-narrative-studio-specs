# Studio Home and Workbench

## Why separate them

Backstage-style Home solves cross-entity navigation.
Narrative production also needs an IDE-like current-work surface.

Therefore:

```text
Home       -> across projects
Workbench  -> inside one project
```

## Studio Home

Primary questions:
- What projects do I have?
- Where was I?
- What is blocked?
- What needs approval?

Widgets:

### Continue Working
Last active project/entity.

### Recent Projects
Local recent-project metadata.

### Favorites
Projects/entities starred by the user.

### Pending Approvals
Counts/summaries from projections.

### Blocking Findings
Top deterministic blockers.

### Recent Activity
Projection of project events/checkpoints.

### Resource Usage
Optional:
- local/SaaS images;
- generation cost;
- failed runs.

## Widget layout

User may:
- add/remove;
- reorder;
- resize.

Layout lives in IndexedDB and is never committed to project Git unless a
future explicit shared-layout feature exists.

## Workbench

Questions:
- What am I doing now?
- What should happen next?
- What prevents progress?

Default widgets:

```text
Current Focus
Next Action
Blocking Findings
Current Chapter
Current Scene
Visual Queue
Pending Approval
Active Fork
Recent Decisions
```

## Next Action

Must consume deterministic `next` projection/CLI state, not ask an LLM to
invent project progress.

## Deep links

Every workbench object should link to its entity page or source.

## Future actions

V1 is read-only.

Future:
- approve;
- reject;
- comment;
- request regeneration.

These operations must create explicit project command/decision records and
remain auditable.
