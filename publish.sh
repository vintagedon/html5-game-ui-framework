#!/usr/bin/env bash
# =============================================================================
# Script Name  : publish.sh
# Description  : Publish the reference application to the ML01 nginx preview
# Repository   : html5-game-ui-framework
# Author       : VintageDon (https://github.com/vintagedon/)
# Created      : 2026-08-03
# Link         : https://github.com/vintagedon/html5-game-ui-framework
# =============================================================================
#
# DESCRIPTION
#   Copies the framework source and Phase 1 reference surface to the ML01 nginx
#   web root so it is served at gameui.donfather.site. This is the framework's
#   only deploy; the framework itself is never deployed elsewhere, and games
#   built on it ship to their own hosts and are not tracked here (charter §6).
#   Before publishing it re-runs the Phase 1 invariants as guards: zero raster
#   assets under src/, and zero off-origin CSS/HTML/JS references.
#
# USAGE
#   ./publish.sh [options]
#
# EXAMPLES
#   ./publish.sh
#       Publish src/ and reference/ to the default web root, overwriting any
#       predecessor output and writing the root redirect.
#
#   ./publish.sh --check
#       Run the guards and report without publishing anything.
#
# =============================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# =============================================================================
# Configuration
# =============================================================================

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="${GC_WEB_ROOT:-/opt/agents/www/gameui}"
CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

# =============================================================================
# Functions
# =============================================================================

fail() { printf 'publish: %s\n' "$1" >&2; exit 1; }

run_guards() {
  # These are the Phase 1 invariants. Publishing is the moment they stop being
  # a local claim and start being something a reviewer sees, so they are checked
  # here rather than assumed from the last run.

  [ -d "$WEB_ROOT" ] || fail "web root missing: $WEB_ROOT"
  [ -w "$WEB_ROOT" ] || fail "web root not writable: $WEB_ROOT"
  [ -f "$REPO_ROOT/reference/index.html" ] || fail "no reference/index.html; nothing to publish"
  [ -f "$REPO_ROOT/src/gc.css" ] || fail "no src/gc.css; nothing to publish"

  rasters=$(find "$REPO_ROOT/src" -type f \
    \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \
       -o -iname '*.gif' -o -iname '*.avif' -o -iname '*.bmp' -o -iname '*.ico' \
       -o -iname '*.tiff' \) -print)
  [ -z "$rasters" ] || fail "raster assets found under src/, framework raster count must be zero:
$rasters"

  offsite=$(grep -rn --include='*.css' --include='*.html' --include='*.js' \
    -E 'url\((https?:)?//|@import[[:space:]]+url\((https?:)?//' \
    "$REPO_ROOT/src" "$REPO_ROOT/reference" || true)
  [ -z "$offsite" ] || fail "off-origin references found, external request count must be zero:
$offsite"
}

publish() {
  # The repo layout is mirrored under the web root because reference/index.html
  # links ../src/gc.css. Flattening it would require rewriting paths in a file
  # that is also served locally, so the structure is preserved and a redirect
  # sits at the root instead.

  rsync -a --delete "$REPO_ROOT/src/"       "$WEB_ROOT/src/"
  rsync -a --delete "$REPO_ROOT/reference/" "$WEB_ROOT/reference/"

  # Everything else in the web root is predecessor output. Remove it so the
  # preview shows this framework rather than a mix of two.
  find "$WEB_ROOT" -mindepth 1 -maxdepth 1 \
    ! -name src ! -name reference ! -name index.html -exec rm -rf {} +

  cat > "$WEB_ROOT/index.html" <<'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Game UI Foundations</title>
    <meta http-equiv="refresh" content="0; url=reference/">
    <link rel="canonical" href="reference/">
  </head>
  <body>
    <p><a href="reference/">Game UI Foundations reference</a></p>
  </body>
</html>
HTML
}

# =============================================================================
# Main
# =============================================================================

main() {
  run_guards

  if [ "$CHECK_ONLY" -eq 1 ]; then
    printf 'publish: guards pass. Would publish %s and %s to %s\n' \
      "src/" "reference/" "$WEB_ROOT"
    exit 0
  fi

  publish

  printf 'publish: %s -> %s\n' "$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'no-git')" "$WEB_ROOT"
  printf 'publish: http://gameui.donfather.site/\n'
}

main "$@"
