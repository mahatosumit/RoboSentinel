# OmniRush Frontier Buildathon 2026 — submission draft

**Status: BLOCKED / no verified submission.** Public source and hosted CI are
verified for `5b256f0`, not the later local release. The user attests OmniRush-only
AI assistance; organizer account eligibility and actual form/receipt validation
remain pending. No demo, recording or submission receipt is invented.
Do not submit automatically: the user must review the completed fields and
explicitly authorize submission.

## Official sources and deadlines

Checked on **19 October 2026 (Asia/Calcutta, IST / UTC+05:30)**:

- [Official event guide](https://omnirush.ai/buildathon), reached from the
  organizer's homepage. This is the source for the rules summarized below.
- [Official submission dashboard](https://omnirush.ai/console/buildathon).
  A read-only fetch returned only a loading shell, not authenticated form fields.
- [Organizer-linked Unstop page](https://unstop.com/p/omnirush-agentic-buildathon-2026-omnirush-1769914).
  A read-only fetch did not expose its event details; the guide's instructions
  are verified, but no Unstop submission receipt or form state is claimed.

| Requirement | Verified organizer guidance | Project / account status |
| --- | --- | --- |
| Submission deadline | **20 October 2026, 11:59 PM IST** (UTC **20 October, 18:29**); locks by server clock | No verified submission receipt |
| Join/registration cutoff | **19 October 2026, 11:59 PM IST** (UTC **19 October, 18:29**) for prize eligibility | Individual registration/join state unverified |
| Participation | Online, solo; OmniRush must be the only generative AI tool used for code/text/images | User confirmed OmniRush-only generation on 19 October; attestation is not organizer approval |
| Fresh work | Start fresh during the event; judges compare code to genuine OmniRush sessions | Original empty workspace and project session are documented; organizer acceptance not claimed |
| GitHub | GitHub account at least **3 days old**; public repository on the account connected to the event | Named account `mahatosumit` was created in 2021; public source at `5b256f0` verified. Event-connected identity remains unverified |
| Required evidence | Repository with README and the OmniRush sessions used to build it | Public README/source verified; genuine app-local session pointer prepared; form session selections pending |
| Video | **Optional**, recommended **2–3 minutes** | Presenter script and screenshots exist; no video recorded/uploaded |
| Live link | **Optional** | Local dashboard only; no public app hosting |
| Final handoff | Submit track/repo/sessions through dashboard, then copy the real **Submission ID into Unstop** | No Submission ID exists in the available evidence |
| Rebuildability | Docker clean-Linux rebuild, offline test command, runtime pin, lockfile, README, `.env.example`, no machine paths/secrets | Artifacts supplied; core offline tests pass; Docker execution NOT TESTED |

The public guide does **not** publish title or description character limits.
Those limits must be checked in the signed-in form before claiming compliance.
No deadline or required field is inferred from an unofficial summary.

## Proposed track — Open Frontier

The official guide lists **Open Frontier** as track 06: **“Anything else. Surprise us.”**
This is a reasonable proposed fit for the simulation-first robotics project,
which is not an ML model or a deployed robot controller. It is a recommendation
based on that definition, not a claim of track assignment or prize eligibility.
Confirm the user's joined/eligible account and the track in the live dashboard.

## Title (46 Unicode characters)

RoboSentinel — Replayable Robot Fault Response

## Description (473 Unicode characters)

RoboSentinel turns simulated robot telemetry into explainable faults, constrained responses and auditable recovery. Its deterministic 12-step replay shows stale navigating reports versus a commanded stop, hidden overheating revealed after link recovery, rejected unsafe retries and explicit, freshly checked recovery. Judges can inspect computed checks, download JSON evidence and run the same case offline. No hardware is controlled; this is not a certified safety system.

Counts include spaces/punctuation, excluding headings/newlines. The description
fits a limit of at least 473 characters, but **form-limit compliance remains
BLOCKED** until the actual title/description fields are inspected.

## Links and demonstration

- **Public repository URL: VERIFIED**, https://github.com/mahatosumit/RoboSentinel.
  Verified public snapshot: **`5b256f003302b06dcebb0f3e6a02fdf8ad093ab3`**. Anonymous GitHub
  page/README/licence are accessible; all **55 tracked files**, including source
  and seven screenshots, were retrieved and byte-checked against Git objects.
- **Hosted CI: PASSED** for that exact commit:
  https://github.com/mahatosumit/RoboSentinel/actions/runs/39162618858.
  Offline installation, tests, syntax and demos passed; Docker/browser QA are
  not jobs in that workflow. Interactive Mermaid rendering is not verified.
- **Public demo/video URL: NOT AVAILABLE.** Neither is mandatory per the guide;
  do not add a placeholder URL to the final form.
- Local dashboard: `npm start`, then `http://127.0.0.1:3000/`.
- Judge replay: **http://127.0.0.1:3000/replay.html**, 12 actual steps with JSON export.
- Deterministic demonstration/fallback: `npm run demo`, including the identical replay.
- Presenter script: [`demo-walkthrough.md`](demo-walkthrough.md), including an
  optional 2–3 minute recording outline.
- Genuine screenshot evidence: [`evidence/`](evidence/), including
  [overheating](evidence/overheat-stop.png) and
  [communication loss](evidence/communication-loss.png).

## Actual capabilities and verification

1. Seeded power, motor, sensor, obstacle and heartbeat telemetry.
2. Seven stackable causes, deterministic fault priority and evidence/time/response.
3. Critical/obstacle stop latch, strict confirmation for recovery/reset/shutdown,
   current-policy revalidation and no automatic restart after cause clearing.
4. Responsive dashboard separating commanded safety state from reported packet mode.
5. Latest-300-event in-memory history retained across confirmed resets.
6. Zero-dependency runtime, three acceptance scenarios and a browser/CLI replay
   with actual snapshots, computed checks, mismatch refusal and JSON download.
7. Fresh local verification at `a5607b2`: **70 tests**, **19 syntax-checked files**, **3 scenarios
   plus all 12 replay steps**, and **19 isolated Chromium journeys** passed.
8. Clean checkout at `a5607b2` passed empty-cache offline root installation,
   `npm run verify`, startup checks and 19 browser journeys. Browser dependencies
   were installed from their lockfile; existing browser binaries/libs were reused.
9. Recovery now rejects frozen observations even below the ordinary stale timeout;
   packet, heartbeat and sensor evidence must match the completion update.

The local release is not yet published. A normal push failed because the Linux
Git environment lacks HTTPS credentials; no remote history was overwritten.

## Known limitations

Simulation only; no hardware drivers, certified safety capability, calibrated
thresholds, realistic maps/charging/RTB route, fleet support or external-stream
sequencing/replay adapter. Audit history is bounded/in-memory and disappears on
reload; only the fixed incident replay exports executed evidence, not arbitrary
live sessions. Safari/Firefox, native Windows, physical mobile devices, manual screen-
reader use, performance/load measurements and Docker are not tested. Hosted CI
is now verified as above; it is not a substitute for container execution.

## Genuine OmniRush session evidence

OmniRush session search previously confirmed this actual project session:

- Title: **RoboSentinel monitoring and safe fault response**
- Session ID: `ses_eafe2618cffet1eYYTRdyKzeRT`

This is an **app-local pointer**, not a public URL or a selected/accepted event
session. No session was fabricated or backfilled. Select the genuine session in
the signed-in dashboard and verify that the organizer can access the expected
work history; no session-share link or acceptance receipt is claimed here.

The current app context reverified that same session/title on 19 October. The
replay engine/UI were implemented by two bounded OmniRush sub-agent tasks in
this workflow, then reviewed/integrated and tested in the parent. Git history
dates fall within the event window; timestamps alone are not proof of original
work or organizer acceptance. Do not invent or backfill additional sessions.

The latest built-in browser attempt to open the event dashboard timed out; a
subsequent listing contained only the existing local replay tab. No signed-in
event page was inspected and no write
or submission action was dispatched. The extension action inventory exposed no
GitHub/publication action that resolves Linux CLI authentication. Publication
has since been performed from the user's terminal and independently verified.

## Final submission checklist

- [ ] Verify event join/registration, solo eligibility and the connected GitHub
  account's age/identity in the user's dashboard.
- [x] Publish `main` on the named account and verify anonymous repository,
  README/source/licence/seven images at `5b256f0`; event-connected identity is
  a separate unchecked requirement above.
- [x] Verify actual hosted CI for the published commit.
- [x] Obtain the user's explicit OmniRush-only generation attestation; preserve
  historical observations and do not treat attribution metadata as proof.
- [ ] Verify organizer eligibility/account acceptance; seek clarification if
  evidence of outside AI use appears. No exception or waiver is assumed.
- [ ] Publish the later local recovery fix and verify CI for that exact release.
- [ ] Inspect title/description limits and required fields in the live form.
- [ ] Select only genuine project sessions and Open Frontier if appropriate.
- [ ] Add a real video/live link only if one is made and checked; they are optional.
- [ ] Obtain explicit user authorization to submit the completed entry.
- [ ] Submit before **20 October 2026, 23:59 IST**, verify the receipt, and copy
  the actual Submission ID to Unstop as instructed by the organizer.
