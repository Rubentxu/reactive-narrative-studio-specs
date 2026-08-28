# Minimal CLI

## Design goal

Optimize for **agents and humans**, not command-count vanity.

An agent SHOULD need very few high-level commands.

## Primary commands

```text
narrative init
narrative adopt
narrative inspect
narrative next
narrative check
narrative build
narrative rebuild
narrative doctor
```

## Governance commands

```text
narrative approve <target>
narrative reject <target>
narrative checkpoint <name>
narrative fork <name>
narrative diff <fork>
```

## Specialist commands

Optional human/debug tools:

```text
narrative continuity
narrative readability
narrative visual check
narrative publishing preflight
narrative projection build
narrative dashboard build
```

## JSON-first agent interface

Every primary command MUST support:

```bash
narrative inspect --json
```

Stable structured output is preferred to agents parsing tables.

Canonical contracts: `specs/inspect.schema.json` for `inspect --json` output,
`specs/next.schema.json` for `next --json` output.

## `next`

High-value agent command:

```json
{
  "goal": "approve-visual-bible",
  "blocking": [
    "character:nora",
    "character:irene"
  ],
  "recommended_skills": [
    "character-visual-design"
  ]
}
```

`next` MUST be derived from state/gates, not an LLM guess.

## `check`

One command runs all relevant deterministic validators for the current project/profile.

Output SHOULD include:
- status;
- blocking findings;
- warnings;
- evidence IDs;
- remediation hints.

### Exit codes for `narrative check`

| Code | Condition |
|---:|:---|
| 0 | All checks pass |
| 1 | One or more blocking checks failed |
| 2 | Warnings only, no blockers |
| 3 | Project not initialised or no `narrative.yaml` found |
| 4 | Internal error |

## CLI implementation

Python-first:
- Click or Typer-compatible approach;
- Pydantic output models;
- no shell-string business logic;
- adapters for Git/Typst/Comfy.

## No creative writing in CLI

The CLI MAY scaffold/validate/render/index.

It MUST NOT contain hidden `invent_character()` or `write_chapter()` business logic. Creative generation belongs to skills/LLM behaviors.
