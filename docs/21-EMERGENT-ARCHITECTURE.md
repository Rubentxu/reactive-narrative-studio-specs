# Emergent Architecture

## Goal

Prevent an ambitious vision from becoming an over-engineered framework before the core product works.

## Rule 1 — Pain before abstraction

A new abstraction requires evidence:
- duplicated logic in at least 2–3 real paths;
- measurable performance issue;
- incompatible providers;
- recurring UAT failure;
- migration pain.

## Rule 2 — One implementation before interface, except external boundaries

Create ports early only for unstable/external systems:
- runtime;
- image provider;
- renderer;
- asset store;
- SCM.

Do not create factories for every domain class.

## Rule 3 — One Python package first

Initial implementation SHOULD be one distributable package with internal modules.

Do not split into dozens of Python packages until release/version boundaries are real.

## Rule 4 — No Rust without profiler evidence

Python is adequate for:
- validation;
- graph orchestration;
- schemas;
- image API calls;
- filesystem;
- projection generation.

Introduce Rust/PyO3 only if a measured hotspot warrants it.

## Rule 5 — No graph server by aspiration

Default per-project SQLite is sufficient until:
- project scale;
- query latency;
- collaboration

proves otherwise.

## Rule 6 — No generic WorkflowIR in V1

Start with:
- project state;
- behaviors;
- pack composition;
- explicit gates.

If multiple products need programmable workflows, revisit.

## Rule 7 — No backend for Control Plane

Static projection first. Add write operations only when read-only usability is proven.

## Rule 8 — Provider features do not leak

If provider X adds a feature:
1. add capability vocabulary only if multiple use cases need it;
2. implement adapter;
3. do not add provider fields to canon.

## Architecture fitness functions

CI SHOULD enforce:
- domain imports no adapters;
- no provider SDK in domain/application contracts;
- runtime DB path is project-local;
- projections rebuild;
- schemas remain backward-readable across supported versions;
- generated candidates cannot become accepted without valid decision/approval evidence.

## Architecture review checkpoint

At each major milestone ask:

1. What hurt?
2. What was duplicated?
3. What was slow?
4. What was hard to test?
5. What became coupled?
6. What abstraction proved unnecessary?
7. What should be deleted?

Deletion is a valid architecture outcome.
