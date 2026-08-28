# ADR-023 — Creation Recipes replace server-side scaffolding

## Status
Accepted.

## Decision
Use declarative, JSON-Schema-driven Creation Recipes for new-project
scaffolding.

The same recipe drives CLI and Control Plane wizard.

## Constraint
Recipes are not a generic runtime WorkflowIR and cannot execute arbitrary
scripts.

## Benefit
Backstage Software Template UX without a Scaffolder backend.
