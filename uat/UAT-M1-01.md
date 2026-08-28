# UAT-M1-01 — Git-native project clone

## Given
A new initialized project committed to Git.

## When
It is cloned into a clean directory and dependencies are installed.

## Then
`narrative inspect --json` identifies the project without any global DB.

## Pass
Project identity, profile and runtime path match the source manifest.
