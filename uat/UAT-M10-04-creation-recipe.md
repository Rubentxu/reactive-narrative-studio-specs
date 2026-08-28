# UAT-M10-04 — One Creation Recipe, CLI and UI

## Given
`middle-grade-illustrated` recipe.

## When
The same answers are supplied to:
1. CLI;
2. Control Plane recipe wizard.

## Then
Both outputs normalize to equivalent:
- project manifest;
- selected profiles;
- packs;
- skills;
- publishing targets.

## Pass
Semantic diff is empty for recipe-owned fields.
