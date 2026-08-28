# UAT Strategy

## Purpose

UAT is how milestone progress becomes verifiable.

Every roadmap milestone MUST define:
- user-visible outcome;
- setup;
- steps;
- expected evidence;
- pass/fail criteria;
- regression fixture.

## UAT classes

### Project UAT
Can a user initialize/clone/rebuild a project?

### Narrative UAT
Does canon behave correctly?

### Agent UAT
Can an agent discover the next action and complete it with bounded command use?

### Visual UAT
Can the system maintain identity and repair failures?

### Control Plane UAT
Can a user understand project state with no server?

### Publishing UAT
Can a proof artifact pass deterministic preflight?

### Reader UAT
Does the target reader understand/enjoy the work?

## Human reader UAT

Keep synthetic and real feedback separate.

Human form example:
- Did any part feel boring?
- What did you not understand?
- Favorite character and why?
- What do you think happens next?
- Do you want to read the next chapter? 1–5.

Do not expose sensitive child data unnecessarily. Use anonymous reader IDs.

## Synthetic readers

Synthetic profiles are hypotheses:
- `reader-8-reluctant`;
- `reader-10-fantasy`;
- `reader-11-mystery`;
- `reader-12-avid`.

They MUST NOT be presented as real children.

## Calibration

A later milestone MAY compare predicted vs human feedback:
- confusion;
- engagement;
- favorite scene;
- next-chapter desire.

## UAT evidence

```text
uat/<scenario-id>/
  report.json
  evidence/
  screenshots/
  artifacts/
```

A milestone cannot be “done” solely because code merged.
