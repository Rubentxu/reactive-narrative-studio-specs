# ADR-CIN-004 — Sandbox para Blender generado por agentes

## Status
Proposed.

## Decision
Generated bpy/MCP se trata como código no confiable: workspace efímero, no secrets, env allowlist, network off por defecto, timeout/resource limits y script guardado como evidence.
