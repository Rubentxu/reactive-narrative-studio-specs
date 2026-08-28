# Agent Skills and ActiveGraph Packs

## Fundamental distinction

> **Skills are knowledge. Packs are behavior. Graph is state. Events are evidence.**

## Agent Skills

Use the open Agent Skills structure:

```text
skill-name/
├── SKILL.md
├── references/
├── scripts/
├── templates/
├── examples/
└── evals/
```

Skills MUST be portable across agent clients whenever possible.

## Skill template requirements

Every skill SHOULD contain:

1. Purpose
2. When to use
3. When NOT to use
4. Inputs
5. Outputs
6. Procedure
7. Constraints
8. Failure modes
9. Verification
10. Examples
11. References
12. Evaluation cases

## Initial skill families

### Foundation
- story-intake
- audience-design
- concept-exploration
- genre-design

### Narrative craft
- story-architecture
- character-design
- worldbuilding
- plot-design
- scene-design
- dialogue-craft
- chapter-drafting
- prose-craft

### Editorial
- developmental-edit
- continuity-review
- pacing-review
- line-edit
- originality-review
- target-reader-review

### Visual
- visual-direction
- character-visual-design
- location-visual-design
- prop-visual-design
- storyboard
- illustration-planning
- visual-continuity
- cover-direction

### Sequential art
- comic-script
- panel-direction
- panel-layout
- manga-direction
- lettering-review

### Publishing
- book-layout
- print-preflight
- epub-preflight
- metadata-and-blurb

## Avoid skill explosion

Do not create a skill for every technique.

References such as:
- three-act structure;
- Kishōtenketsu;
- scene/sequel;
- mystery clue design;
- genre conventions

SHOULD live as reference material loaded by broader skills.

## Packs

ActiveGraph packs MAY contain:
- Pydantic object types;
- relations;
- behaviors;
- tools;
- policies;
- prompts;
- settings.

Initial domain packs:

```text
story_core
characters
worldbuilding
plot
editorial
audience
visual_core
image_generation
visual_qa
sequential_art
publishing
reader_uat
```

## Pack dependency model

Prefer a tiny shared core. Domain packs SHOULD degrade gracefully when optional integrations are absent.

Example:

```text
core
 |
 +-- story_core
 +-- characters
 +-- visual_core
       |
       +-- image_generation
       +-- visual_qa
```

## Prompt reuse

Do not duplicate the same methodology in:
- `SKILL.md`
- ActiveGraph prompt
- agent role prompt.

Introduce a `SkillRegistryPort` so LLM behaviors can request relevant skill content.

## Agent roles

A role is a perspective, not a skill.

Example:
- developmental editor;
- adversarial editor;
- target reader.

All can consume the same editorial skill differently.

## Multi-agent rule

Default to one director + bounded fan-out.

Use multiple reviewer agents only when diversity provides value:
- major outline decisions;
- chapter review;
- alternative endings;
- UAT simulation.

Avoid continuous agent debates.
