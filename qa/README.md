# Optional isolated browser QA

This directory is **not a runtime dependency** and is not needed by `npm test`,
`npm start`, the CLI demo or the application Dockerfile. It holds a separately
locked Playwright 1.64.1 developer test harness. No AI services are used by it.

It starts its own temporary loopback HTTP server and a fresh headless Chromium
profile, interacts through real DOM controls and closes both after the run.
It never attaches to the desktop browser or a user's profile, disables CSP or
uses a remote debugging endpoint. The Playwright clock controls time in tests;
the screenshots therefore show synthetic test clocks, not real-world runs.

## Standard setup on an OS with browser prerequisites

From the repository root:

```bash
npm --prefix qa ci --ignore-scripts --no-audit --no-fund
PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers" qa/node_modules/.bin/playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers" npm --prefix qa test
```

The install/browser download requires network. Subsequent runs are local/offline.
Missing shared libraries or fonts are setup failures, not skipped/passing tests.

## Minimal Debian bookworm container

The verification container lacked all Chromium libraries and fonts. To avoid
global installs, packages were downloaded from its configured Debian mirrors and
extracted into ignored `.tools/qa-libs/`. Browser binaries are in `.browsers/`.
The scripts reproduce this on Debian bookworm amd64 when apt indexes are available:

```bash
bash qa/setup-debian.sh
bash qa/test-debian.sh
```

If apt indexes are absent, ask the container administrator to refresh them.
The setup script does not run sudo, install system packages or update indexes.
Shared-library package versions come from configured Debian mirrors; this QA
setup is less strictly pinned than the dependency-free application runtime.

## Coverage and evidence

15 checked journeys: healthy load/keyboard mission controls; overheating and
latched recovery; low/critical battery; sensor failure; obstacle stop; stacked
priority/reset audit; sensor stale; heartbeat loss and reported/commanded split;
monitoring gap/shutdown; stale confirmation revalidation; synthetic return-to-base;
390px keyboard confirmation/touch sizes; 320px and 768px layout; module-load error.

Main journeys fail on captured console/page errors or failed requests. The last
journey intentionally aborts the monitor module and asserts its error state.
By default screenshots go into ignored `test-results/browser-qa/`, so running
QA does not modify tracked release evidence. To deliberately refresh genuine
release captures, run `CAPTURE_EVIDENCE=1 bash qa/test-debian.sh` and review the
resulting `docs/evidence/` changes before committing. `qa-failure.png` is an
ignored diagnostic overwritten on failure, never release evidence.

Automated Chromium is not manual screen-reader QA, Safari/Firefox coverage,
performance measurement, a full accessibility audit or hardware validation.
