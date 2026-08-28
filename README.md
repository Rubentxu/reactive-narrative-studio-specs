# Reactive Narrative Studio — Specification Pack

> **Working name only.** The product name is intentionally not locked by these specifications.

This repository pack defines an **agent-first, Git-native, local-first narrative production system** for creating and maintaining:

- short stories and picture books;
- chapter books and illustrated novels;
- prose novels;
- graphic novels and western comics;
- manga;
- webtoons / vertical sequential art;
- future narrative media derived from the same story canon.

The initial dogfooding focus is **Spanish-language readers aged 8–12**, without hard-coding the product to children. Audience, format, genre, tone, locale, visual and publishing behavior are expressed through **composable profiles**.

## Architectural thesis

The system is built around four statements:

1. **Skills are knowledge.**
2. **Packs are behavior.**
3. **The graph is live project state.**
4. **Events, decisions and receipts are evidence.**

The implementation is **Python-first**, with **ActiveGraph** as an adapter for the reactive/event-sourced runtime, **ComfyUI and SaaS image APIs** as replaceable visual providers, and **Typst** as the first print-layout backend.

ActiveGraph is explicitly **not the domain model**. ComfyUI is explicitly **not the visual architecture**. Any LLM/image provider is explicitly **not a product dependency**.

## Project invariants

A narrative project MUST:

- be self-contained inside one project directory;
- be independently versionable with Git;
- have its own runtime database;
- be cloneable and rebuildable without a global database;
- keep canonical source and human decisions in text-friendly formats;
- treat SQLite/cache/projections as rebuildable runtime state;
- permit deterministic validation without an LLM;
- permit human approval at creative gates;
- support local-only, SaaS-only and hybrid AI execution;
- keep generated candidates separate from accepted canon/assets;
- expose read-only stable projections to a serverless Control Plane.

## Package contents

| Document | Purpose |
|---|---|
| `docs/01-VISION.md` | Product vision and principles |
| `docs/02-PRD.md` | Product requirements |
| `docs/03-ARCHITECTURE.md` | Hexagonal architecture |
| `docs/04-DOMAIN-MODEL.md` | Narrative ontology/domain |
| `docs/05-PROJECT-WORKSPACE.md` | Git-native workspace |
| `docs/06-ACTIVEGRAPH-RUNTIME.md` | ActiveGraph integration |
| `docs/07-SKILLS-PACKS.md` | Agent Skills + runtime packs |
| `docs/08-PROFILES.md` | Audience/format/profile system |
| `docs/09-NARRATIVE-IR.md` | Narrative intermediate representation |
| `docs/10-VISUAL-IR.md` | Visual contracts |
| `docs/11-SEQUENTIAL-ART-IR.md` | Comic/manga/webtoon IR |
| `docs/12-IMAGE-PIPELINE.md` | Local/SaaS visual generation |
| `docs/13-CONTROL-PLANE.md` | Static no-server frontend |
| `docs/14-PUBLISHING.md` | PDF/EPUB/CBZ output |
| `docs/15-SCM-PROVENANCE.md` | Git, assets, evidence, provenance |
| `docs/16-CLI.md` | Minimal agent-friendly CLI |
| `docs/17-QUALITY-VALIDATION.md` | Deterministic/heuristic/human QA |
| `docs/18-UAT-STRATEGY.md` | Acceptance testing model |
| `docs/19-ROADMAP.md` | Milestones and exit criteria |
| `docs/20-SPIKES.md` | Risk-reduction experiments |
| `docs/21-EMERGENT-ARCHITECTURE.md` | Anti-overengineering rules |
| `docs/22-SECURITY-RIGHTS.md` | Privacy, secrets, AI provenance |
| `docs/23-OBSERVABILITY-COST.md` | Trace/cost/quality telemetry |
| `docs/24-TESTING-GOLDEN-DATASET.md` | Automated testing |
| `docs/25-IMPLEMENTATION-STARTER.md` | First implementation slice |
| `docs/26-RISKS.md` | Risk register |
| `docs/27-GLOSSARY.md` | Shared vocabulary |
| `docs/adrs/` | Architecture Decision Records |
| `specs/` | Initial machine-readable schemas |
| `templates/` | Starter project files |
| `uat/` | Executable acceptance scenarios |

## First executable objective

The first meaningful release is **not** “all formats supported”.

It is:

> Given a new Git repository, an agent can create a 3-chapter illustrated middle-grade project, maintain a structured canon, generate a visual bible, produce five AI-assisted illustrations using a replaceable provider, validate narrative and visual invariants, accept/reject candidates through human gates, generate static Control Plane projections, and compile a print-ready proof PDF — while the runtime DB can be deleted and rebuilt from project-controlled source/evidence.

This vertical slice proves the architecture before broadening it.

## Normative language

`MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT` and `MAY` are used normatively.
