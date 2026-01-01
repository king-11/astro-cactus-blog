#!/usr/bin/env bash
# Script to convert Obsidian-style callouts to Astro-style callouts
# Also converts "date:" to "publishDate:" in frontmatter
# Requires: sd (brew install sd)

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <file.md> [--dry-run]"
  exit 1
fi

FILE="$1"
DRY_RUN=""

if [[ "${2:-}" == "--dry-run" ]]; then
  DRY_RUN="-p"
fi

if [[ ! -f "$FILE" ]]; then
  echo "Error: File '$FILE' not found"
  exit 1
fi

# Convert date: to publishDate: in frontmatter
sd $DRY_RUN '^date:' 'publishDate:' "$FILE"

# Convert Obsidian callouts to Astro format
sd $DRY_RUN '>\[!(\w+)\]\s*(.*)' ':::$1\n$2\n:::' "$FILE"

if [[ -z "$DRY_RUN" ]]; then
  echo "Converted: $FILE"
fi
