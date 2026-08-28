# Git-Native Project Workspace

## Principle

**One directory = one narrative project = one SCM unit = one runtime persistence boundary.**

No global DB is required.

## Reference layout

```text
my-book/
├── narrative.yaml
├── narrative.lock
├── README.md
├── .gitignore
├── .gitattributes
│
├── canon/
├── plot/
├── manuscript/
├── visual/
├── storyboard/
├── assets/
├── feedback/
├── publishing/
├── workflows/
├── profiles/
│
├── .narrative/
│   ├── events/          # versioned evidence
│   ├── decisions/       # versioned
│   ├── receipts/        # versioned
│   ├── projections/     # rebuildable, optionally committed
│   ├── runtime/         # ignored
│   ├── cache/           # ignored
│   └── tmp/             # ignored
│
└── build/               # ignored by default
```

## SCM categories

### Source — MUST be versioned
- canon;
- manuscript;
- plot;
- profiles;
- workflow definitions;
- publishing templates/config.

### Evidence — SHOULD be versioned
- accepted decision records;
- validator receipts;
- selected event exports;
- human UAT.

### Runtime — MUST NOT be required in Git
- ActiveGraph SQLite;
- model caches;
- generated temporary thumbnails;
- ephemeral provider responses.

### Assets
Policy is configurable:
- `approved-only`;
- `full-history`;
- `external`.

Git LFS SHOULD be recommended for binary-heavy projects.

## Rebuild invariant

This command sequence MUST be supported:

```bash
rm -rf .narrative/runtime
narrative rebuild
narrative check
```

It MUST NOT lose accepted source/canon.

## `narrative.yaml`

Acts as the project manifest.

## `narrative.lock`

Pins:
- schema version;
- ActiveGraph runtime version;
- pack versions;
- skill pack versions;
- workflow hashes;
- renderer versions;
- optional provider/model revisions.

## Git checkpoints

The CLI MAY support:

```text
narrative checkpoint manuscript-draft-1
narrative checkpoint visual-bible-v1
narrative checkpoint print-proof-v1
```

A checkpoint:
1. runs relevant validation;
2. creates a receipt;
3. prepares a commit;
4. only creates a Git commit/tag with explicit user permission.

## Adopt existing project

`narrative adopt` MUST be able to scaffold metadata around:
- an existing manuscript;
- an image collection;
- a partially structured story.

Adoption SHOULD create candidates, not assert invented canon.
