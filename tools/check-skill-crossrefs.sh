#!/usr/bin/env bash
# tools/check-skill-crossrefs.sh
# Verifies docs/NN-*.md cross-references in the two SKILL.md files touched by wave-8A.
# The script scans all examples/skills/*/SKILL.md but only validates refs that appear
# in character-consistency and narrative-arc (the 8A scope). Future cycles that close
# DEBT-COUPLING-NEW-002 (scene-validator) can extend this list.
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

# Files in scope for m8 wave-8A
scope_files=(
  "$root/examples/skills/character-consistency/SKILL.md"
  "$root/examples/skills/narrative-arc/SKILL.md"
)

# Extract doc refs matching NN-*.md pattern (backtick or bold form) from scoped files
tmp=$(mktemp)
grep -hoE '(`docs/[0-9]{2}-[^`]+`|\*\*docs/[0-9]{2}-[^\*]+\*\*)' \
  "${scope_files[@]}" 2>/dev/null \
  | sed -E 's/^(`|\*\*)//; s/($|`|\*\*)//g' \
  | sort > "$tmp" || true

total=$(wc -l < "$tmp")
skill_files=2  # scope is fixed: 2 files from wave-8A

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
