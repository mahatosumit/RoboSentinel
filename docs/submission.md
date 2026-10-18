# OmniRush Frontier Buildathon 2026 — submission draft

**Status: BLOCKED / not submitted.** The project content is prepared; public
GitHub publication, account eligibility and final form validation are not yet
verified. No repository, demo, recording or submission receipt is invented.
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
| Submission deadline | **20 October 2026, 11:59 PM IST** (UTC **20 October, 18:29**); locks by server clock | Not submitted |
| Join/registration cutoff | **19 October 2026, 11:59 PM IST** (UTC **19 October, 18:29**) for prize eligibility | Individual registration/join state unverified |
| Participation | Online, solo; OmniRush must be the only generative AI tool used for code/text/images | Work here used OmniRush; personal/overall eligibility requires user confirmation |
| Fresh work | Start fresh during the event; judges compare code to genuine OmniRush sessions | Original empty workspace and project session are documented; organizer acceptance not claimed |
| GitHub | GitHub account at least **3 days old**; public repository on the account connected to the event | Connected account, age, CLI login and public URL not verified |
| Required evidence | Repository with README and the OmniRush sessions used to build it | README and genuine app-local session pointer prepared; published repo/form selections pending |
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

## Title (62 Unicode characters)

RoboSentinel — Intelligent Robot Monitoring and Fault Response

## Description (464 Unicode characters)

RoboSentinel is a simulation-first robot monitoring and fault-response prototype. It combines deterministic telemetry, explainable fault rules, safety interlocks and an interactive dashboard. Operators can stack faults, inspect evidence, observe simulated stops and verify confirmed recovery restrictions. Its dependency-free local runtime includes automated tests and repeatable demo scenarios. No real hardware is controlled; it is not a certified safety system.

Counts include spaces/punctuation, excluding headings/newlines. The description
fits a limit of at least 464 characters, but **form-limit compliance remains
BLOCKED** until the actual title/description fields are inspected.

## Links and demonstration

- **Public GitHub URL: BLOCKED.** No remote is configured. The workspace's local
  `gh auth status` still reports no logged-in hosts despite the user reporting
  completed authentication; a login in another environment is not assumed usable.
- **Public demo/video URL: NOT AVAILABLE.** Neither is mandatory per the guide;
  do not add a placeholder URL to the final form.
- Local dashboard: `npm start`, then `http://127.0.0.1:3000/`.
- Deterministic demonstration: `npm run demo`.
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
6. Zero-dependency local runtime and three executable acceptance scenarios.
7. Fresh verification: **51 core/HTTP/contrast tests**, **15 syntax-checked files**,
   **3 scenario transcripts** and **15 isolated Chromium journeys** passed.

## Known limitations

Simulation only; no hardware drivers, certified safety capability, calibrated
thresholds, realistic maps/charging/RTB route, fleet support or external-stream
sequencing/replay adapter. Audit history is bounded/in-memory and disappears on
reload. Safari/Firefox, native Windows, physical mobile devices, manual screen-
reader use, performance/load measurements, Docker and hosted CI are not tested.

## Genuine OmniRush session evidence

OmniRush session search previously confirmed this actual project session:

- Title: **RoboSentinel monitoring and safe fault response**
- Session ID: `ses_eafe2618cffet1eYYTRdyKzeRT`

This is an **app-local pointer**, not a public URL or a selected/accepted event
session. No session was fabricated or backfilled. Select the genuine session in
the signed-in dashboard and verify that the organizer can access the expected
work history; no session-share link or acceptance receipt is claimed here.

## Final submission checklist

- [ ] Verify event join/registration, solo eligibility and the connected GitHub
  account's age/identity in the user's dashboard.
- [ ] Make CLI authentication available in this workspace without copying tokens
  into project files/chat. Inspect intended existing repos before creating one.
- [ ] Publish verified `main` to public `robosentinel` on that connected account;
  verify public visibility, latest commit, README, screenshots and source.
- [ ] Replace the GitHub blocker above with the real verified URL.
- [ ] Inspect title/description limits and required fields in the live form.
- [ ] Select only genuine project sessions and Open Frontier if appropriate.
- [ ] Add a real video/live link only if one is made and checked; they are optional.
- [ ] Obtain explicit user authorization to submit the completed entry.
- [ ] Submit before **20 October 2026, 23:59 IST**, verify the receipt, and copy
  the actual Submission ID to Unstop as instructed by the organizer.
