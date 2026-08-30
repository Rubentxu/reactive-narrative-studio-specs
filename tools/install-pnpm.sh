#!/usr/bin/env bash
# Bootstrap helper: install pnpm >=10 if not present.
# The packageManager pin in control-plane/package.json does the rest.
set -euo pipefail

PNPM_MIN_VERSION="10.0.0"
PNPM_URL="https://get.pnpm.io/install.sh"

check_version() {
    if command -v pnpm > /dev/null 2>&1; then
        local current
        current=$(pnpm --version)
        if [[ "$(printf '%s\n' "$PNPM_MIN_VERSION" "$current" | sort -V | head -n1)" == "$PNPM_MIN_VERSION" ]]; then
            echo "pnpm $current is already installed (>= $PNPM_MIN_VERSION)"
            return 0
        fi
    fi
    return 1
}

if check_version; then
    exit 0
fi

echo "Installing pnpm >= $PNPM_MIN_VERSION..."
curl -fsSL "$PNPM_URL" | sh -
