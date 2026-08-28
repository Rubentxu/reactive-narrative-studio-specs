# Roadmap

The roadmap is milestone-driven, not calendar-driven.

A milestone exits only when its UAT passes.

## M0 — Research Baseline

**Goal:** codify external patterns and lock project vocabulary.

Deliver:
- architecture docs;
- ADRs;
- source inventory;
- initial schemas;
- 5 reference skills;
- golden-case list.

Exit:
- `UAT-M0-01` terminology/schema consistency passes.

## M1 — Git-Native Project Core

Deliver:
- `narrative init`;
- manifest/lock;
- workspace loader;
- per-project runtime path;
- project validation;
- `inspect --json`.

Exit:
- create project;
- commit;
- clone elsewhere;
- inspect successfully.

## M2 — Rebuildable ActiveGraph Runtime

Deliver:
- ActiveGraph adapter;
- per-project SQLite;
- event JSONL export;
- rebuild command;
- core object/relation mapping.

Exit:
- delete runtime DB;
- rebuild;
- graph projection is semantically equivalent.

## M3 — Narrative Canon + Continuity

Deliver:
- Character/Scene/Fact/Object/Promise models;
- timeline/state checks;
- deterministic continuity validator;
- initial story skills.

Exit:
- golden broken stories trigger all expected findings.

## M4 — Profiles + Middle Grade Pack

Deliver:
- profile composition;
- `es-ES`;
- 8–9, 9–10, 10–11, 11–12 presets;
- readability report.

Exit:
- same chapter analyzed under different profiles produces deterministic profile-specific findings without altering prose.

## M5 — Editorial Agent Workflow

Deliver:
- skill registry;
- editorial pack;
- structured LLM behavior output;
- bounded multi-lens review;
- approval gate.

Exit:
- draft -> review -> revision -> accepted with trace/evidence.

## M6 — Visual Bible

Deliver:
- Character/Location/Prop DNA;
- Style Bible;
- visual references;
- Scene Visual Contract;
- asset store.

Exit:
- three recurring characters have complete approved visual references and no broken asset relations.

## M7 — Image Generation Providers

Deliver:
- ComfyUI local adapter;
- one SaaS adapter;
- capability router;
- provenance;
- fingerprint/cache.

Exit:
- same VisualSpec can route to local or SaaS without domain changes.

## M8 — Visual QA + Repair

Deliver:
- technical QA;
- VLM semantic QA adapter;
- candidate lifecycle;
- repair router;
- minimal regeneration.

Exit:
- intentionally wrong character/outfit/prop cases are detected and repaired without full-project regeneration.

## M9 — Illustrated Book Vertical Slice — V1

Deliver:
- 3 chapters;
- 5 accepted illustrations;
- layout template;
- Typst proof PDF;
- print preflight;
- human gates.

Exit:
- end-to-end UAT produces a reproducible proof from a clean clone.

**This is the first product-worthy release.**

## M10 — Static Control Plane

Deliver:
- projection schemas;
- static SPA;
- directory/snapshot mode;
- overview/story/visual/QA/history views.

Exit:
- open a project with no backend and correctly show current state.

## M11 — Human Reader UAT

Deliver:
- reader forms;
- anonymous feedback storage;
- synthetic reader panel;
- comparison report.

Exit:
- complete one real reader round and preserve its evidence.

## M12 — Sequential Art Core

Deliver:
- Page/Panel/Dialogue/Caption/SFX IR;
- LTR/RTL/vertical reading profiles;
- comic script skill;
- storyboard projection.

Exit:
- one canon chapter is adapted into a validated 8–10 page storyboard.

## M13 — Comic Renderer

Deliver:
- panel templates;
- layered image composition;
- lettering layer;
- balloons/captions;
- CBZ proof.

Exit:
- produce comic proof with editable text not baked by the image model.

## M14 — Manga Profile

Deliver:
- RTL;
- monochrome/screentone settings;
- manga visual/editorial profile.

Exit:
- same sequential source can be rendered through distinct comic vs manga presentation profiles.

## M15 — Digital Publishing

Deliver:
- EPUB reflowable;
- fixed-layout experiment;
- validation adapters.

Exit:
- artifacts open correctly in agreed reference readers.

## M16 — Series Canon

Deliver only after real multi-book demand:
- Series Bible;
- cross-book continuity;
- semantic impact analysis.

Exit:
- Book 2 inherits and validates Book 1 canon.

## Explicitly deferred

- remote multi-user platform;
- graph server;
- custom universal workflow language;
- custom model training platform;
- distributed execution;
- marketplace;
- Rust rewrite.
