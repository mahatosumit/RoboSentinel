# Repeatable 60–90 second demonstration

## Preparation

Run `npm test && npm run check && npm run demo`, then `npm start`. Open
http://127.0.0.1:3000/ in a modern desktop browser. Keep the browser in the
foreground; suspension longer than 3 seconds intentionally triggers a gap stop.
Use Reset simulation and confirm if the scene is not fresh. Do not reload midway
if you want to retain that tab's audit history. Pre-position a terminal with
`npm run demo` output to show the actual rejected retry without using devtools.

## Script (target 80 seconds; suggested timing, not a fabricated recording)

| Time | Operator action | What to show / say |
| --- | --- | --- |
| 0–10s | Show fresh robot state; select Start mission | “This is a simulation-only indoor mobile robot. Telemetry and safety monitoring are independent of mission motion.” |
| 10–22s | Select Motor overheating; Inject fault | Point to 95 °C, critical severity, rule thresholds, detection time and recommended inspection. Commanded mode becomes faulted; motion is disabled. |
| 22–34s | Show disabled Retry mission and its reason; press Start mission | Show rejection and the command-rejected event. For a literal confirmed unsafe retry, point to the real `npm run demo` line `Reject unsafe confirmed retry ... accepted=false`. The UI intentionally does not enable unsafe retry. |
| 34–45s | Clear Motor overheating | Active fault clears, but the safety latch and disabled motion remain. “Clearing a cause is not recovery authorization.” |
| 45–58s | Retry mission; review dialog; Confirm retry | Cancel is initially focused. After confirmation, show recovering with motion disabled, then navigating after a fresh monitored one-second check. |
| 58–74s | Inject Communication loss; wait >3 seconds | Heartbeat/packet/sensor ages rise. Three critical freshness faults stop the mission. Reported packet mode remains navigating while commanded state is faulted. |
| 74–85s | Show event history and simulation banner | Point to injection, fault-raised, safety-stop, rejection and recovery evidence. “No real motors, hardware validation or certified safety claims.” |

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
