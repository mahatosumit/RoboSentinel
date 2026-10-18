# RoboSentinel

RoboSentinel is a **simulation-first robot monitoring and fault-response system**.
It generates deterministic mobile-robot telemetry, identifies abnormal conditions
with transparent rules, and applies a fail-safe simulated response policy.

> **Simulation only. No hardware drivers, robot commands, cloud services or
> certified safety claims are included.** Thresholds are illustrative demo
> assumptions and must be calibrated and reviewed before any real deployment.

## What a reviewer can demonstrate

1. Launch a local browser dashboard and see a healthy simulated robot.
2. Start the simulated mission and observe live battery, voltage, motor,
   sensors, obstacle, heartbeat and commanded/reported modes.
3. Inject motor overheating and see rule evidence, a critical fault, and a
   latched simulated stop.
4. Attempt recovery and see the safety interlock reject it while the cause is
   present. Clear the cause, then explicitly confirm a monitored retry.
5. Inspect chronological fault, command, rejection, safety-stop and recovery
   events in the dashboard.
6. Run deterministic scenario assertions and the full automated test suite.

## Requirements

- Node.js 22 or newer
- A modern browser with ES module and native `<dialog>` support
- No npm install is required; RoboSentinel has no runtime dependencies.

## Run locally

```bash
npm test
npm run check
npm run demo
npm start
```

Open <http://127.0.0.1:3000/>. The server binds to loopback by default. To use
another local port:

```bash
PORT=3100 npm start
```

The server is an explicit allowlist of dashboard and core-module assets. It does
not expose `package.json`, hidden files, repository metadata or arbitrary paths.

## Fault-injection procedure

The dashboard's **Fault injection** control supports stacked synthetic causes:

| Cause | Expected detection | Default response |
| --- | --- | --- |
| Low battery | Warning at <=20% | Inspect; eligible return-to-base requires confirmation |
| Critical battery | Critical at <=10% or <=21 V | Stop; inspect power; no blind recovery |
| Motor overheating | Warning >=70 °C, critical >=85 °C | Stop when critical; inspect and cool |
| Sensor failure | Critical failed/offline navigation sensor | Stop; inspect and require fresh readings |
| Stale sensor readings | Critical after >3 s | Stop; require fresh readings |
| Communication loss | Critical heartbeat after >3 s | Stop; reject blind motion |
| Obstacle blockage | Warning when detected at <=0.5 m | Stop/pause navigation; inspect route |

Injections persist until individually cleared or reset. Fault detection is
deterministic and sorted by critical, warning, then stable fault id. Every fault
contains its severity, evidence, explanation, detection timestamp and
recommended response.

## Safety model

The response engine is intentionally conservative:

- Critical faults and close detected obstacles require a simulated stop.
- A safety stop is latched. Clearing a cause never restarts motion.
- `start` cannot bypass an active fault or latch.
- `retry`, `return-to-base` and `shutdown` require explicit confirmation.
- Retry has a fresh one-second monitored recovery check before motion starts.
- If any interlock changes during that check, recovery is cancelled.
- Return-to-base is only eligible for warning-level low battery with >10%
  battery and >21 V; its five-second transit is synthetic, not a route planner.
- Shutdown disables motion while monitoring continues; reset is required.
- A delayed monitoring callback (>3 s) creates a monitoring-gap critical fault
  before the simulator advances through the unobserved interval.
- The dashboard distinguishes the commanded safety/motion state from the last
  reported telemetry mode. Stale reported data is not authoritative.

No browser action is a real hardware control. `server.js` serves static files;
there is no network endpoint for commanding a robot.

## Architecture

```text
                         browser (public/)
                               |
                        createMonitor()
                               |
       +-----------------------+------------------------+
       |                        |                        |
  simulator.js             detector.js               policy.js
  synthetic plant          pure rules                pure interlocks
       |                        |                        |
       +------------------------+------------------------+
                                |
                         monitor.js
             clock, lifecycle, latch, events, commands
                                |
                         snapshot for UI
```

### Modules

- `src/simulator.js` — seeded synthetic plant, bounded variation, physical
  ranges, modes, timestamps and independent fault injection.
- `src/detector.js` — pure validation and rule-based classification. Malformed,
  future-dated or stale data fails closed.
- `src/policy.js` — pure action eligibility and stop policy. It does not mutate
  state and does not trust UI decisions.
- `src/monitor.js` — authoritative state machine for the local scene, clock,
  fault lifecycle timestamps, safety latch, commands and bounded event history.
- `public/` — accessible responsive dashboard. It renders monitor snapshots and
  never implements its own safety rules.
- `server.js` — local static allowlist with security headers; not a robot API.
- `scenarios/demo.json` and `src/scenarios.js` — checked-in executable scenarios.
- `test/` — simulator, detector, policy, monitor, HTTP surface and scenario tests.

## Telemetry schema

```js
{
  timestamp: 1767268800000,
  heartbeat: 1767268800000,
  battery: { percent: 82, voltage: 25.1 },
  motor: { temperatureC: 39, state: 'stopped' },
  sensor: { health: 'healthy', communication: 'online', timestamp: 1767268800000 },
  obstacle: { detected: false, distanceM: 3.5 },
  mode: 'idle'
}
```

`mode` can be `idle`, `navigating`, `paused`, `faulted` or `recovering`.
Telemetry timestamps are epoch milliseconds. The monitor owns the simulation
clock so tests and demo scenarios do not depend on wall-clock timing.

## Verification and known limitations

The current dependency-free checks are:

```text
npm test     47 passed, 0 failed (fresh local run)
npm run check 14 JavaScript files syntax-checked
npm run demo 3 deterministic scenarios with assertions passed
```

The HTTP test also verifies that the dashboard and core modules are served,
unknown paths are rejected, unsafe repository files are not served, methods are
restricted, and baseline security headers are present.

Known limitations:

- This is a single-process, single-browser simulation; state is not persisted.
- The dashboard has been verified through Node HTTP and module syntax tests in
  this workspace. A built-in browser tab was unavailable to reach the container
  localhost server, so cross-browser visual and keyboard verification remains
  a follow-up check rather than a claim.
- There is no real kinematics, map, localization, charging model, sensor noise
  calibration, hardware I/O, authentication, multi-robot fleet or durable log.
- A browser tab can be suspended by the OS. The monitor records a monitoring-gap
  fault when it resumes, but no software can guarantee a real hardware stop from
  a suspended browser; this project has no hardware path by design.
- Thresholds are not a safety case. Real deployment needs hazard analysis,
  independent safety controls, calibrated sensor specifications, fault-injection
  evidence and hardware-in-the-loop validation.

## Reproducible demo from the command line

```bash
npm run demo
```

The scenario transcript is intentionally readable. The first scenario starts a
mission, injects overheating, rejects unsafe retry, clears the cause, and only
then enables motion after confirmed recovery. The second freezes a packet and
shows the independent stale-data response. The third stacks faults and verifies
reset plus retained history. Any expectation mismatch exits non-zero.

## Project documents

- [`docs/implementation-plan.md`](docs/implementation-plan.md) — contract,
  boundaries, assumptions and staged verification plan.
- [`DESIGN.md`](DESIGN.md) — visual language, responsive rules and accessibility
  direction for the monitoring cockpit.
- [`scenarios/demo.json`](scenarios/demo.json) — executable acceptance scenarios.

## GitHub publication

This workspace is prepared as a public-repository candidate, but publication is
an external account action. Create an empty public repository, then from this
directory run the normal Git commands after authenticating with GitHub. The
GitHub CLI is not installed in the current environment, so this implementation
does not claim that a remote repository has been created or pushed.
