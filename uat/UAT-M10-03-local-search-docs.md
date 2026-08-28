# UAT-M10-03 — Local Search and Narrative Docs

## Given
A project containing chapters, characters, decisions, assets and Markdown docs.

## When
The user searches for `llave plateada`.

## Then
Results include applicable:
- character;
- scene/chapter;
- asset;
- decision;
- docs entries.

Opening docs must render safe Markdown.

## Security fixture
A Markdown document contains script/javascript URL attempts.

## Pass
- useful results without network search service;
- unsafe content does not execute;
- source/entity navigation works.
