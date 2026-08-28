# Publishing and Rendering

## First renderer

Use **Typst** as the first print renderer.

Strengths:
- high-fidelity paged layout;
- native PDF export;
- SVG/PNG export;
- strong typography;
- deterministic template-driven output.

Typst HTML export is upstream-experimental and MUST NOT be relied on for the V1 Control Plane.

## V1 target

`print-pdf`

Templates:
- prose;
- illustrated novel;
- picture book proof.

## Later targets

- EPUB reflowable;
- EPUB fixed-layout;
- CBZ;
- Kindle-specific packages;
- manga fixed layout;
- webtoon export.

## Print preflight

Deterministic checks SHOULD include:
- trim dimensions;
- bleed;
- safe areas;
- image effective resolution;
- page count;
- font availability/embedding behavior;
- cover dimensions;
- spine calculation if applicable;
- missing assets;
- color-mode warnings;
- publication metadata.

Target-specific rules live in publishing profiles/adapters, not in core domain.

## Separation of art and text

Image models MUST NOT be the authoritative typography engine.

Keep:
- artwork;
- captions;
- dialogue;
- speech balloons;
- page text

as separate editable structures.

## Publishing receipt

Every final build SHOULD generate:

```yaml
build:
  id: print-proof-v1
  source_commit: ...
  profile: print-a5
  renderer: typst
  renderer_version: ...
  assets:
    count: ...
  validation:
    status: pass
  output_sha256: ...
```

## Reproducibility

Where possible:
- pin templates;
- pin renderer version;
- hash inputs;
- record source commit;
- provide offline-ready fonts/assets subject to licenses.
