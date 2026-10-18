# RoboSentinel release verification

## Scope and evidence discipline

Bounded local source/security review and software QA, performed through this
OmniRush.ai workspace. No external generative AI service or pentesting service
was used. Core source, UI, HTTP server, tests, scenario fixtures and packaging
were read directly; graph MCP/index coverage was unavailable, so no knowledge-
graph completeness is claimed. This is not a security certification or a
hardware test. Date: 18 October 2026 (Asia/Calcutta).

## Baseline before edits

- Clean `main`, HEAD `d9b0766`, one commit, no remote, no uncommitted changes.
- Node 22.23.3, npm 10.9.9; no Docker or GitHub CLI on PATH.
- `npm test`: 47 passed, 0 failed; `npm run check`: 14 files passed.
- `npm run demo`: all 3 checked-in deterministic scenarios passed.
- Existing loopback server: `/` returned 200, `/package.json` returned 404.

The previous handover's test counts and local implementation matched. Its
browser/publication limitations were real. Reproducible packaging was missing:
no runtime pin, lockfile, Dockerfile or CI configuration.

## Findings and resolution

| Priority | Finding and reproduction | Resolution |
| --- | --- | --- |
| Required / high safety-contract impact | `command('reset')` cleared latched conditions without core confirmation; added test failed before fix | Core requires strict `confirmed: true`; rejection preserves state, confirmed reset logs cleared IDs/causes/latch/shutdown; unsafe configured initial state is rechecked |
| Required / medium UI correctness | Inject overheating: monitoring badge stayed `badge healthy`; browser regression failed | Badge now reflects fault severity/latch/shutdown while identifying active monitoring |
| Required / medium error-state clarity | Module-load failure should not imply a known motion state | Failure UI marks commanded/motion state unavailable, warns that readings are stale, disables all controls; actual aborted-module browser check passes |
| Required / release reproducibility | Missing runtime pin, lockfile and container recipe | `.nvmrc`, empty root lockfile, Dockerfile, Makefile, minimal CI and MIT licence added |
| Low / residual | In-memory 300-event history can roll off, and reload discards it | Explicitly documented, not represented as durable/tamper-proof audit logging |
| Low / residual | No external-stream sequence/replay checks | No external telemetry adapter exists; detector is packet-local and monitor clock is monotonic; future hardware adapter requires separate validation |

No exploited network vulnerability was found in the bounded local surface.
That statement is not an exhaustive vulnerability-free claim.

## Security review boundaries

- **HTTP:** Only GET/HEAD for seven asset paths plus `/index.html`; methods such
  as POST/PUT/PATCH/DELETE/OPTIONS/TRACE are 405. No body parsing or state-changing
  robot endpoints. Query strings cannot dispatch commands.
- **Paths:** Exact raw-path allowlist with no path joins from user input. Tests
  include raw dot segments, encoded/double-encoded traversal, backslashes,
  null encoding, hidden files and malformed escapes; all rejected.
- **Browser injection:** UI uses DOM creation/textContent, not dynamic HTML,
  eval, scripts, external API data or untrusted templates. There are no runtime
  external requests, API keys, remote fonts or third-party scripts.
- **Headers:** CSP self-only scripts/styles, no objects/base/frame ancestors;
  nosniff, no-referrer and no-store. No permissive CORS. HTTP is loopback-only by
  default; no HSTS is asserted for a local HTTP service.
- **Safety:** Strict recovery/reset/shutdown confirmation and revalidation,
  independent stale clock, no automatic latch clearing, fresh recovery check,
  stopped configured-unsafe resets and distinct commanded/reported modes.
- **Dependencies:** Root has zero dependencies. Optional QA uses separately
  locked Playwright; no production runtime supply-chain additions. CI standard
  actions are commit-pinned, permissions read-only, no credential-bearing jobs.
- **Data:** All plant values are synthetic. No personal data or secrets are
  needed. Credentials, `.env`, browser binaries, local CLI and caches are ignored.
- **Residual exposure:** No authentication/rate limits/TLS termination are
  provided. Keep the prototype local; public/network deployment is not hardened
  as a robot control service. Nothing here commands real hardware.

## Automated verification results

- `npm test`: **51 passed, 0 failed**, no skipped tests.
- `npm run check`: **15 JavaScript files**, syntax checks only (not a linter).
- `npm run demo`: **3 scenarios**, all state/safety expectations passed.
- `make test`: passed all three commands after offline root `npm ci`.
- Optional `bash qa/test-debian.sh`: **15 Chromium journeys passed**.

The first reset test was red before its implementation. The browser badge
regression was red against the previous UI before the fix. Interim failures
were not hidden: optional browser setup initially lacked shared libraries and
fonts; they were downloaded/extracted into the workspace, never installed as
runtime dependencies. Two harness assertions were corrected to reflect visible
CSS capitalization and the revised reset audit text, not to weaken app behaviour.

## Browser verification details

Isolated headless Chromium **156.0.8078.4**, Playwright **1.64.1**. Temporary
loopback server and fresh profiles; no desktop-browser attachment, authentication
bypass, remote CDP connection or CSP bypass. The built-in browser timed out
before creating a tab; it contributes no passing evidence.

15 journeys exercised the real rendered controls: healthy load and telemetry;
keyboard start/pause; overheating; low/critical battery; failed sensor; obstacle;
stacked priority; cancelled/confirmed reset and retained audit; stale sensor;
lost heartbeat and reported/commanded split; monitoring gap; confirmed shutdown;
confirmation revalidation; synthetic return-to-base; desktop/tablet/narrow
layouts; keyboard cancel-first confirmation; deliberate module-load error.

No captured page/console errors or failed asset requests in the normal journeys.
One failure journey intentionally aborts the monitor module and verifies the
resulting disabled/error UI; it is not counted as a healthy network load.
Primary text/semantic colour tokens meet >=4.5:1 against white and canvas in
the automated contrast test. Screenshot review and bounding-box assertions
checked viewport containment; control heights are >=44px. This does not certify
all contrast states or WCAG compliance.

## Clean-checkout reproduction

A separate local Git clone of `f9bf10366529e95ea35737e9307b22826296a66a`
(all final application/test/packaging code and README instructions) was created
under ignored `.verification/clean-checkout/`; no QA dependencies, browser
binaries, working-tree overlays or local tools were copied into that clone.

Executed there, in order:

1. `npm ci --ignore-scripts --offline --no-audit --no-fund` — passed.
2. `npm test` — 51 passed, 0 failed, no skips.
3. `npm run check` — 15 JavaScript files passed.
4. `npm run demo` — all 3 scenarios passed.
5. Start `node server.js` (the package start entrypoint) with `HOST=127.0.0.1`
   and the documented alternate `PORT=3100` — printed the correct address.
6. Seven dashboard/module asset routes returned 200; four forbidden/unknown
   paths returned 404. The child server was then stopped.
7. Clone working tree remained clean after the documented core checks.

The original default `127.0.0.1:3000` server was also HTTP-smoke checked.
This is a fresh checkout on the available Debian/Node environment, not a
Docker build or a test on every Linux distribution. The final documentation
receipt commit may follow this tested snapshot without changing application code.

**NOT TESTED:** Safari, Firefox, physical mobile devices, manual screen-reader
usability, real hardware, performance/load metrics and durable log retention.

## Genuine captures

See `docs/evidence/` and `docs/demo-walkthrough.md`. PNGs are unmodified actual
test-browser screenshots with synthetic readings and controlled test clocks.
No video or public demo link has been created.

## External release status

- **BLOCKED:** GitHub publication; local CLI reports not authenticated, no remote.
- **NOT TESTED:** Docker image build/run; Docker engine unavailable.
- **NOT TESTED:** Hosted CI; workflow added but no remote run exists.
- **BLOCKED:** Buildathon submission; no official form, character limit, verified
  track/eligibility guidance or submission receipt has been supplied.
- One genuine RoboSentinel session is confirmed by OmniRush session search;
  this does not by itself prove event eligibility or create a public session link.
