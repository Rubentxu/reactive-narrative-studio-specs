# Sequential Art IR

## Purpose

Comics, manga and webtoons are not prose with more pictures. They require their own presentation IR.

## Hierarchy

```text
SequentialWork
  Chapter/Episode
    Page/CanvasSegment
      Panel
        Shot
        Characters
        Action
        Dialogue
        Caption
        SFX
        Background
```

## Panel example

```yaml
id: panel-03

shot:
  size: close-up
  angle: low

characters:
  - nora

emotion:
  nora: disbelief

dialogue:
  - speaker: nora
    text: "Eso es imposible."

narrative_role: reveal
importance: 0.85
```

## Semantic layout

Panels SHOULD carry beat importance rather than only fixed rectangle counts.

A layout solver MAY map:
- narrative importance;
- reading order;
- dialogue density;
- action direction

to a template.

Do not build a complex constraint solver until the layout spike proves value.

## Reading direction

Profiles:
- western comic: `ltr`
- manga: `rtl`
- webtoon: `vertical`

## Lettering

Lettering MUST remain separate from image generation.

Reasons:
- spelling;
- localization;
- accessibility;
- editable typography;
- balloon repositioning;
- translations without image regeneration.

## Balloon placement

Future deterministic objective:

Minimize:
- face overlap;
- focal-action overlap;
- balloon collisions;
- excessive tail length;
- reading-order violations.

Start with template-based placement; explore optimization only after UAT.
