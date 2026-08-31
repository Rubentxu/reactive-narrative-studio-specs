# Middle Grade Illustrated Novel — Creation Recipe

**Recipe ID**: `middle-grade-illustrated`
**Schema**: `creation-recipe/v1`

## Purpose

Starter bundle for an illustrated middle-grade novel (ages 8–12). Produces a 3-chapter skeleton with character sheets, story bible, and illustration plan.

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | string | *(required)* | Book title |
| `projectId` | string | *(required)* | Project identifier; lowercase, digits, hyphens/underscores |
| `audience` | enum | `profile-middle-grade-10-11` | Target audience segment |
| `imagePolicy` | enum | `local_preferred` | Image sourcing policy |
| `genre` | enum | `fantasy` | Primary genre |
| `outputLanguage` | string | `es-ES` | Output language tag |

### Audience Options

- `middle-grade-8-9` — ages 8–9
- `middle-grade-9-10` — ages 9–10
- `profile-middle-grade-10-11` — ages 10–11 (default)
- `middle-grade-11-12` — ages 11–12

### Image Policy Options

- `local_only` — illustrations from local assets only
- `local_preferred` — prefer local, allow AI/SAAS as fallback
- `hybrid` — balanced local and external
- `saas_allowed` — allow AI/SAAS illustration services

### Genre Options

- `fantasy`
- `mystery`
- `adventure`
- `realistic`

## Outputs

Running `narrative init --recipe middle-grade-illustrated` produces:

```
<out>/
  narrative.yaml           # Project manifest
  .narrative/
    create-plan.json      # Canonical plan artifact
  profiles/
    profile-middle-grade-10-11.yaml
  canon/
    characters/
      protagonist.yaml
      deuteragonist.yaml
    chapters/
      01-opening.md
      02-incident.md
      03-resolution.md
  packs/
    story_core/
      story_intake.md
    characters/
      character_design.md
    editorial/
      editorial_pass.md
    visual_core/
      visual_bible_seed.md
  goals.yaml
```

## UAT-M10-04 Reference

This recipe is the reference implementation for UAT-M10-04 (round-trip equivalence). The `audience.profile`, `format`, `publishing`, `initialGoals`, and `project.{profiles,packs,skills,publishingTargets}` fields are owned by the recipe and are compared by the equivalence oracle while ignoring `createdAt`.

## Profile Alias Resolution

When `recipeProfileAliasResolution.enabled: true` (default), profile references are resolved via `specs/profile-aliases.yaml`.
