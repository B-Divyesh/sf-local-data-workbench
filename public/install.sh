#!/bin/sh
set -eu

RELEASE_ROOT="https://github.com/B-Divyesh/sf-local-data-workbench/releases/latest/download"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT INT TERM

case "$(uname -s)" in
  Darwin)
    case "$(uname -m)" in arm64) PLATFORM="mac-arm64" ;; *) PLATFORM="mac-x64" ;; esac
    ;;
  Linux) PLATFORM="linux" ;;
  *) echo "Unsupported platform. Use the Windows installer or the releases page." >&2; exit 1 ;;
esac

curl -fsSL "$RELEASE_ROOT/latest.json" -o "$WORK_DIR/latest.json"
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to read the HTTPS release manifest." >&2
  exit 1
fi

URL="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["platforms"][sys.argv[2]]["url"])' "$WORK_DIR/latest.json" "$PLATFORM")"
EXPECTED="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["platforms"][sys.argv[2]]["sha256"])' "$WORK_DIR/latest.json" "$PLATFORM")"
NAME="$(basename "$URL")"
curl -fL "$URL" -o "$WORK_DIR/$NAME"

if command -v sha256sum >/dev/null 2>&1; then ACTUAL="$(sha256sum "$WORK_DIR/$NAME" | awk '{print $1}')"; else ACTUAL="$(shasum -a 256 "$WORK_DIR/$NAME" | awk '{print $1}')"; fi
if [ "$ACTUAL" != "$EXPECTED" ]; then echo "Checksum mismatch; refusing to install." >&2; exit 1; fi

if [ "$PLATFORM" = "linux" ]; then
  INSTALL_DIR="${XDG_BIN_HOME:-$HOME/.local/bin}"
  mkdir -p "$INSTALL_DIR"
  install -m 755 "$WORK_DIR/$NAME" "$INSTALL_DIR/local-data-workbench.AppImage"
  echo "Installed verified AppImage to $INSTALL_DIR/local-data-workbench.AppImage"
  echo "Run: $INSTALL_DIR/local-data-workbench.AppImage"
else
  DESTINATION="$HOME/Downloads/$NAME"
  cp "$WORK_DIR/$NAME" "$DESTINATION"
  echo "Downloaded and verified $DESTINATION"
  echo "Open the disk image, then drag Local Data Workbench to Applications. The preview is unsigned: right-click the app and choose Open the first time."
  open "$DESTINATION"
fi
