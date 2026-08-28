# UAT-M10-02 — Catalog and Entity Page composition

## Given
A project snapshot with Project, Character and Build catalog entities.

## When
The Control Plane opens the project and navigates to Character:Nora.

## Then
The page combines:
- canonical overview;
- visual card;
- scene relations;
- continuity status

through independently registered feature extensions.

## Pass
No story feature imports visual feature implementation or vice versa.
All data arrives through entity/projection contracts.
