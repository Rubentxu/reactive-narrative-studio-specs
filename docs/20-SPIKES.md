# Spikes

Spikes reduce uncertainty. They are not production features.

## SPK-001 ActiveGraph Adapter Stability

Question:
Can we keep the domain independent while using replay/fork/policies effectively?

Measure:
- adapter surface size;
- replay correctness;
- migration pain across one upstream upgrade.

Success:
- domain tests do not import ActiveGraph;
- adapter can be replaced with test runtime.

## SPK-002 Rebuild Semantics

Question:
What is the minimal versioned evidence required to rebuild runtime state?

Compare:
- source-only rebuild;
- source + JSONL events;
- source + decisions + selected events.

Success:
Document exact authority/rebuild rules.

## SPK-003 Character Consistency

Generate 20 scenes with 3 recurring characters using:
- local ComfyUI workflow;
- selected SaaS providers.

Measure:
- identity;
- outfit;
- multi-character correctness;
- correction count;
- latency/cost.

## SPK-004 Reference Strategy

Compare:
- prompt-only;
- one image;
- character sheet;
- multiple references;
- LoRA/IP-Adapter-like workflows where available.

Goal:
Choose the simplest strategy that reaches target consistency.

## SPK-005 Multi-character Scene

Stress:
- 4 recurring characters;
- different poses;
- interaction;
- location constraint.

This is expected to be a major visual risk.

## SPK-006 Layered Comic Generation

Compare:
- monolithic panel generation;
- background + character layers + effects.

Measure:
- correction cost;
- seam quality;
- human effort.

## SPK-007 Visual QA

Build a deliberately corrupted image set.

Measure detection:
- missing glasses;
- wrong outfit;
- wrong prop;
- wrong character count;
- wrong scene relation.

## SPK-008 Spanish Readability

Validate syllable counting and readability metrics against a small hand-checked corpus.

## SPK-009 Typst Print Pipeline

Given Markdown + images:
- generate A5/A4 proof;
- verify bleed/safe area calculations;
- record deterministic build metadata.

## SPK-010 Control Plane Directory Access

Validate:
- Chrome/Chromium directory mode;
- snapshot fallback;
- permissions;
- large project performance.

## SPK-011 Synthetic Reader Calibration

Compare synthetic predictions against anonymous real-reader feedback.

Outcome:
Decide whether synthetic-reader outputs deserve product prominence.

## SPK-012 Semantic Layout Solver

Only after sequential-art UAT.

Compare:
- hand-designed templates;
- heuristic solver;
- optimization solver.

Do not build simulated annealing/constraint solver unless templates measurably fail.
