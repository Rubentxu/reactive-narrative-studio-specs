# UAT-M10-05 — Multi-project local Catalog

## Given
Two independent narrative project snapshots/directories.

## When
Both are opened in Studio.

## Then
Home shows both projects and Catalog can filter by project.

## Pass
- each project retains independent runtime identity;
- no central narrative DB is created;
- deleting Studio IndexedDB preferences cannot delete either project.
