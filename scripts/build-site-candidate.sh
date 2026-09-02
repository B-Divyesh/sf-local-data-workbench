#!/bin/sh
# Build a deployable static site only from the checkout named by the candidate.
# Keeping this check next to the build prevents a previously built `dist/site`
# from being deployed under the identity of a different desktop release.
set -eu

SOURCE_COMMIT=${1:?usage: scripts/build-site-candidate.sh <40-character-source-commit> [output-directory]}
OUTPUT_DIRECTORY=${2:-"$PWD/dist/site"}

if [ "${#SOURCE_COMMIT}" -ne 40 ] || ! printf '%s' "$SOURCE_COMMIT" | grep -Eq '^[0-9a-f]{40}$'; then
  echo "Source commit must be a 40-character lowercase SHA-1." >&2
  exit 2
fi

EXPECTED_COMMIT=$(git rev-parse "${SOURCE_COMMIT}^{commit}")
CURRENT_COMMIT=$(git rev-parse HEAD)

if [ "$CURRENT_COMMIT" != "$EXPECTED_COMMIT" ]; then
  echo "Refusing to build: checkout is $CURRENT_COMMIT, candidate is $EXPECTED_COMMIT." >&2
  echo "Check out the candidate in an isolated worktree before building its deploy artifact." >&2
  exit 1
fi

VITE_BUILD_ID="$EXPECTED_COMMIT" SITE_OUTPUT_DIR="$OUTPUT_DIRECTORY" npm run build:site

test -f "$OUTPUT_DIRECTORY/index.html"
test -f "$OUTPUT_DIRECTORY/staticwebapp.config.json"
if ! find "$OUTPUT_DIRECTORY/assets" -type f -name '*.js' -exec grep -lF "$EXPECTED_COMMIT" {} + | grep -q .; then
  echo "Built site does not contain the requested source revision." >&2
  exit 1
fi
for installer in install.sh install.ps1; do
  if ! grep -qF "$EXPECTED_COMMIT" "$OUTPUT_DIRECTORY/$installer" || grep -qF '__LDW_' "$OUTPUT_DIRECTORY/$installer"; then
    echo "Built $installer does not enforce the requested source revision." >&2
    exit 1
  fi
done

echo "Built static site for $EXPECTED_COMMIT at $OUTPUT_DIRECTORY"
