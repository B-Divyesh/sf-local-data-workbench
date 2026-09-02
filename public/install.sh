#!/bin/sh
set -eu

EXPECTED_COMMIT="__LDW_SOURCE_COMMIT__"
EXPECTED_VERSION="v__LDW_APP_VERSION__"
RELEASE_ROOT="${LDW_RELEASE_ROOT:-https://github.com/B-Divyesh/sf-local-data-workbench/releases/download/$EXPECTED_VERSION}"
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

if ! python3 -c 'import json,sys; manifest=json.load(open(sys.argv[1])); sys.exit(0 if manifest.get("commit") == sys.argv[2] and manifest.get("version") == sys.argv[3] else 1)' "$WORK_DIR/latest.json" "$EXPECTED_COMMIT" "$EXPECTED_VERSION"; then
  echo "Release identity mismatch. Expected $EXPECTED_VERSION from $EXPECTED_COMMIT. Nothing was downloaded or installed." >&2
  exit 1
fi

if ! python3 -c 'import json,sys; manifest=json.load(open(sys.argv[1])); sys.exit(0 if sys.argv[2] in manifest.get("platforms", {}) else 1)' "$WORK_DIR/latest.json" "$PLATFORM"; then
  echo "No installer is published for this platform. Nothing was downloaded or installed." >&2
  exit 1
fi

URL="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["platforms"][sys.argv[2]]["url"])' "$WORK_DIR/latest.json" "$PLATFORM")"
EXPECTED="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["platforms"][sys.argv[2]]["sha256"])' "$WORK_DIR/latest.json" "$PLATFORM")"
NAME="$(basename "$URL")"
if [ "$PLATFORM" = "mac-arm64" ] || [ "$PLATFORM" = "mac-x64" ]; then
  if ! python3 -c 'import json,sys; manifest=json.load(open(sys.argv[1])); sys.exit(0 if manifest.get("signing", {}).get("macos") else 1)' "$WORK_DIR/latest.json"; then
    echo "This macOS disk image is unsigned. Its SHA-256 is checked below, but no Apple signature is claimed." >&2
  fi
fi
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
  echo "Open the disk image, then drag Local Data Workbench to Applications."
  open "$DESTINATION"
fi
