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
Continuity       pass
Editorial        pass
Readability      warning
Visual           pass
Reader UAT       pass
Publishing       blocked
```

> **Vocabulary note (R-02 fix):** the matrix uses the lowercase status
> tokens that are canonical across the spec pack
> (`pass | warning | blocked | pending | unknown`). Pre-wave-4 this
> section carried UPPERCASE tokens; that divergence is now removed.
> Higher-level result words ("Final acceptance") and historical QA
> headers may still appear in UPPERCASE in this document when they refer
> to generic verification lingo (e.g. "PASS/FAIL test outcome"), not to
> the lifecycle status vocabulary.

Do not produce an unexplained composite score.
