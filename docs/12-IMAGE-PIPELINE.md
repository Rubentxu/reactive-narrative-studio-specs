# AI Image Pipeline

## Principle

Image generation is a provider capability behind ports.

## Supported execution models

### Local
- ComfyUI native API.
- Optional ComfyUI MCP for external agent exploration/control.

### SaaS
Adapters can target providers supporting some combination of:
- text-to-image;
- image editing;
- inpainting;
- multi-reference;
- pose control;
- high-resolution output.

Current candidate ecosystems include OpenAI image APIs, Google Gemini image models and Black Forest Labs FLUX APIs, but the domain MUST NOT depend on them.

## Why ComfyUI

ComfyUI is useful because workflows are explicit graph recipes and can be versioned/hash-pinned.

Reference workflows:

```text
workflows/comfyui/
  character-sheet.json
  expression-sheet.json
  location-concept.json
  illustration.json
  inpaint-character.json
  comic-panel.json
  manga-panel.json
  upscale-print.json
  cover.json
```

## Capability model

```yaml
capabilities:
  text_to_image: true
  image_to_image: true
  editing: true
  inpainting: true
  multi_reference: 4
  character_reference: true
  style_reference: true
  pose_control: true
  seed_control: true
  local: true
```

## Routing

A request declares needs:

```yaml
operation: illustration

references:
  characters: 3
  style: 1

requires:
  multi_reference: true
  editing: true

policy:
  privacy: local_preferred
  quality: final
```

The router selects the provider. It MUST record why.

## Generation fingerprint

Fingerprint SHOULD hash:
- VisualSpec;
- approved references;
- style;
- provider;
- model revision where available;
- workflow;
- relevant parameters.

Unchanged fingerprint MAY reuse cached result.

## Asset storage

Never store image bytes in the event log.

Use content-addressed storage:

```text
assets/store/ab/cd/<sha256>.png
```

The graph stores IDs/hashes/metadata.

## Provenance

Every generated result SHOULD record:
- provider;
- model;
- model revision if known;
- request hash;
- workflow hash;
- references;
- seed when applicable;
- creation time;
- human edits;
- approval status.

## QA pipeline

```text
candidate
  |
  +--> technical QA
  +--> semantic VLM QA
  +--> continuity comparison
           |
           v
       human review
```

Technical checks:
- file integrity;
- dimensions;
- aspect ratio;
- DPI metadata;
- alpha/channel expectations.

Semantic checks:
- required characters/props;
- visual identity;
- scene evidence contract;
- gross anomalies.

## Repair router

Failure classification SHOULD choose smallest repair scope:

```text
wrong-character -> edit/inpaint character layer
bad-background  -> regenerate background
typo            -> lettering only
full-style-drift -> regenerate panel/page
```

Do not regenerate an entire book page when one replaceable layer failed.

## Cost strategy

Use staged quality:
- draft/local/low-cost;
- review;
- final/high-quality.

Track provider cost per asset and per accepted asset.

## Visual quality projection

The Control Plane exposes a per-shot QA surface as
[`specs/cp-visual-quality.schema.json`](../specs/cp-visual-quality.schema.json).
Every accepted asset MUST carry a `cp-visual-quality` entry whose
`verdict` is one of the lowercase status vocabulary tokens
(`pass | warning | blocked | pending | unknown`) and whose `provider`
field records the generator that produced the asset. The projection is
read-only; corrections land as new candidate assets, not as edits to
the projection.
