# Research Notes — Blender + Generative Video

## Validated design inputs

- Blender 5.1 soporta background/headless, scripts Python y exit code para excepciones: apto para UAT automatizado.
- Blender dispone de MCP oficial, pero ejecuta código LLM y recomienda aislamiento: MCP es modo interactivo opcional, no requisito del Harness.
- Higgsfield dispone actualmente de add-on Blender y Bridge: útil como adapter/creative mode, nunca como core dependency.

## Correcciones a la propuesta inicial

1. No fijar como verdad "80% menos créditos"; medirlo como hipótesis.
2. ShotPlan es fuente primaria; no reconstruir toda la intención reanalizando el playblast.
3. Higgsfield/Seedance quedan detrás de `VideoProvider`.
4. Blender/MCP generado por agentes se ejecuta aislado.
