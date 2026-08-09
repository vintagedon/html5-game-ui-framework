#!/usr/bin/env bash
# =============================================================================
# Script Name  : publish.sh
# Description  : Stage, swap, and smoke-test the ML01 nginx preview
# Repository   : html5-game-ui-framework
# Author       : VintageDon (https://github.com/vintagedon/)
# Created      : 2026-08-03
# Link         : https://github.com/vintagedon/html5-game-ui-framework
# =============================================================================
#
# DESCRIPTION
#   Builds a fresh sibling tree containing the framework source, reference
#   application, browser-required harness modules, and generated metrics. It
#   validates that exact tree, relocates the previous preview to the estate
#   recycle bin, swaps the staged tree into place, and smoke-tests the nginx URL.
#   A failed smoke test automatically restores the previous preview.
#
# USAGE
#   ./publish.sh [options]
#
# EXAMPLES
#   ./publish.sh
#       Publish a validated staged tree to the default web root.
#
#   ./publish.sh --check
#       Build and guard a staged tree without changing the live preview. The
#       checked tree is retained in the recycle bin for inspection.
#
# =============================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# =============================================================================
# Configuration
# =============================================================================

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="${GC_WEB_ROOT:-/opt/agents/www/gameui}"
RECYCLE_ROOT="${GC_RECYCLE_ROOT:-/opt/agents/recycle-bin}"
PREVIEW_URL="${GC_PREVIEW_URL:-https://gameui.donfather.site/reference/}"
SMOKE_RESULT="${GC_SMOKE_RESULT:-$REPO_ROOT/staging/published-smoke.json}"
EXPECTED_SCENARIOS="${GC_SMOKE_EXPECT_SCENARIOS:-7}"
CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

PUBLISH_DATE="$(date -u +%Y-%m-%d)"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
WEB_PARENT="$(dirname "$WEB_ROOT")"
WEB_NAME="$(basename "$WEB_ROOT")"
STAGE_ROOT="$WEB_PARENT/.${WEB_NAME}-stage-$RUN_ID"
BACKUP_ROOT="$RECYCLE_ROOT/${PUBLISH_DATE}-${WEB_NAME}-preview-before-$RUN_ID"
FAILED_ROOT="$RECYCLE_ROOT/${PUBLISH_DATE}-${WEB_NAME}-preview-failed-$RUN_ID"
ABORTED_ROOT="$RECYCLE_ROOT/${PUBLISH_DATE}-${WEB_NAME}-preview-aborted-$RUN_ID"
CHECKED_ROOT="$RECYCLE_ROOT/${PUBLISH_DATE}-${WEB_NAME}-preview-checked-$RUN_ID"
STATE="initial"

# =============================================================================
# Functions
# =============================================================================

fail() { printf 'publish: %s\n' "$1" >&2; exit 1; }

validate_configuration() {
  [ -z "${2:-}" ] || fail "usage: ./publish.sh [--check]"
  [ "${1:-}" = "" ] || [ "${1:-}" = "--check" ] || fail "unknown option: ${1:-}"
  [ "$WEB_PARENT" = "/opt/agents/www" ] || fail "web root must be a direct child of /opt/agents/www: $WEB_ROOT"
  [ "$WEB_NAME" = "gameui" ] || fail "unexpected preview target: $WEB_ROOT"
  [ "$RECYCLE_ROOT" = "/opt/agents/recycle-bin" ] || fail "unexpected recycle root: $RECYCLE_ROOT"
  [ -d "$WEB_PARENT" ] || fail "web parent missing: $WEB_PARENT"
  [ -w "$WEB_PARENT" ] || fail "web parent not writable: $WEB_PARENT"
  [ -d "$RECYCLE_ROOT" ] || fail "recycle root missing: $RECYCLE_ROOT"
  [ -w "$RECYCLE_ROOT" ] || fail "recycle root not writable: $RECYCLE_ROOT"
  [ -d "$WEB_ROOT" ] || fail "web root missing: $WEB_ROOT"
  [ ! -L "$WEB_ROOT" ] || fail "web root must not be a symbolic link: $WEB_ROOT"
  [ ! -e "$STAGE_ROOT" ] || fail "staging target already exists: $STAGE_ROOT"
  [ ! -e "$BACKUP_ROOT" ] || fail "backup target already exists: $BACKUP_ROOT"
  [ ! -e "$FAILED_ROOT" ] || fail "failed-tree target already exists: $FAILED_ROOT"
  case "$EXPECTED_SCENARIOS" in
    ''|*[!0-9]*) fail "expected scenario count must be a nonnegative integer: $EXPECTED_SCENARIOS" ;;
  esac
}

move_directory() {
  local source_path="$1"
  local target_path="$2"
  local target_parent
  local source_device
  local target_device

  [ -n "$source_path" ] || fail "refusing to move an empty source path"
  [ -n "$target_path" ] || fail "refusing to move to an empty target path"
  [ -d "$source_path" ] || fail "move source is not a directory: $source_path"
  [ ! -L "$source_path" ] || fail "move source must not be a symbolic link: $source_path"
  [ ! -e "$target_path" ] || fail "move target already exists: $target_path"
  target_parent="$(dirname "$target_path")"
  [ -d "$target_parent" ] || fail "move target parent missing: $target_parent"
  [ -w "$target_parent" ] || fail "move target parent not writable: $target_parent"
  source_device="$(stat -c '%d' "$source_path")"
  target_device="$(stat -c '%d' "$target_parent")"
  [ -n "$source_device" ] || fail "could not resolve source device: $source_path"
  [ "$source_device" = "$target_device" ] || fail "directory move must stay on one filesystem: $source_path -> $target_path"

  mv -- "$source_path" "$target_path"
}

preserve_aborted_stage() {
  local exit_code=$?
  if [ "$exit_code" -ne 0 ] && { [ "$STATE" = "staging" ] || [ "$STATE" = "staged" ]; } && [ -d "$STAGE_ROOT" ] && [ ! -L "$STAGE_ROOT" ]; then
    if [ ! -e "$ABORTED_ROOT" ]; then
      mv -- "$STAGE_ROOT" "$ABORTED_ROOT" || true
      printf 'publish: preserved aborted staged tree at %s\n' "$ABORTED_ROOT" >&2
    fi
  fi
}

trap preserve_aborted_stage EXIT

run_project_checks() {
  cd "$REPO_ROOT"
  npm run validate
  npm run metrics
}

stage_file() {
  local relative_path="$1"
  mkdir -p "$(dirname "$STAGE_ROOT/$relative_path")"
  rsync -a "$REPO_ROOT/$relative_path" "$STAGE_ROOT/$relative_path"
}

stage_tree() {
  mkdir "$STAGE_ROOT"
  STATE="staging"

  mkdir -p "$STAGE_ROOT/src" "$STAGE_ROOT/reference"
  rsync -a "$REPO_ROOT/src/" "$STAGE_ROOT/src/"
  rsync -a "$REPO_ROOT/reference/" "$STAGE_ROOT/reference/"

  # These are the complete browser import and fetch closure for reference.js.
  # Node-only validators, Playwright code, candidates, and test sources stay out.
  stage_file "harness/app/render.js"
  stage_file "harness/app/specimens.js"
  stage_file "harness/auditor/auditor.js"
  stage_file "harness/registry/layers.js"
  stage_file "harness/registry/scenarios.js"
  stage_file "harness/metrics/metrics.json"

  cat > "$STAGE_ROOT/index.html" <<'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Game UI Conformance Surface</title>
    <meta http-equiv="refresh" content="0; url=reference/">
    <link rel="canonical" href="reference/">
  </head>
  <body>
    <p><a href="reference/">Game UI Conformance Surface</a></p>
  </body>
</html>
HTML
  STATE="staged"
}

run_guards() {
  local candidate_root="$1"
  local rasters
  local offsite
  local links
  local harness_file
  local relative_path

  [ "$candidate_root" = "$STAGE_ROOT" ] || fail "guards must inspect the declared staged tree: $candidate_root"
  [ -d "$candidate_root" ] || fail "staged tree missing: $candidate_root"
  [ ! -L "$candidate_root" ] || fail "staged tree must not be a symbolic link: $candidate_root"
  [ -f "$candidate_root/index.html" ] || fail "staged root redirect missing"
  [ -f "$candidate_root/reference/index.html" ] || fail "staged reference/index.html missing"
  [ -f "$candidate_root/src/gc.css" ] || fail "staged src/gc.css missing"
  [ -f "$candidate_root/harness/app/render.js" ] || fail "staged browser module missing: harness/app/render.js"
  [ -f "$candidate_root/harness/app/specimens.js" ] || fail "staged browser module missing: harness/app/specimens.js"
  [ -f "$candidate_root/harness/auditor/auditor.js" ] || fail "staged browser module missing: harness/auditor/auditor.js"
  [ -f "$candidate_root/harness/registry/layers.js" ] || fail "staged browser module missing: harness/registry/layers.js"
  [ -f "$candidate_root/harness/registry/scenarios.js" ] || fail "staged browser module missing: harness/registry/scenarios.js"
  [ -f "$candidate_root/harness/metrics/metrics.json" ] || fail "staged generated metrics missing: harness/metrics/metrics.json"

  while IFS= read -r harness_file; do
    relative_path="${harness_file#"$candidate_root/"}"
    case "$relative_path" in
      harness/app/render.js|harness/app/specimens.js|harness/auditor/auditor.js|harness/registry/layers.js|harness/registry/scenarios.js|harness/metrics/metrics.json) ;;
      *) fail "unexpected harness file in staged browser closure: $relative_path" ;;
    esac
  done < <(find "$candidate_root/harness" -type f -print)

  links="$(find "$candidate_root" -type l -print)"
  [ -z "$links" ] || fail "symbolic links found in staged tree:
$links"

  rasters="$(find "$candidate_root/src" -type f \
    \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \
       -o -iname '*.gif' -o -iname '*.avif' -o -iname '*.bmp' -o -iname '*.ico' \
       -o -iname '*.tiff' \) -print)"
  [ -z "$rasters" ] || fail "raster assets found under staged src/, framework raster count must be zero:
$rasters"

  offsite="$(grep -rn --include='*.css' --include='*.html' --include='*.js' \
    -E 'url\((https?:)?//|@import[[:space:]]+url\((https?:)?//' \
    "$candidate_root/src" "$candidate_root/reference" "$candidate_root/harness" || true)"
  [ -z "$offsite" ] || fail "off-origin references found, static scan count must be zero:
$offsite"

  printf 'publish: staged guards pass: %s\n' "$candidate_root"
}

publish_staged_tree() {
  local smoke_status

  move_directory "$WEB_ROOT" "$BACKUP_ROOT"
  STATE="live-relocated"
  if ! move_directory "$STAGE_ROOT" "$WEB_ROOT"; then
    move_directory "$BACKUP_ROOT" "$WEB_ROOT"
    STATE="restored"
    fail "staged swap failed; previous preview restored"
  fi
  STATE="swapped"

  if node "$REPO_ROOT/harness/runner/smoke-published.js" \
    --url "$PREVIEW_URL" \
    --result "$SMOKE_RESULT" \
    --expected-scenarios "$EXPECTED_SCENARIOS"; then
    STATE="published"
  else
    smoke_status=$?
    move_directory "$WEB_ROOT" "$FAILED_ROOT"
    move_directory "$BACKUP_ROOT" "$WEB_ROOT"
    STATE="restored"
    printf 'publish: smoke test failed; previous preview restored automatically\n' >&2
    printf 'publish: failed staged tree retained at %s\n' "$FAILED_ROOT" >&2
    exit "$smoke_status"
  fi
}

# =============================================================================
# Main
# =============================================================================

main() {
  validate_configuration "$@"
  run_project_checks
  stage_tree
  run_guards "$STAGE_ROOT"

  if [ "$CHECK_ONLY" -eq 1 ]; then
    move_directory "$STAGE_ROOT" "$CHECKED_ROOT"
    STATE="checked"
    printf 'publish: check complete; staged tree retained at %s\n' "$CHECKED_ROOT"
    exit 0
  fi

  publish_staged_tree

  printf 'publish: %s -> %s\n' "$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'no-git')" "$WEB_ROOT"
  printf 'publish: %s\n' "$PREVIEW_URL"
  printf 'publish: previous preview retained at %s\n' "$BACKUP_ROOT"
  printf "publish: restore command: mv -- '%s' '%s.manual-replacement' && mv -- '%s' '%s'\n" \
    "$WEB_ROOT" "$FAILED_ROOT" "$BACKUP_ROOT" "$WEB_ROOT"
}

main "$@"
