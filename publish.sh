#!/usr/bin/env bash
#
# Publish the reference application to the ML01 nginx preview.
#
# This is the framework's only deploy. The framework itself is never deployed;
# games built on it go elsewhere and are not tracked here. See charter section 6.
#
# The web root is ephemeral build output. Nothing lives there that does not come
# from this script, and the predecessor tree it overwrites is preserved at
# /opt/agents/repos-archive/gameui-browser-gaming-framework/.
#
# Usage:
#   ./publish.sh            publish to the default web root
#   ./publish.sh --check    run the guards and report, publish nothing

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="${GC_WEB_ROOT:-/opt/agents/www/gameui}"
CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

fail() { printf 'publish: %s\n' "$1" >&2; exit 1; }

# --- Guards -----------------------------------------------------------------
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

if [ "$CHECK_ONLY" -eq 1 ]; then
  printf 'publish: guards pass. Would publish %s and %s to %s\n' \
    "src/" "reference/" "$WEB_ROOT"
  exit 0
fi

# --- Publish ----------------------------------------------------------------
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

printf 'publish: %s -> %s\n' "$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'no-git')" "$WEB_ROOT"
printf 'publish: http://gameui.donfather.site/\n'
