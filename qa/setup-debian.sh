#!/usr/bin/env bash
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
mkdir -p "$root/.tools/qa-debs" "$root/.tools/qa-libs"
(
  cd "$root/.tools/qa-debs"
  # Download/extract only into this workspace; no system installation or sudo.
  # Requires populated Debian bookworm apt package indexes and network access.
  apt-get download libglib2.0-0 libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 \
    libdbus-1-3 libx11-6 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 \
    libgbm1 libxcb1 libxkbcommon0 libasound2 libatspi2.0-0 libx11-xcb1 libdrm2 \
    libxau6 libxdmcp6 libbsd0 libmd0 libxrender1 libwayland-server0 libxi6 fonts-liberation
  for package in *.deb; do dpkg-deb -x "$package" ../qa-libs; done
)
cp "$root/qa/fonts.conf" "$root/.tools/fonts.conf"
npm --prefix "$root/qa" ci --ignore-scripts --no-audit --no-fund
PLAYWRIGHT_BROWSERS_PATH="$root/.browsers" "$root/qa/node_modules/.bin/playwright" install chromium
printf '%s\n' 'Optional browser QA installed locally. Run bash qa/test-debian.sh from the repository.'
