# UAT-M2-01 — Runtime rebuild

## Given
A project with canon, decisions and an ActiveGraph DB.

## When
`.narrative/runtime/` is deleted and `narrative rebuild` runs.

## Then
The rebuilt graph/projection is semantically equivalent.

## Pass
All canonical IDs/relations and accepted decisions are present; check passes.
