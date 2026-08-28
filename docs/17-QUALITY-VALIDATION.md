# Quality and Validation

## Three classes of evaluation

### Objective/deterministic
- schema valid;
- files exist;
- graph relations valid;
- timeline constraints;
- stale dependencies;
- print preflight;
- build succeeds.

### Heuristic/model-assisted
- prose pacing;
- character depth;
- visual similarity;
- scene visual compliance;
- synthetic reader reaction.

### Subjective/human
- emotional impact;
- beauty;
- originality;
- appropriateness for a known reader;
- final canon/asset acceptance.

Never collapse all three into one score.

## Narrative validator examples

- character alive at scene;
- object available at scene;
- fact knowledge timing;
- location transition;
- unresolved required promises;
- duplicate IDs;
- broken references.

## Editorial lenses

Parallel review MAY include:
- developmental;
- continuity;
- pacing;
- audience fit;
- prose;
- originality;
- adversarial consistency.

Each lens returns structured findings:

```yaml
status: concerns
findings:
  - severity: medium
    location: chapter-07
    evidence: ...
    reasoning: ...
    suggestion: ...
```

## Readability

For Spanish profiles:
- Fernández-Huerta;
- Szigriszt-Pazos;
- sentence-length distribution;
- rare-word density;
- dialogue ratio.

Metrics MUST be informational unless the profile explicitly upgrades them to gates.

## Visual QA

### Deterministic
- dimensions;
- ratio;
- format;
- hash;
- file health.

### Model-assisted
- character consistency;
- required objects;
- style drift;
- scene contract.

### Human
Final acceptance.

## Release readiness

Use a matrix:

```text
Continuity       PASS
Editorial        PASS
Readability      WARNING
Visual           PASS
Reader UAT       PASS
Publishing       BLOCKED
```

Do not produce an unexplained composite score.
