# Proposal: m18-cinematic-narrative — Deterministic Previz + Generative Video

- **Change id**: `m18-cinematic-narrative`
- **Roadmap position**: futuro; no bloquea M10.x.
- **Precondition**: `SPK-VIDEO-01` PASS.
- **Source of truth**: `ShotPlan`.
- **Blender role**: previz/blockout/camera/timing/motion.
- **Video provider role**: estilo/textura/iluminación/detalle final.
- **Verification**: integrado con M10.2.1 Evidence model.

## Intent

Separar la parte determinista de dirección espacial de la parte probabilística de generación visual.

```text
NarrativeScene
 -> SequencePlan
 -> ShotPlan
 -> Blender Previz
 -> MotionReferenceArtifact
 -> VideoGenerationRequest
 -> VideoProvider
 -> GeneratedShot
 -> VideoQAReport
 -> ApprovedShot
```

Blender no será la fuente de verdad: `.blend`, playblast y prompt son artefactos derivados del mismo `ShotPlan`.

## Why

Cámara, staging, continuidad espacial, velocidad, blocking, regla de 180° y timing son difíciles de controlar únicamente con prompts. Una capa 3D mínima permite fijar geometría/movimiento y dejar al generador la estética final.

## In Scope

- ShotPlan/SequencePlan;
- `bpy` generator;
- headless Blender driver;
- playblast/motion reference abstraction;
- provider-neutral VideoProvider;
- provenance/receipts/cost;
- deterministic + machine-assisted + human QA;
- regeneration history;
- experimental baseline vs previz;
- Harness integration.

## Out of Scope V1

- NLE completo;
- render 3D final obligatorio;
- dependencia obligatoria de MCP;
- auto-publicación YouTube;
- porcentaje fijo de ahorro;
- acoplamiento a Seedance/Higgsfield.
