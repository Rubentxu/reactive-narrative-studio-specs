#!/usr/bin/env bash
# tools/check-skill-crossrefs.sh
# Verifies docs/NN-*.md cross-references in SKILL.md files under examples/skills/.
# The script scans character-consistency, narrative-arc, and scene-validator
# SKILL.md files and validates that all cross-references to docs/NN-*.md exist.
set -euo pipefail

root="."
while [[ $# -gt 0 ]]; do
  case "$1" in
    --root)
      root="$2"
      shift 2
      ;;
    *)
      echo "Usage: $0 [--root <path>]" >&2
      exit 1
      ;;
  esac
done

# Files in scope for m8–m11 (character-consistency, narrative-arc, scene-validator)
scope_files=(
  "$root/examples/skills/character-consistency/SKILL.md"
  "$root/examples/skills/narrative-arc/SKILL.md"
  "$root/examples/skills/scene-validator/SKILL.md"
)

# Verify all scope files exist before scanning
for f in "${scope_files[@]}"; do
  if ! test -f "$f"; then
    echo "ERROR: scope file not found: $f" >&2
    exit 2
  fi
done

# Extract doc refs matching NN-*.md pattern (backtick or bold form) from scoped files
tmp=$(mktemp)
grep -hoE '(`docs/[0-9]{2}-[^`]+`|\*\*docs/[0-9]{2}-[^\*]+\*\*)' \
  "${scope_files[@]}" 2>/dev/null \
  | sed -E 's/^(`|\*\*)//; s/($|`|\*\*)//g' \
  | sort > "$tmp" || true

total=$(wc -l < "$tmp")
skill_files=3  # scope is fixed: character-consistency + narrative-arc + scene-validator

broken=0
while IFS= read -r ref; do
  [[ -z "$ref" ]] && continue
  target="$root/$ref"
  if ! test -f "$target"; then
    IFS= read -r location < <(
      grep -rnF "$ref" "${scope_files[@]}" 2>/dev/null \
      | head -1
    )
    echo "BROKEN: $location → $ref" >&2
    ((broken++)) || true
  fi
done < "$tmp"

rm -f "$tmp"

if (( broken > 0 )); then
  echo "FAIL: $broken broken cross-references." >&2
  exit 1
fi

echo "OK: $total cross-references verified across $skill_files skill files."
exit 0
