# Implementation Starter

## Recommended stack

- Python 3.12
- `uv`
- Pydantic v2
- ActiveGraph pinned version
- Click
- pytest
- Hypothesis
- Ruff
- Pyright or mypy
- Pillow first; pyvips if image-volume profiling justifies it
- ComfyUI local adapter
- one SaaS image adapter
- Typst CLI adapter

## Initial package

```text
src/reactive_narrative/
├── domain/
│   ├── project.py
│   ├── narrative.py
│   ├── visual.py
│   ├── sequential.py
│   ├── workflow.py
│   └── profiles.py
│
├── application/
│   ├── project_service.py
│   ├── validation_service.py
│   ├── generation_service.py
│   └── projection_service.py
│
├── ports/
│   ├── graph_runtime.py
│   ├── image_provider.py
│   ├── asset_store.py
│   ├── renderer.py
│   ├── scm.py
│   └── skill_registry.py
│
├── adapters/
│   ├── activegraph/
│   ├── comfyui/
│   ├── providers/
│   ├── typst/
│   ├── filesystem/
│   └── git/
│
├── packs/
├── validation/
├── projections/
└── cli/
```

## First coding sequence

### Slice A — Workspace
1. Define `NarrativeProjectManifest`.
2. Implement `narrative init`.
3. Implement project directory policy.
4. Implement `.gitignore` template.
5. Implement `inspect --json`.

### Slice B — Domain
1. Character.
2. Scene.
3. Fact/Secret.
4. NarrativeObject.
5. Promise.
6. Explicit IDs/references.
7. YAML loader.

### Slice C — Validation
1. Broken references.
2. duplicate IDs.
3. knowledge-before-reveal.
4. object-after-destroy.
5. unresolved promise.

### Slice D — ActiveGraph
1. `GraphRuntimePort`.
2. adapter.
3. per-project SQLite.
4. JSONL event sink.
5. projection builder.
6. rebuild test.

### Slice E — Skills
Build only:
- story-intake;
- character-design;
- story-architecture;
- chapter-drafting;
- continuity-review.

### Slice F — Visual
1. Asset model/store.
2. Character Visual DNA.
3. Style Bible.
4. Scene Visual Contract.
5. ComfyUI fixture adapter before real ComfyUI.
6. real ComfyUI adapter.
7. SaaS fixture then real adapter.

### Slice G — Proof
1. five approved assets.
2. Typst template.
3. `build`.
4. `preflight`.
5. receipt.

## Definition of first implementation success

From a clean repository:

```text
narrative init
agent creates canon + 3 chapters
narrative check
agent creates visual bible
generation produces candidates
human approves 5 images
narrative build
```

and a proof PDF is produced.

Then:

```text
rm -rf .narrative/runtime
narrative rebuild
narrative check
narrative build
```

must still succeed.

Do not start the Control Plane until the projection contract is proven by CLI/UAT.
