# Roadmap Delta propuesto

## Inserción inmediata

```text
M10.1 Creation Recipes
  Status: done

M10.2 Capability Catalog
  Status: done

M10.2.1 Verification & Audit Harness
  Status: done

M10.3 Multi-Project Local Studio
  Status: done
```

## Nuevo candidato futuro

```text
M18 Cinematic Narrative & Generative Video
Precondition: SPK-VIDEO-01 PASS (spike live pendiente del operador — opt-in + credenciales;
la fundación determinista no lo requiere)

  M18.1 Shot Planning
    Status: done (v0.26.0 + v0.27.0 + v0.28.0)
    Motor: shot-plan.schema.json cerrado, validador determinista con violaciones tipadas,
    gates de física de cámara por rig, modelo geométrico compartido
    validador↔generador. Web: vista /cinematic con validación en cliente (Ajv + port
    TypeScript de los gates con paridad byte Python↔TypeScript verificada por oracle)
    y visor de previz por ficheros.
    CIN: 001 ✅ 002 ✅ 003 🔶 (id estable sí, SequencePlan como contrato propio:
    v0.30.0) 004 ✅ 005 ✅

  M18.2 Blender Previz
    Status: done (v0.26.0 + v0.27.0)
    Generador bpy determinista byte-idéntico, driver headless con sandbox
    (allowlist + workspace efímero + timeout + marcador de éxito compuesto),
    scene-metadata con schema cerrado, CIN_TARGET con Track To.
    CIN: 006 ✅ 007 ✅ 008 ✅ 009 ✅ 025 🔶 (disciplina de ejecución sí,
    contención OS plena cuando haya código LLM)

  M18.3 Motion Reference
    Status: done (v0.26.0)
    Playblast WORKBENCH 640×360 H264 con nombre de rango, hash y registro en
    metadata + provenance. CIN: 010 ✅ 015 ✅ 024 ✅

  M18.4 Video Providers
    Status: implemented (motor) / adapter_pending
    Puerto VideoProvider tipado (capabilities + generate con resultado unión),
    BudgetLedger pre-attempt, gate live DENEGADO por defecto (exit 7),
    FakeProvider determinista sin red, spike A/B dry-run con métricas
    SPK-VIDEO-01 y veredicto null. Adaptador HiggsfieldProvider: pendiente de
    credenciales del operador (HF_API_KEY_ID/HF_API_KEY_SECRET, console).
    CIN: 011 ✅ 012 ✅ 013 ✅ 014 🔶 (gate sí, adapter real no)
    019 ✅ 020 ✅ 021 ✅ (lado fake) 029 🔶 (attempts con receipt,
    parent-identity completa con el adaptador)

  M18.5 Video QA
    Status: planned
    CIN: 017 ❌ 018 ❌ (placeholder UAT-CIN-05 MANUAL_ONLY) 030 ❌

  M18.6 Timeline / Editing
    Status: planned (future)

  M18.7 Publishing
    Status: planned (future)

  Transversales: CIN-022 ⏸ (spike live = decisión del operador, precondición
  de M18 completo) · CIN-023 ✅ (dry-run sin veredicto ni claims de ahorro)
  · CIN-026 ✅ (MCP opcional, nada del headless lo requiere) · CIN-027 ✅
  (core sin bpy, engine sustituible estructuralmente) · CIN-016 ✅ compilador
  de prompt desde el ShotPlan (v0.29.0: 8 secciones, números duros del modelo
  geométrico, salida determinista) · paridad cross-runtime de veredictos:
  v0.28.0 (oracle byte-idéntico en SCN-CIN-05-001) · CIN-018 ✅ y CIN-030 ✅
  registro de aprobación explícita (v0.29.0: solo tomas validadas se promocionan)
  · CIN-017 🔶 (determinista capturada en el registro; capa machine-assisted
  declinada hasta que haya riesgo identificado que justifique la dependencia)
  · CIN-028 ✅ SequencePlan (v0.30.0: screenDirection/continuidad/orden temporal
  + prompt de secuencia con cortes declarados y timeline acumulativa)
```

## Status model
`planned -> in_progress -> implemented -> verification_pending -> uat_pending -> audit_pending -> done`.

Leyenda CIN: ✅ implementado y verificado · 🔶 parcial (detalle) · ❌ pendiente · ⏸ bloqueado por decisión del operador.
