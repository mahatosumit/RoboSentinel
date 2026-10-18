# Repeatable 90-second competition demonstration

## Primary: deterministic browser safety case

Run `npm start`, open **http://127.0.0.1:3000/replay.html**, and choose Next
evidence step. This is a separate scripted monitor, not the live cockpit. Nothing
advances with wall time: a slow explanation or background tab cannot skip steps.
The sequence deliberately loses communications **before** introducing heat so a
judge can see why hidden plant state must not be presented as an observed fault.

Suggested timing, not a measured recording:

| Time | Replay steps | Evidence and narration |
| --- | --- | --- |
| 0–10s | 1: healthy start | “A robot's last report is not permission to move. This is synthetic navigation with clear interlocks.” |
| 10–25s | 2–3: lose link; advance four monitored seconds | Show the actual packet still reporting navigating, commanded state faulted, motion disabled and packet/heartbeat/sensor ages 4000 ms. “The monitor uses its own clock.” |
| 25–40s | 4–6: introduce hidden heat, attempt confirmed retry, restore link | The stale packet cannot reveal the new heat. Retry is rejected. Restoring the link reveals a real 95 °C observation; freshness recovers but the motor fault still blocks motion. |
| 40–55s | 7–8: reject hot retry; clear heat | Show the actual rejection, then no active faults **with the stop latch retained**. “Clear cause is not authorization.” |
| 55–72s | 9–12: reject Start and unconfirmed Retry; confirm; fresh tick | Four rejected requests are audited overall. Confirmed Retry enters recovering with motion disabled; only the final fresh tick clears the latch and enables simulated navigation. |
| 72–90s | Evidence/timeline/history; Download evidence JSON | Show computed expected-versus-observed checks and the actual command events. Download complete evidence. Point to `npm test` and the identical `npm run demo` fallback, not an invented test log. |

Every Next step executes actual simulator/monitor/policy code and asserts its
observations. The page shows only executed steps and labels partial evidence.
Scripted confirmation is part of this fixed replay; it is not an autonomous
real-world recovery decision. Restart reconstructs the isolated replay and
discards its prior frames; download first if you want to keep them.

### Fallback if the browser or live presentation fails

1. Run **`npm run demo`**. After the three original scenarios it executes the
   identical asserted 12-step incident and prints reported/commanded state,
   motion, latch, acceptance and check counts. Exit failure is not a successful demo.
2. If execution itself is unavailable, show the genuine captures below as
   **previous automated evidence**, not as a live run. Show the verified source
   and test instructions; do not fabricate current logs or claim success.
3. If a module fails, leave its unavailable/error state visible. Do not replace
   it with a success screenshot while describing it as current execution.

## Alternative: manually operated cockpit

## Preparation

Run `npm test && npm run check && npm run demo`, then `npm start`. Open
http://127.0.0.1:3000/ in a modern desktop browser. Keep the browser in the
foreground; suspension longer than 3 seconds intentionally triggers a gap stop.
Use Reset simulation and confirm if the scene is not fresh. Do not reload midway
if you want to retain that tab's audit history. Pre-position a terminal with
`npm run demo` output to show the actual rejected retry without using devtools.

### Manual script (target 90 seconds; suggested timing)

| Time | Operator action | What to show / say |
| --- | --- | --- |
| 0–10s | Show fresh robot state; select Start mission | “This is a simulation-only indoor mobile robot. Telemetry and safety monitoring are independent of mission motion.” |
| 10–22s | Select Motor overheating; Inject fault | Point to 95 °C, critical severity, rule thresholds, detection time and recommended inspection. Commanded mode becomes faulted; motion is disabled. |
| 22–34s | Add Communication loss; wait >3 seconds | The packet freezes while the motor fault remains; heartbeat/packet/sensor ages cross the boundary and faults stack. Unlike the primary replay, this packet already reported faulted. Do not claim it reports navigating. |
| 34–45s | Show disabled Retry reason; press Start mission | Show rejection and the command-rejected event. For a literal confirmed unsafe retry, use the real CLI replay output. The UI intentionally does not enable unsafe retry. |
| 45–58s | Clear Motor overheating, then clear Communication loss | While the packet is frozen, clearing the cause does not prove a fresh healthy observation. Restoring the link clears the observed faults, but the latch remains. |
| 58–74s | Retry mission; cancel once; request again and confirm | Cancel is initially focused and does not authorize recovery. Confirmation enters recovering with motion disabled, then navigating after a fresh monitored one-second check. |
| 74–90s | Show event history, genuine test/demo output and simulation banner | Point to injections, faults, stop, rejection and recovery evidence. “No real motors, hardware validation or certified safety claims.” |

## Expected outcomes

- The first demo scenario asserts rejection even when unsafe retry is confirmed.
- Clearing overheating does not unlock Start; confirmed retry is needed.
- Communication loss freezes the packet, not the independent monitor clock.
- Confirmed reset records cleared conditions and keeps the latest 300 events;
  reload/tab closure does not preserve audit history.

## Genuine evidence available

The following PNGs were captured from the actual application by the isolated
Chromium QA harness, not generated as mockups:

- `docs/evidence/healthy-desktop.png` — healthy readings with mission paused
- `docs/evidence/overheat-stop.png` — motor fault, stop and rejected start
- `docs/evidence/communication-loss.png` — stale reported versus commanded state
- `docs/evidence/narrow-screen.png` — 390px layout and confirmed-reset history
- `docs/evidence/module-error.png` — deliberately aborted monitor-module request
- `docs/evidence/incident-replay.png` — replay step 3, frozen navigating report versus commanded stop
- `docs/evidence/incident-recovery.png` — replay step 12, fresh confirmed recovery and complete timeline

They use controlled test time and synthetic data. No video, public demo link,
hosted application or recording duration is claimed. A presenter can record the
script above locally; review the actual recording before adding its link.

## Optional Buildathon recording (2–3 minutes)

The [official guide](https://omnirush.ai/buildathon) recommends, but does not
require, a 2–3 minute video. The 60–90 second core demonstration above is a
rehearsable segment, not a claim to meet a mandatory video duration. To expand it:

1. **0:00–0:25:** State the operator problem, target user and simulation-only boundary.
2. **0:25–1:50:** Perform the core sequence above, including the genuine CLI
   unsafe-retry rejection and the lost-heartbeat state distinction.
3. **1:50–2:25:** Show the actual test/demo output and explain the core modules.
4. **2:25–2:45:** Show the real public repository only after publication is verified;
   mention persistence/hardware limitations and where to find setup instructions.

These are suggested presenter timings. No video file, upload, hosted demo or
recording duration has been verified. A live demo link is also optional per the
guide. The final submission still needs user review and explicit authorization.
