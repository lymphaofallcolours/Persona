#!/usr/bin/env bash
# Install git hooks for Persona.
# Run this after cloning: bash scripts/install-hooks.sh

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_SRC="$REPO_ROOT/scripts/hooks"
HOOKS_DST="$REPO_ROOT/.git/hooks"

if [ ! -d "$HOOKS_SRC" ]; then
    echo "Error: scripts/hooks/ directory not found."
    exit 1
fi

cp "$HOOKS_SRC/commit-msg" "$HOOKS_DST/commit-msg"
cp "$HOOKS_SRC/post-commit" "$HOOKS_DST/post-commit"
chmod +x "$HOOKS_DST/commit-msg" "$HOOKS_DST/post-commit"

echo "Git hooks installed successfully."
