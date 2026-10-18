#!/usr/bin/env bash
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
export FONTCONFIG_FILE="$root/.tools/fonts.conf"
export LD_LIBRARY_PATH="$root/.tools/qa-libs/usr/lib/x86_64-linux-gnu:$root/.tools/qa-libs/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export PLAYWRIGHT_BROWSERS_PATH="$root/.browsers"
npm --prefix "$root/qa" test
