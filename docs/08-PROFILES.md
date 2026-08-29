# Composable Profile System

## Goal

Support all audiences without embedding children-specific rules in the core.

## Profile axes

```text
AudienceProfile
LocaleProfile
FormatProfile
GenreProfile
ToneProfile
IntensityProfile
VisualProfile
PublishingProfile
ProviderPolicyProfile
```

Profiles compose into one effective configuration.

## Middle-grade reference profiles

Initial dogfood set:

- `middle-grade-8-9`
- `middle-grade-9-10`
- `profile-middle-grade-10-11`
> See also: specs/profile-aliases.yaml (canonical alias registry)
- `middle-grade-11-12`
- `middle-grade-flex-8-12`

The profiles SHOULD tune signals, not censor content.

## Example

```yaml
audience: "{{ profiles.profile-middle-grade-10-11 }}"
locale: es-ES
format: illustrated-novel
genre:
  - fantasy
  - mystery
tone: wonder-with-darkness
visual: painterly-storybook
publishing: print-a5
provider_policy: hybrid
```

## Audience dimensions

Potential signals:
- independent reading expectation;
- sentence complexity;
- unexplained rare-word density;
- chapter length range;
- POV complexity;
- number of concurrent subplots;
- timeline complexity;
- theme abstraction;
- fear intensity;
- violence explicitness;
- romance explicitness;
- illustration density.

These are recommendations/warnings unless explicitly configured as hard gates.

## Intensity matrix

Prefer:

```yaml
fear:
  frequency: medium
  explicitness: low
  duration: short

violence:
  frequency: low
  graphic_detail: none
  consequence: medium

grief:
  allowed: true
  framing: supportive
```

over `kids_safe=true`.

## Parent/author overrides

Profiles MUST be extensible:

```yaml
extends: "{{ profiles.profile-middle-grade-10-11 }}"

override:
  fear.intensity: high
  romance.presence: none
```

## Spanish readability

Reference metrics MAY include:
- Fernández-Huerta;
- Szigriszt-Pazos/INFLESZ.

They MUST be presented as signals, not literary judges.

## Format profiles

Initial:
- `short-story`
- `picture-book`
- `chapter-book`
- `illustrated-novel`
- `prose-novel`
- `graphic-novel`
- `comic`
- `manga`
- `webtoon`

## Provider policy profiles

- `local_only`
- `local_preferred`
- `hybrid`
- `saas_allowed`
- `budget`
- `quality_first`

The profile expresses policy; provider adapters express capabilities.
