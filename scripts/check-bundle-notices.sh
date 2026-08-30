#!/bin/sh
# @claim:bundled-license-notices
set -eu
sh scripts/ensure-tauri-linux-deps.sh
CI=true npm run tauri build -- --bundles deb
PACKAGE="$(find src-tauri/target/release/bundle/deb -name '*.deb' -print -quit)"
test -n "$PACKAGE"
CONTENTS="$(dpkg-deb -c "$PACKAGE")"
printf '%s\n' "$CONTENTS" | grep -q 'LICENSE$'
printf '%s\n' "$CONTENTS" | grep -q 'THIRD_PARTY_NOTICES.md$'
printf '%s\n' "$CONTENTS" | grep -q 'Apache-2.0.txt$'
