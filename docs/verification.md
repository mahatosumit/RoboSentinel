# RoboSentinel release verification

## Scope and evidence discipline

Bounded local source/security review and software QA, performed through this
OmniRush.ai workspace. No external generative AI service or pentesting service
was used. Core source, UI, HTTP server, tests, scenario fixtures and packaging
were read directly; graph MCP/index coverage was unavailable, so no knowledge-
graph completeness is claimed. This is not a security certification or a
hardware test. Initial review began 18 October 2026; the presentation/rules
refresh below was verified on 19 October 2026 (Asia/Calcutta / IST).

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
  The user reports having signed in, but the workspace Linux CLI cannot see a
  logged-in host. No credentials were read/copied to bridge environments.
- **NOT TESTED:** Docker image build/run; Docker engine unavailable.
- **NOT TESTED:** Hosted CI; workflow added but no remote run exists.
- **BLOCKED:** Buildathon submission; the official guide and dashboard URL are
  now verified, but authenticated form limits, individual eligibility, public repo,
  selected sessions and a real submission receipt are still unverified.
- One genuine RoboSentinel session is confirmed by OmniRush session search;
  this does not by itself prove event eligibility or create a public session link.

## Presentation and official-rules refresh — 19 October 2026

Baseline before edits was clean `main` at
`f230795ed2ad0c5e1c42b4e6eb623f74ffd9623e`. `git cat-file -t` confirmed that
reported release object is a commit in this repository; no history discrepancy
or user changes were found. Ignored tools, browser binaries, dependencies,
diagnostic images and the previous clean checkout remain outside the release tree.

Fresh commands before presentation edits:

- `npm test` — **51 passed, 0 failed, 0 skipped**.
- `npm run check` — **15 JavaScript files passed**.
- `npm run demo` — **3 scenarios passed**.
- `bash qa/test-debian.sh` — **15 automated Chromium journeys passed**.
- `.tools/github/usr/bin/gh auth status` — **not logged into any GitHub hosts**.
- `git remote -v` — **no configured remote**.

The README was rewritten with the actual module graph, source-derived fault and
recovery table, shell-specific port instructions, genuine screenshot captions,
contributing guidance, MIT terms and a clearly planned roadmap. Existing PNGs,
runtime code, application configuration values, tests and scenarios were preserved.
A nonsecret `.env.example` documents existing HOST/PORT process settings only;
the server still does not automatically read dotenv files. The implementation
contract now precisely states return-to-base eligibility (only no faults or
warning-level low battery), rather than the broader phrase “no blocking faults.”

Official guidance was reached from the organizer homepage and read at
**https://omnirush.ai/buildathon**. Verified facts:

- Submission closes **20 October 2026, 23:59 IST (18:29 UTC)** by server clock.
- Joining for prize eligibility closes **19 October 2026, 23:59 IST**.
- Online/solo, fresh event work and OmniRush-only generative AI are required.
- The public repo must belong to the connected GitHub account (at least 3 days old).
- README and genuine build sessions are required; video and live URL are optional.
- A **2–3 minute** video is recommended; the local 60–90 second walkthrough is
  the core segment, with an optional longer recording outline now documented.
- Open Frontier is track 06, defined as “Anything else. Surprise us.” It is a
  reasonable proposal for this robotics simulator, not verified account eligibility.
- The dashboard submission produces a Submission ID to copy into Unstop.

The official dashboard at **https://omnirush.ai/console/buildathon** exposed only
a loading shell to the read-only fetch, and the organizer-linked Unstop page did
not expose event details. No authenticated form, character limit, selected account,
successful submission, public GitHub rendering or screenshot HTTP response has
been verified. `docs/submission.md` separates these blockers from known rules.

After the presentation edits, the same core commands again passed with **51
tests, 15 syntax-checked files and 3 deterministic scenarios**, and the browser
harness again passed **15 journeys**. A local documentation check validated
**38 relative Markdown links/anchors**, the signatures/dimensions of all **5
tracked PNGs**, and the **62/464-character** title/description. It did not render
GitHub's Mermaid/Markdown or inspect a public repo. A diff against `f230795`
confirmed the runtime, UI, tests, scenarios, scripts and tracked screenshots
were unchanged by this documentation-only refresh.
