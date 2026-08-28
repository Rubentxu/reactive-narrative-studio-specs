# Product Requirements Document

## 1. Users

### Primary
- Independent author using an AI coding/agent environment.
- Parent/creator producing books for known readers.
- Technical creator who values Git, reproducibility and local tooling.

### Secondary
- Illustrator working with AI-assisted references.
- Editor/reviewer.
- Beta/UAT reader.
- Comic/manga creator.

## 2. Jobs to be done

1. Start from an idea, outline, existing manuscript or imported project.
2. Establish audience and format constraints without locking creativity.
3. Maintain canon and continuity across chapters/scenes.
4. Draft/revise using specialized skills.
5. Maintain consistent visual identities.
6. Generate images locally, remotely or hybrid.
7. Review and selectively regenerate only failed parts.
8. Measure deterministic quality signals.
9. Run reader UAT with synthetic and real readers.
10. Produce publication artifacts.
11. Inspect current project state in a no-server frontend.
12. Rebuild runtime state after clone.
13. Fork a creative direction and compare outcomes.

## 3. Functional requirements

### FR-001 Project lifecycle
The system MUST support:
`init`, `adopt`, `inspect`, `next`, `check`, `approve/reject`, `fork`, `build`, `snapshot`, `rebuild`, `doctor`.

### FR-002 Canon
The system MUST model characters, locations, objects, events, facts, relationships, promises and state transitions.

### FR-003 Continuity
The system MUST detect deterministic contradictions when enough structured evidence exists.

Examples:
- dead character reappears;
- destroyed object is used later;
- character knows a secret before reveal;
- impossible ownership/location sequence;
- unresolved required promise at release gate.

### FR-004 Skills
Creative methodology MUST live in portable Agent Skills and MUST NOT be duplicated as hard-coded domain logic.

### FR-005 Runtime packs
Reactive runtime behavior MUST be expressed through replaceable domain packs/adapters.

### FR-006 Audience profiles
Profiles MUST compose:
- audience;
- locale;
- format;
- genre;
- tone/intensity;
- visual style;
- publishing target.

### FR-007 Image generation
The system MUST support:
- ComfyUI local adapter;
- at least one SaaS image adapter;
- capability-based routing;
- multi-reference requests where supported;
- edits/inpainting when supported;
- local-only privacy policy;
- candidate/approved separation.

### FR-008 Visual continuity
The system MUST model:
- Character Visual DNA;
- Location DNA;
- Prop DNA;
- Style Bible;
- Scene Visual Contract;
- generation provenance.

### FR-009 Sequential art
The domain MUST be extensible to page/panel/dialogue/caption/SFX/reading-direction constructs without changing prose canon types.

### FR-010 Human gates
Creative canon changes and final asset approvals MUST support explicit human approval.

### FR-011 Publishing
The initial publishing target MUST be print PDF. EPUB and CBZ are roadmap targets.

### FR-012 Control Plane
The initial Control Plane MUST:
- be a static SPA/PWA;
- work without an application server;
- read stable JSON projections/snapshots;
- be read-only in V1;
- expose project status, graph, manuscript, visual production, QA, UAT and history.

### FR-013 SCM
A project MUST be valid as an independent Git repository.

### FR-014 Per-project persistence
Every project MUST own its runtime DB and MUST NOT require global project state.

### FR-015 Rebuild
Deleting `.narrative/runtime/` MUST NOT destroy canonical source or accepted decisions.

### FR-016 Provenance
Generated assets MUST retain provider/model/workflow/reference hashes and human-approval status.

## 4. Non-functional requirements

### NFR-001 Provider independence
No domain model MAY import provider SDK types.

### NFR-002 Runtime independence
No domain model MAY import ActiveGraph types.

### NFR-003 Determinism boundary
Schema, continuity, dependency, publishing preflight and project consistency checks SHOULD be deterministic.

### NFR-004 Performance
Optimization MUST be evidence-driven. Python remains default until profiling identifies a hotspot.

### NFR-005 Portability
Projects MUST remain understandable using plain files without the Control Plane.

### NFR-006 Auditability
Every accepted canonical mutation MUST be attributable to source/human/agent/runtime action.

### NFR-007 Recoverability
Runtime state MUST be rebuildable or explicitly declared non-rebuildable.

### NFR-008 Privacy
Profiles MUST allow `local_only`, `hybrid`, and `saas_allowed` provider policies.

### NFR-009 Idempotence
Re-running projection and deterministic validation on unchanged source MUST produce semantically identical outputs.

## 5. Out of scope for V1

- graph server;
- multi-user backend;
- remote collaboration;
- custom image model training platform;
- custom Workflow DSL;
- distributed agents;
- universal plugin marketplace;
- full series management;
- production HTML layout through Typst (HTML support is still experimental upstream).
