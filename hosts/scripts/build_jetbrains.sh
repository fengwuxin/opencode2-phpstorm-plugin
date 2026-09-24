#!/usr/bin/env bash
set -euo pipefail

# OpenCode UX+ JetBrains plugin build script (opencode v2, no bundled backend).
#
# The plugin talks to the opencode v2 CLI installed on the system, so no backend
# binaries are packaged. The UX+ web UI is built from packages/opencode/webgui and
# embedded into the plugin.
#
# Requirements:
#   - JDK 21 for Gradle (set JAVA_HOME or pass JDK_HOME=/path/to/jdk-21)
#   - bun (preferred), pnpm or npm for the web UI build
#
# Usage:
#   ./build_jetbrains.sh [--skip-webgui] [--local-ide /Applications/PhpStorm.app] [extra gradle args]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLUGIN_DIR="$ROOT_DIR/hosts/jetbrains-plugin"
GRADLEW="$PLUGIN_DIR/gradlew"
WEBGUI_DIR="$ROOT_DIR/packages/opencode/webgui"
WEBGUI_DIST="$ROOT_DIR/packages/opencode/webgui-dist"

SKIP_WEBGUI=false
LOCAL_IDE=""
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-webgui)
      SKIP_WEBGUI=true
      shift
      ;;
    --local-ide)
      LOCAL_IDE="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [--skip-webgui] [--local-ide <IDE path>] [gradle args]"
      exit 0
      ;;
    *)
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -n "${JDK_HOME:-}" ]]; then
  export JAVA_HOME="$JDK_HOME"
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
  echo "Error: JAVA_HOME is not set. JDK 21 is required to run Gradle." >&2
  exit 1
fi

echo "OpenCode UX+ JetBrains plugin build"
echo "  plugin : $PLUGIN_DIR"
echo "  java   : $JAVA_HOME"

# ─── Web UI ──────────────────────────────────────────────────────────────

if [[ "$SKIP_WEBGUI" == false ]]; then
  echo "=> Building web UI"
  cd "$WEBGUI_DIR"
  if [[ ! -d node_modules ]]; then
    if command -v bun >/dev/null 2>&1; then
      bun install
    elif command -v pnpm >/dev/null 2>&1; then
      pnpm install
    else
      npm install
    fi
  fi

  if command -v bun >/dev/null 2>&1; then
    bun run build
  elif command -v pnpm >/dev/null 2>&1; then
    pnpm run build
  else
    npm run build
  fi
fi

if [[ ! -d "$WEBGUI_DIST" ]]; then
  echo "Error: web UI build output not found at $WEBGUI_DIST" >&2
  exit 1
fi

# ─── Plugin ──────────────────────────────────────────────────────────────

echo "=> Building plugin"
if [[ ! -x "$GRADLEW" && -f "$GRADLEW" ]]; then
  chmod +x "$GRADLEW"
fi

cd "$PLUGIN_DIR"
# withWebgui=true embeds the built web UI into the plugin; without it Gradle only
# packs the Kotlin code and the plugin falls back to the official opencode web UI.
GRADLE_ARGS=(buildPlugin -PguiOnly=true -PwithWebgui=true "-PwebguiDist=$WEBGUI_DIST")
if [[ -n "$LOCAL_IDE" ]]; then
  GRADLE_ARGS+=("-PlocalIde=$LOCAL_IDE")
fi

"$GRADLEW" "${GRADLE_ARGS[@]}" "${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}"

echo "=> Build completed"
shopt -s nullglob
ARTIFACTS=("$PLUGIN_DIR"/build/distributions/*.zip)
shopt -u nullglob
if ((${#ARTIFACTS[@]} > 0)); then
  echo "Artifacts:"
  for a in "${ARTIFACTS[@]}"; do
    echo "  $a"
  done
fi
