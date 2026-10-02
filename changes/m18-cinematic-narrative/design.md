# Design: Cinematic Narrative & Generative Video

## Domain

```text
NarrativeScene
    │
SequencePlan
    │
  ShotPlan
    │
PrevizArtifact
    │
MotionReferenceArtifact
    │
VideoGenerationRequest
    │
VideoProvider
    │
GeneratedShot
    │
VideoQAReport
    │
ApprovedShot
```

## ShotPlan is source of truth

`ShotPlan` expresa duración, fps, sujetos, blocking, cámara, lente, segmentos temporales y referencias. De él se derivan:

```text
ShotPlan
  ├── ShotPlanToBlender
  ├── ShotPlanToPrompt
  ├── ShotPlanToQAConstraints
  └── ShotPlanToStoryboardMetadata
```

## Blender Previz

Objetivo: orientación, escala, posiciones, oclusiones, timing, cámara y movimiento. No requiere high-poly ni texturas finales.

Artifacts:

```text
shot/
  shot-plan.yaml
  generated-scene.py
  scene.blend
  scene-metadata.json
  playblast.mp4
  prompt.txt
  provenance.json
```

## Automated Blender Driver

```text
isolated workspace
 -> blender --background
 -> generated bpy
 -> verifier
 -> .blend + metadata + playblast
 -> stdout/stderr + hashes
```

Verifica fps, frame range, camera, lens, objects, keyframes, constraints, resolution y output.

## Security

Generated `bpy` = executable code. Automated mode usa workspace efímero, no secrets, env allowlist, red off por defecto, timeout/resource limits y conserva el script como evidence. MCP se reserva a modo creativo interactivo y debe aislarse.

## Provider boundary

```text
VideoProvider
  capabilities()
  estimateCost(request)
  generate(request)
  poll(receipt)
  fetchArtifact(receipt)
```

Higgsfield/Seedance, Kling y futuros son adapters.

## QA layers

1. Deterministic media/provenance QA.
2. Machine-assisted visual/temporal QA con score y evidence, nunca verdad absoluta.
3. Human final approval.

## Cost experiment

No asumir ahorro fijo. Comparar A generación directa vs B previz+motion reference midiendo attempts, credits/cost, cost/approved-shot, defects, elapsed time y human score.

## Milestones

- M18.1 Shot Planning
- M18.2 Blender Previz
- M18.3 Motion References
- M18.4 Video Providers
- M18.5 Video QA
- M18.6 Timeline/Editing
- M18.7 Publishing
