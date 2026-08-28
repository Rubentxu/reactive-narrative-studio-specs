# UAT-M9-01 — End-to-end illustrated proof

## Given
A clean clone.

## When
The reference workflow creates 3 chapters + 5 approved illustrations and runs build.

## Then
A Typst PDF proof and build receipt are produced.

## Pass
- deterministic check passes;
- no pending required approval;
- output exists;
- output hash recorded;
- deleting/rebuilding runtime can reproduce a valid proof from the same accepted source.
