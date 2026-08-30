#!/bin/sh
# Makes the Debian package claim runnable from a clean Ubuntu worker. The same
# package list is used by the release workflow.
set -eu

if [ "$(uname -s)" != "Linux" ]; then
  exit 0
fi

if pkg-config --exists glib-2.0; then
  exit 0
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "Tauri Linux dependencies are missing (glib-2.0.pc). Install the packages in .github/workflows/release.yml." >&2
  exit 1
fi

if [ "$(id -u)" -eq 0 ]; then
  APT="apt-get"
elif command -v sudo >/dev/null 2>&1; then
  APT="sudo apt-get"
else
  echo "Tauri Linux dependencies are missing and this worker cannot run apt-get." >&2
  exit 1
fi

$APT update
$APT install -y file libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf rpm xdg-utils
