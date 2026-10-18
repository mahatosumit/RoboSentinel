# OmniRush Frontier Buildathon 2026 — submission draft

**Status: BLOCKED / not submitted.** This is copy-ready project content, not a
submission receipt. No repository, hosted demo, video or public session URL is
invented. Track eligibility and the actual form character limit remain unverified.

## Recommended track

**Open Frontier** — recommendation only, subject to the organizer's current
eligibility and track guidance. The project uses explainable deterministic rules,
not a claimed ML model. Do not imply the track has already accepted it.

## Title (62 Unicode characters)

RoboSentinel — Intelligent Robot Monitoring and Fault Response

## Description (464 Unicode characters)

RoboSentinel is a simulation-first robot monitoring and fault-response prototype. It combines deterministic telemetry, explainable fault rules, safety interlocks and an interactive dashboard. Operators can stack faults, inspect evidence, observe simulated stops and verify confirmed recovery restrictions. Its dependency-free local runtime includes automated tests and repeatable demo scenarios. No real hardware is controlled; it is not a certified safety system.

The character count includes spaces and punctuation, excluding the Markdown
heading/newlines. It fits a limit of 464 or more; **the official limit has not
been verified**, so do not claim form compliance until checking the live form.

## Links

- **Public GitHub URL: BLOCKED**, awaiting GitHub authentication and verified push.
- **Public demo/video URL: NOT AVAILABLE**, none has been recorded or hosted.
- Local dashboard: run `npm start`, visit `http://127.0.0.1:3000/`.
- Deterministic terminal demonstration: `npm run demo`.
- 60–90 second presenter script: `docs/demo-walkthrough.md`.
- Genuine screenshots: `docs/evidence/` (controlled test time, synthetic data).

## Actual capabilities

1. Seeded battery/voltage, motor, sensor, obstacle and heartbeat simulation.
2. Seven stackable fault causes with individual clearing and combined severity.
3. Evidence-based deterministic detection, recommendations and lifecycle times.
4. Critical/obstacle stop latch, confirmation-gated recovery/reset/shutdown,
   current-policy revalidation and no automatic restart after cause clearing.
5. Responsive dashboard with authoritative commanded state versus reported
   packet mode, policy reasons and latest-300-event history.
6. Offline core runtime/tests and three executable demo scenarios.
7. 51 core/HTTP/contrast tests and 15 isolated Chromium QA journeys passed.

## Known limitations

- Simulation only; no real motors, drivers, hardware-in-the-loop evidence or
  certified safety capability. Thresholds are illustrative.
- Single independent scene per tab; history is bounded/in-memory, not durable.
- Synthetic power/thermal/obstacle model, no maps, charging or physical RTB route.
- No external packet-ingestion/sequence-replay adapter or fleet support.
- Only Chromium was exercised; Safari/Firefox, screen-reader usability and
  physical mobile devices are not tested.
- Docker and hosted CI are supplied but have not been executed here.

## Genuine OmniRush work-session pointer

OmniRush `session.search` for RoboSentinel in the active workspace returned one
matching session, with no truncation:

- Title: **RoboSentinel monitoring and safe fault response**
- Session ID: `ses_eafe2618cffet1eYYTRdyKzeRT`

This is an app-local pointer, **not a public URL or verified event entry**.
No backfilled session or fabricated history is listed. The current development
and validation took place in this OmniRush workflow; no other generative AI tool
was invoked. Full organizer compliance still needs the organizer's actual rules
and any required genuine session export/share procedure.

## Before pressing Submit

- [ ] Authenticate GitHub directly; never paste credentials into chat/files.
- [ ] Inspect the account for the intended repo, create public `robosentinel`
  only if appropriate, push verified `main`, and verify public README/source.
- [ ] Add the actual verified public GitHub URL above.
- [ ] Supply the official submission form/rules URL and verify the character
  limit, track, dates and session-evidence requirements.
- [ ] If a demo video is required, record the genuine walkthrough and verify
  that its link is accessible; do not substitute screenshots for a video claim.
- [ ] Review the final live form and preserve a real success receipt/entry URL.
