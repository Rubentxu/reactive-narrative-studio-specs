# UAT-M7-01 — Provider replacement

## Given
One VisualSpec.

## When
Executed through local ComfyUI fixture and SaaS fixture.

## Then
Both produce normalized GenerationResult without domain changes.

## Pass
Provider-specific data remains in adapter/provenance metadata only.
