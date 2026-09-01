#!/bin/sh
# Builds the release checksum manifest. SHA256SUMS intentionally never hashes
# itself (or latest.json), so `sha256sum -c SHA256SUMS` is a complete check.
set -eu

asset_dir=${1:?release asset directory is required}
version=${2:?release version is required}
commit=${3:?source commit is required}
macos_signed=${4:?macOS signing status is required}
windows_signed=${5:?Windows signing status is required}

case "$macos_signed" in true|false) ;; *) echo 'macOS signing status must be true or false.' >&2; exit 2 ;; esac
case "$windows_signed" in true|false) ;; *) echo 'Windows signing status must be true or false.' >&2; exit 2 ;; esac

cd "$asset_dir"
## `actions/download-artifact` preserves bundle directories. Release assets
## must be flat so their GitHub URL names match the checksummed filenames.
find . -mindepth 2 -type f -print | while IFS= read -r asset; do
  target="./$(basename "$asset")"
  if [ -e "$target" ]; then
    echo "Release asset name collision: $target" >&2
    exit 2
  fi
  mv "$asset" "$target"
done
find . -mindepth 1 -depth -type d -empty -delete
rm -f SHA256SUMS latest.json
sum_tmp=$(mktemp)
trap 'rm -f "$sum_tmp"' EXIT HUP INT TERM
find . -maxdepth 1 -type f -printf '%f\n' | LC_ALL=C sort | while IFS= read -r file; do sha256sum "$file"; done > "$sum_tmp"
mv "$sum_tmp" SHA256SUMS
test ! -s SHA256SUMS || ! grep -Eq '[[:space:]](\./)?(SHA256SUMS|latest\.json)$' SHA256SUMS

asset_json() {
  asset_name=$1
  asset_hash=$(sha256sum "$asset_name" | awk '{print $1}')
  asset_encoded=$(jq -rn --arg value "$asset_name" '$value|@uri')
  jq -n --arg name "$asset_name" --arg url "https://github.com/B-Divyesh/sf-local-data-workbench/releases/download/$version/$asset_encoded" --arg sha256 "$asset_hash" '{name:$name,url:$url,sha256:$sha256}'
}

linux_file=$(find . -maxdepth 1 -name '*.AppImage' -printf '%f\n' | LC_ALL=C sort | head -n1)
test -n "$linux_file"
jq -n --arg version "$version" --arg commit "$commit" --argjson macos "$macos_signed" --argjson windows "$windows_signed" --argjson linux "$(asset_json "$linux_file")" '{version:$version,commit:$commit,signing:{macos:$macos,windows:$windows},platforms:{linux:$linux}}' > latest.json

if [ "$macos_signed" = true ]; then
  arm_file=$(find . -maxdepth 1 -iname '*aarch64*.dmg' -printf '%f\n' | LC_ALL=C sort | head -n1)
  x64_file=$(find . -maxdepth 1 -name '*.dmg' ! -iname '*aarch64*' -printf '%f\n' | LC_ALL=C sort | head -n1)
  test -n "$arm_file" && test -n "$x64_file"
  jq --argjson arm "$(asset_json "$arm_file")" --argjson x64 "$(asset_json "$x64_file")" '.platforms["mac-arm64"]=$arm | .platforms["mac-x64"]=$x64' latest.json > latest.tmp && mv latest.tmp latest.json
fi

if [ "$windows_signed" = true ]; then
  windows_file=$(find . -maxdepth 1 \( -name '*.msi' -o -name '*.exe' \) -printf '%f\n' | LC_ALL=C sort | head -n1)
  test -n "$windows_file"
  jq --argjson windows "$(asset_json "$windows_file")" '.platforms.windows=$windows' latest.json > latest.tmp && mv latest.tmp latest.json
fi

jq empty latest.json
