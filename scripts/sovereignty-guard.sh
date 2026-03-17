#!/usr/bin/env bash
# scripts/sovereignty-guard.sh
# Pre-commit hook: prevents Tribal-specific data from entering the public engine repo.
# Exit 1 = reject commit. Exit 0 = allow commit.

set -euo pipefail

FAIL=0

# --- Pattern Configuration ---
# Tribe names and identifiers (case-insensitive grep patterns)
TRIBE_PATTERNS=(
    "nez.perce"
    "nimiipuu"
    "yakama"
    "umatilla"
    "warm.springs"
    "colville"
    "coeur.d.alene"
    "shoshone.bannock"
    "shoshone.paiute"
)

# Corpus data patterns
DATA_PATTERNS=(
    "corpus\.json"
    "sovereignty\.json"
    "T2"
    "T3"
    "TSDF_TIER.*[23]"
)

# File path patterns that should never exist in engine repo
BLOCKED_PATHS=(
    "corpus/"
    "config/sovereignty"
    "\.planning/"
    "\.claude/"
    "\.agents/"
)

# Documentation files are exempt from tribe name scanning
DOC_EXTENSIONS="md|txt|rst|html"

# --- Scan staged files ---
for file in "$@"; do
    # Check blocked path patterns
    for pattern in "${BLOCKED_PATHS[@]}"; do
        if echo "$file" | grep -qiE "$pattern"; then
            echo "SOVEREIGNTY GUARD: Blocked path pattern '$pattern' in: $file"
            FAIL=1
        fi
    done

    # Skip documentation files for tribe name scanning
    if echo "$file" | grep -qiE "\.(${DOC_EXTENSIONS})$"; then
        continue
    fi

    # Skip if file does not exist (deleted files)
    if [ ! -f "$file" ]; then
        continue
    fi

    # Scan file content for tribe name patterns
    for pattern in "${TRIBE_PATTERNS[@]}"; do
        if grep -qiE "$pattern" "$file" 2>/dev/null; then
            echo "SOVEREIGNTY GUARD: Tribe name pattern '$pattern' found in: $file"
            FAIL=1
        fi
    done

    # Scan file content for data patterns
    for pattern in "${DATA_PATTERNS[@]}"; do
        if grep -qiE "$pattern" "$file" 2>/dev/null; then
            echo "SOVEREIGNTY GUARD: Data pattern '$pattern' found in: $file"
            FAIL=1
        fi
    done
done

if [ "$FAIL" -ne 0 ]; then
    echo ""
    echo "SOVEREIGNTY GUARD FAILED: Tribal-specific data detected in staged files."
    echo "The engine repo must contain NO Tribe-specific data."
    echo "Move this content to the Tribe's private deployment repo."
    echo ""
    echo "To bypass (use with extreme caution): git commit --no-verify"
    exit 1
fi

exit 0
