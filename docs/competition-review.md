# RoboSentinel — competition review and release decision

Reviewed **19 October 2026, IST**. This is a self-review, not an organizer score,
an independent user study, or a prediction of winning. Technical observations
below are supported by source/tests; usefulness and competitive value are
explicit engineering judgments. Baseline: `514e552`; implemented replay: `af705d3`.

## A. Official competition assessment

Source: [organizer's full event guide](https://omnirush.ai/buildathon), fetched
again on 19 October. The organizer-linked Unstop page exposed no additional
rules in the read-only response. Signed-in dashboard fields remain unverified.

| Published criterion | Current assessment, not an official score | Evidence / remaining weakness |
| --- | --- | --- |
| **It works** | Strong bounded software evidence | 60 passing tests, actual controls and 19 Chromium journeys; no hardware/field validation |
| **It's worth using** | Plausible educational/operator-review tool; impact not validated | Replay explains why fresh communications, clear faults and motion authorization are different; no user interviews, adoption or measured operator benefit |
| **It rebuilds** | Locally reproducible; mandatory Docker evidence gap remains | Pinned Node, lockfiles, zero-dependency runtime, offline core checks and container recipe; Docker/hosted CI not executed |
| **OmniRush built it** | Traceable local work; organizer acceptance not established | Genuine session, source/commits, two bounded implementation agents, tests and review; sessions still must be selected/accepted in the event dashboard |

**The guide publishes no category weights or numeric scoring scale.** The ten
audit dimensions below are a provisional diagnostic checklist, not an invented
weighted rubric. Best Use explicitly values clear sessions, smart sub-agent use,
tests and clean rebuilding; it does not publish a numerical formula.

### Exact track definitions

| Track | Organizer's definition |
| --- | --- |
| Agents & Automation | Software that does a chore for you, start to finish. |
| Developer Tools & Open Source | Tools that make coding easier for other people. |
| Research, Data & Scientific Computing | Turn numbers and data into answers. |
| Systems, Infrastructure & Cybersecurity | Keep computers running, fast and safe. |
| Human × AI | Better ways for people and AI to work together. |
| **Open Frontier** | **Anything else. Surprise us.** |

**Recommendation: Open Frontier (06)**. A robotics safety-policy learning tool is
not directly described by the computer-infrastructure track. This is a fit
judgment, not a verified dashboard selection.

### Eligibility, judging media and timing

- Solo/online; start fresh during the event, **14 October 00:00 IST** onward.
- OmniRush is the only generative AI allowed for code, text and images; ordinary
  search/documentation/tooling is allowed. Do not add external AI autocomplete.
- Public source repository on the connected GitHub account; account at least
  three days old. README and genuine OmniRush build sessions are required.
- Judges compare code with sessions, rebuild source in Docker on clean Linux and
  run tests offline. Video/live links help communicate working behavior but are
  optional; a **2–3 minute video is recommended**, not mandatory.
- Join/registration for prize eligibility closes **19 October, 23:59 IST**.
- Submission locks **20 October, 23:59 IST / 18:29 UTC**, by the server clock.
- Dashboard submission returns a Submission ID to paste into Unstop. No real
  ID, eligible account state or completed registration has been verified here.
- The public guide specifies rebuild/runtime/lockfile/secrets/path rules, but no
  additional blanket ban on dependencies, APIs, hosting providers or hardware.
  That absence is not permission to ignore other terms or authenticated rules.

At the initial measured clock, **19 October 00:24:50 IST**, approximately
**47 h 34 min** remained before submission and **23 h 34 min** before joining
closed. The clock was measured, not inferred from the host's UTC date. Reserve
the remaining work for publication, Docker evidence and submission, not feature
expansion; neither external gate is solved by more UI code.

### Judge-oriented baseline audit

Efforts are rough prospective engineering estimates, not measured durations or
promised completion times. Risks concern regression of the verified baseline.

| Dimension | Already strong | Weak / missing | Evidence | Highest-value improvement | Effort estimate | Regression risk |
| --- | --- | --- | --- | --- | --- | --- |
| Problem significance | Concrete failure-to-response chain | No operator interviews or quantified cost | Monitor/policy contract and demo | Explain one specific training/review use case; avoid invented ROI | <1 h writing; user validation longer | Low |
| Originality | Clear-cause ≠ authorize-motion; stale/report distinction | Rule-based monitor alone is not novel | `monitor.js`, `policy.js` | Make the hidden-cause incident replayable and inspectable | 2–4 h including QA | Low–medium in separate page |
| Technical depth | Seeded plant, pure detector/policy, independent clock | Simplified physics, no external stream sequencing | Four core modules; simulator/detector tests | Expose actual per-step state/checks, not another chart | Included in replay | Low |
| Correctness under faults | Boundaries, malformed packets, stacking, gaps | No real sensor/network integration | 51 baseline tests; 15 browser journeys | Cover complete interacting incident and mismatch failure | 1–2 h tests | Low; no core rewrite |
| Safety-policy design | Latched stop, strict confirmation and revalidation | Illustrative thresholds, not a hazard-validated controller | Monitor tests; reset/recovery checks | Show three independently rejected paths before recovery | Included in replay | Low |
| Demonstration quality | Real screenshots, asserted CLI cases | CLI and UI previously required explanation across separate cases | Three scenarios; walkthrough | One click-to-step browser safety case and JSON evidence | 2–4 h total | Low–medium |
| Reproducibility | Runtime pin, locks, offline tests, Docker recipe | Docker/hosted CI not executed | Packaging and clean-checkout receipt | Execute real Docker rebuild/offline tests when engine available | 0.5–2 h plus setup uncertainty | Low code risk; external blocker |
| User experience | Explicit status, evidence, disabled reasons, keyboard dialogs | Dense evidence; no usability/screen-reader study | Rendered controls and layout journeys | Separate judge replay, no wall-clock race, honest partial evidence | Included in replay | Low–medium |
| Engineering quality | Zero runtime dependencies; exact HTTP allowlist | No exhaustive security/coverage proof | HTTP/contrast tests, bounded source review | Regression tests and scoped assets; preserve safety core | 1–2 h integration | Low |
| Practical impact | Useful simulation/training/review hypothesis | No adoption, deployment or hardware benefit measured | Local executable artifact only | Publicly accessible source/demo evidence and user feedback | Account-dependent | Low code risk; high release importance |

### Competitive failure modes, not competitor intelligence

No private submissions or comparative leaderboard were inspected. The following
are reviewer risks inferred from the published criteria and this artifact:

- A renamed generic dashboard loses the problem story: lead with the observable
  difference between a frozen report and authorized motion.
- Static or hardcoded success views fail “It works”: run the actual monitor and
  stop the replay if its assertions disagree with the observations.
- Superficial AI integration adds no evidence: do not add chat or imply ML; the
  use of AI here is OmniRush-assisted engineering, not a runtime diagnosis model.
- Happy-path-only demos hide policy quality: include stale packets, hidden heat,
  rejected commands and a retained latch before the permitted recovery.
- Missing reproducibility and failure evidence conflict directly with the
  guide: expose the same core tests and deterministic browser/Node replay.
- Unsupported safety/performance claims undermine credibility: retain explicit
  simulation, uncalibrated-threshold, browser-suspension and no-certification limits.
- Inaccessible source or a difficult demo can prevent evaluation altogether:
  public GitHub verification and event eligibility remain higher release
  priorities than additional features.

## B. Chosen differentiator and acceptance

**Primary: reproducible fault replay (D).** Safety-state observability (C),
explainable rules (A) and adversarial tests (E) already existed; they support the
replay rather than becoming unrelated new features. Fault interaction (B) is
shown only as part of this one incident, not claimed as a general causal solver.

| Candidate | Rubric relevance / evidence | Marginal judge impact | Time/risk judgment | Decision |
| --- | --- | --- | --- | --- |
| A: explainable diagnosis | It works / worth using; fault cards already have evidence/rules/time/response | Low if merely restyled | Low, but little new behavior | Preserve |
| B: interaction analysis | It works / worth using; existing policy combines blockers | Medium; a general analyzer risks unsupported causal claims | Medium–high | Demonstrate one actual interaction inside replay |
| C: safety-state observability | It works; separate reported/commanded state already implemented/tested | Medium; clearer presentation helps | Low | Surface existing state in replay |
| **D: deterministic replay** | **Works, worth using, rebuilds; same monitor in browser/Node** | **High: judge can inspect the whole argument without wall-clock timing** | **Bounded additive page/core adapter; no dependencies** | **Implement and verify first** |
| E: more adversarial testing | It works / rebuilds; strong baseline already exists | Important evidence but less immediately visible | Low–medium | Add tests for the replay and relevant failure boundaries |

Prioritization used rubric relevance × visible impact × evidence / risk and time
as a qualitative heuristic, **not a measured score**. Release order now:
authenticate/publish/verify account eligibility → Docker rebuild evidence →
complete form/session selection/receipt → optional real recording/live hosting.
Do not expand the product further while these gates are open.

### Thesis and what the reviewer can actually do

Robots need more than telemetry dashboards: they need a trustworthy connection
from observed conditions to explainable faults, constrained responses and
auditable recovery decisions. Here that connection is a **simulation prototype**,
not a general robot brain or certified safety controller.

At `/replay.html`, the reviewer advances **12 real monitor operations**. Seed and
clock are fixed; wall time does not advance the replay. Every frame retains the
operation/result, full monitor snapshot and computed expected/observed checks.
The incident separates injected plant causes from diagnoses based on received
data, reports from commanded state, stop policy from the retained latch, retry
eligibility from confirmation, and recovering from enabled motion.

Partial/complete evidence can be downloaded as JSON. Equal runs produce equal
snapshots; mutation of returned data cannot change replay internals. A failed
assertion stops advancement until reconstruction. Export is not a signature,
tamper-proof audit service, arbitrary incident importer or durable live-log store.
Restart constructs a separate replay; it does not bypass the live monitor's
confirmed-reset policy.

## C. Completed changes and preserved boundaries

- `src/incident.js`: fixed-case adapter executing the existing `createMonitor`;
  no fork of the detector/policy, no browser timers, no canned state snapshots.
- `test/incident.test.js`: nine tests for real operation equivalence, full
  safety sequence, determinism, isolation, reset/completion and mismatch refusal.
  The mismatch test uses Node's experimental module-mock flag in an isolated
  subprocess only; runtime remains dependency-free with no mocking interface.
- `public/replay.html`, `replay.js`, `replay.css`: step controls, actual state and
  fault evidence, progressive timeline/history, JSON export, responsive/failure UI.
- `public/index.html`: a single replay entry link; live control flow unchanged.
- `server.js`, `test/server.test.js`: four explicit new asset routes and HTTP
  regressions; repository/config/test files remain inaccessible.
- `qa/run.js`: four added journeys, real download inspection and two genuine
  replay captures. Original dashboard screenshots are preserved unchanged.
- Feature commit: **`af705d37c4d53a3e1340c1dc8c307f3c22a14f34`**.
- CLI fallback: **`d1884be0e0bc4d7d270e4c3d046eed445ca0e3b4`** adds the same
  incident to `scripts/demo.js` and verifies its actual transcript.

Original `simulator.js`, `detector.js`, `policy.js`, `monitor.js`, live `app.js`,
shared `styles.css`, runtime manifests and lockfiles are unchanged. No additional
runtime or QA dependencies, external AI services, speculative hardware controls,
new authentication layer or unrelated UI overhaul were introduced.

## D. Verification and adversarial boundaries

| Check | Actual result | Boundary |
| --- | --- | --- |
| Baseline before edits | 51 tests; 15 syntax files; 3 scenarios; 15 Chromium journeys passed | Independently rerun, not trusted historical counts |
| `npm test` after replay/CLI integration | **60 passed, 0 failed, 0 skipped** | Includes existing malformed/future data, critical/stacked faults, strict thresholds, gaps, confirmed-reset and recovery regressions |
| `npm run check` | **18 JavaScript files passed** | Syntax only, not lint/type checking |
| `npm run demo` | **3 original scenarios + 12 asserted replay steps passed** | Actual execution, not a recorded or generated log |
| `bash qa/test-debian.sh` | **19 Chromium journeys passed** | Real DOM, JSON download, keyboard, narrow layout, no-time-advance, offline computation and deliberate failure paths |
| Clean Git checkout at `d1884be` | Offline `npm ci` and `make test` passed; checkout clean | Same Debian environment, not Docker or public GitHub |
| Core/manifest diff against baseline | Simulator, detector, policy, monitor, live app/shared CSS and lockfiles unchanged | Replay is additive, not a new safety controller |
| Docker / hosted CI | **NOT TESTED** | No Docker/Podman/Buildah command and no published CI run |

Normal browser journeys captured no page/console errors or failed requests.
The two intentional failure journeys abort the monitor module or return HTTP
503 for the replay module. They verify unavailable/disabled UI, not successful
network loads. A loaded cockpit continues computing with HTTP networking offline
because there is no remote telemetry backend; this is not a robot-link fault.

No stopping distance, hard real-time deadline, calibrated sensor model, field
failure rate or operator performance was measured. No screen-reader certification,
Safari/Firefox, physical mobile, native Windows or hardware result is claimed.
JSON export is a fixed replay snapshot, not persistence of arbitrary live logs.
See [full verification](verification.md) for red/green and known limitations.

## E. Judge experience

Start with: **“A robot's last report is not permission to move.”**

1. Healthy navigation; clear fault set and motion permitted.
2. Freeze communication and advance four monitored seconds: last report says
   navigating, current commanded state says faulted and motion is disabled.
3. Introduce heat behind the lost link. It is a known test injection, not a
   diagnosis; frozen evidence cannot reveal a new physical condition.
4. Attempt confirmed retry: rejected. Restore link: fresh 95 °C motor evidence
   appears, so retry remains rejected despite repaired communications.
5. Clear heat: no active faults, but latch/motion remain interlocked. Start and
   unconfirmed Retry are rejected. Confirmed Retry enters recovering; a fresh
   check is necessary before simulated motion resumes.
6. Inspect actual timeline/checks/history; download JSON; show `npm test` and
   the same `npm run demo` case as a browser-independent fallback.

The [presenter script](demo-walkthrough.md) targets 90 seconds and retains a
manually operated overheating-first alternative. Suggested timing is not a
fabricated recording. Previous genuine screenshots are a labelled fallback,
never passed off as current execution.

## F. Repository release state

**Public repository URL: VERIFIED, source publication still BLOCKED:**
https://github.com/mahatosumit/RoboSentinel. The later release audit confirmed
public visibility but no published refs/files and configured `origin` to that
existing repository. Workspace `gh auth status` still reports no logged-in host.
No credentials were copied from another environment. The named public account
is older than three days; its identity must still match the joined event account.

README and seven genuine local PNGs exist and use repository-relative links.
Local links can be checked without network, but anonymous GitHub accessibility,
rendered README/Mermaid, public image responses and latest pushed commit cannot
be verified until publication. Do not turn a proposed repository name into a URL.
See [current release audit](release-audit.md) for the updated evidence and exact
unblocking commands. No hosted app, uploaded video, package release, container run or hosted CI result
is claimed. New code is committed; the evidence/documentation refresh follows as
a separate reviewed working-step commit.

## G. Submission fields and required evidence

**Title:** RoboSentinel — Replayable Robot Fault Response

**Description:** RoboSentinel turns simulated robot telemetry into explainable faults, constrained responses and auditable recovery. Its deterministic 12-step replay shows stale navigating reports versus a commanded stop, hidden overheating revealed after link recovery, rejected unsafe retries and explicit, freshly checked recovery. Judges can inspect computed checks, download JSON evidence and run the same case offline. No hardware is controlled; this is not a certified safety system.

Draft lengths: **46 / 473 Unicode characters**, including spaces/punctuation.
**Proposed track:** Open Frontier (06); no saved form selection is claimed.

Required: verified public repo on the connected GitHub account, README, genuine
OmniRush session selection, eligibility/registration and the dashboard Submission
ID copied into Unstop. The actual session remains
`ses_eafe2618cffet1eYYTRdyKzeRT`, “RoboSentinel monitoring and safe fault response”,
confirmed in current app context. It is an app-local pointer, not an invented
public sharing link. Form limits, organizer access/acceptance and receipts are
unverified. [Submission checklist](submission.md) records each gate.

## H. Five-minute skeptical review

1. **Beyond a dashboard?** It links evidence to rejected/accepted commands and
   constrained state transitions, not just gauges and alerts.
2. **Implemented or promised?** Simulator, detector, policy, monitor, live controls,
   replay/checks/export and CLI execution are real. Fleet/hardware/external feeds
   and durable live auditing are not implemented.
3. **Strongest contribution?** Inspectable recovery semantics: stale reports,
   hidden causes, active faults, latches and authorization are kept distinct.
4. **Conflicting faults?** All detected blockers contribute to stop reasons;
   priority is critical first, then ID. Clearing one source never clears another.
   Warning-level low battery cannot authorize return-to-base alongside heat,
   obstacle or stale-data faults. This is policy composition, not novel inference.
5. **Proof of safety rules?** Actual boundary/adversarial/core/browser tests and
   replay assertions. This establishes bounded software behavior, not physical safety.
6. **Reproducible?** Offline core and clean checkout verified. Docker rebuild is
   still unverified; that is an important gap against explicit judging guidance.
7. **Biggest weaknesses?** Simplified plant, no user validation, dense evidence,
   fixed-case-only replay, no signed/durable live audit, unverified container and
   missing public access/account/form completion.
8. **Why might it lose?** The problem's usefulness is unmeasured and the core
   techniques are established engineering rather than a novel robotics result.
   A well-tested local artifact can still fail eligibility or be hard to inspect
   without public source/video. Test counts are not a substitute for impact.
9. **Single highest-value next change?** Resolve authenticated public publication
   and submission eligibility first; then obtain actual Docker rebuild evidence.
   Another simulated feature is now lower value.
10. **Ready now?** Not as a completed submission. The local technical artifact is
    substantially stronger, but required external gates remain open.

## I. Recommendation — SUBMIT AFTER SPECIFIC FIXES

1. Authenticate the workspace GitHub CLI; inspect the intended account/existing
   repository, publish without force-pushing, verify anonymous repo/README/images
   and latest commit. Do not infer the event-connected identity from CLI login.
2. Confirm joining/registration before **19 October 23:59 IST**, account age,
   solo/fresh-work/OmniRush-only eligibility and actual session selection.
3. Execute the Docker recipe and offline tests on a real engine; fix demonstrated
   packaging failures, if any. Preserve explicit NOT TESTED status until then.
4. Inspect form fields/limits, submit the verified entry before **20 October
   23:59 IST**, verify its real receipt and copy the ID to Unstop.

An actual short recording/live deployment may improve accessibility to judges,
but neither is mandatory and neither should delay required publication/submission.
No further speculative features are recommended. No first-place guarantee or
comparative score is defensible from the available evidence.
