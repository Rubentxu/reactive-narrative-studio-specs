# Spec: Cinematic Narrative & Generative Video

## CIN-001 — ShotPlan
Toda toma controlada SHOULD disponer de ShotPlan versionado.

## CIN-002 — Source of Truth
`.blend` y playblast MUST ser derivados, no la única copia de intención cinematográfica.

## CIN-003 — Stable Shot Identity
Cada shot MUST tener ID estable y vínculo a scene/sequence.

## CIN-004 — Camera Specification
ShotPlan MUST expresar lens, duration/frame range, camera segments y targets cuando aplique.

## CIN-005 — Subject Blocking
ShotPlan MUST expresar posiciones/movimientos básicos de sujetos relevantes.

## CIN-006 — Blender Generator
MUST existir adapter ShotPlan→Blender.

## CIN-007 — Minimal Geometry
Previz SHOULD usar geometría mínima suficiente para anclar espacio/motion.

## CIN-008 — Headless Verification
Harness MUST poder ejecutar verificación Blender sin UI.

## CIN-009 — Scene Metadata
Blender generation MUST emitir version, fps, frames, camera/lens, object IDs y outputs.

## CIN-010 — Motion Reference Artifact
Playblast MUST registrarse con hash y metadata.

## CIN-011 — Provider Neutrality
Core MUST depender de `VideoProvider`, no de un vendor.

## CIN-012 — Capability Discovery
Provider MUST declarar capabilities relevantes antes de generar.

## CIN-013 — Budget
Toda generación live automatizada MUST tener budget policy.

## CIN-014 — Live Opt-In
CI/UAT normal MUST NOT llamar a provider facturable sin opt-in.

## CIN-015 — Provenance
GeneratedShot MUST poder reconstruir ShotPlan, request, provider/model, references, hashes y receipt.

## CIN-016 — Prompt Compiler
Timecoded prompt SHOULD derivarse de ShotPlan, no solo de reanalizar playblast.

## CIN-017 — QA Layers
MUST distinguir deterministic, machine-assisted y human QA.

## CIN-018 — Human Final Approval
ApprovedShot requiere aprobación explícita.

## CIN-019 — Provider Failure
Provider failure MUST producir resultado tipado/evidence sin corromper project state.

## CIN-020 — Retry Policy
Retries MUST estar acotados y contabilizados.

## CIN-021 — Cost Accounting
Coste/créditos SHOULD capturarse cuando exista información.

## CIN-022 — Experimental Validation
M18 completo MUST NOT iniciarse antes de SPK-VIDEO-01.

## CIN-023 — No Fixed Savings Claim
No MUST garantizarse porcentaje de ahorro sin evidence propia.

## CIN-024 — Generated Script Evidence
`bpy` automatizado MUST conservarse como evidence.

## CIN-025 — Sandbox
LLM-generated Blender code MUST ejecutarse aislado de secrets/datos sensibles.

## CIN-026 — MCP Optionality
MCP/Bridge MAY usarse interactivo pero MUST NOT ser requisito del UAT headless.

## CIN-027 — Replaceable Previz Engine
Dominio SHOULD permitir sustituir Blender en el futuro.

## CIN-028 — Sequence Continuity
SequencePlan SHOULD expresar screen direction, character/location continuity y temporal ordering.

## CIN-029 — Regeneration Provenance
Cada attempt MUST conservar parent request/shot identity.

## CIN-030 — Promotion
Solo shot aprobado puede convertirse en `ApprovedShot`.
