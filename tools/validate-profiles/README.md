# validate-profiles

Profile validation tool for the M10.2 Capability Catalog.

## Purpose

Validates profile YAML files against `specs/profile.schema.json`. Mirrors the
structure of `tools/validate-recipes/` (M10.1).

## Scope

The validator walks the target path recursively and validates only files that:
- Are `*.yaml`
- Are NOT `recipe.yaml`, `parameters.schema.json`, or `ui.schema.json`
- Are NOT under `tests/negative-fixtures/`
- Start with `schema: profile/v1` (the profile schema marker)

## Usage

```bash
# Validate one profile file
python tools/validate-profiles/validate.py examples/middle-grade-profile.yaml

# Validate all profiles under examples/
python tools/validate-profiles/validate.py examples/

# Validate all profiles under recipes/ (recipe-scoped profiles)
python tools/validate-profiles/validate.py recipes/
```

## Exit codes

- `0`: all checks passed (warnings may be present)
- `1`: validation error (schema violation, etc.)
- `2`: file not found / layout error

## CI integration

Add to your CI pipeline as a guard before any catalog rebuild:

```yaml
- name: Validate profiles
  run: python tools/validate-profiles/validate.py examples/
- name: Validate recipe profiles
  run: python tools/validate-profiles/validate.py recipes/
```
