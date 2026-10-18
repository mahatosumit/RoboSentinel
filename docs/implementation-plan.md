# RoboSentinel implementation contract

## Scope and acceptance

One simulated indoor mobile robot, one local browser tab per independent session.
No hardware drivers, network robot commands, ML, accounts or external services.
The reviewer can start a healthy robot, inject faults, observe deterministic
evidence and a fail-safe stop, clear the cause, confirm a permitted action and
inspect timestamped transitions and rejected commands.

## Stack and boundaries

Node 22+ built-in HTTP server and test runner; standard browser HTML/CSS/ES modules.
No runtime or build dependencies. Core modules are shared by Node tests and UI.

- `src/simulator.js`: synthetic plant and fault injection only.
- `src/detector.js`: pure telemetry validation and deterministic fault rules.
- `src/policy.js`: pure safety policy and action eligibility.
- `src/monitor.js`: independent monitoring clock, fault lifecycle, safety latch,
  operator commands and bounded event history.
- `public/`: accessible responsive dashboard, no independent safety decisions.
- `server.js`: static localhost server only, not a hardware or command API.

## Shared module contract

`createSimulator(config = {})` returns an object with `sample(now)`, `advance(dtMs)`,
`setMode(mode)`, `inject(name)`, `clear(name)`, `reset()` and `injections` (Set).
The constructor accepts `seed` (integer), `batteryPct` (0..100), `motorTempC`
(-20..150), `drainPerSecond` (0..1), `ambientTempC` (-20..50).
`advance` advances plant physics only. `sample` returns a cloned reading using
the supplied epoch-millisecond clock; communication-loss injection returns the
last packet unchanged, while sensor-stale injection freezes only sensor time.

Telemetry shape (numeric timestamps are epoch milliseconds):

```js
{
  timestamp: 0, heartbeat: 0,
  battery: { percent: 82, voltage: 25.1 },
  motor: { temperatureC: 39, state: 'stopped' },
  sensor: { health: 'healthy', communication: 'online', timestamp: 0 },
  obstacle: { detected: false, distanceM: 3.5 },
  mode: 'idle'
}
```

Modes: idle, navigating, paused, faulted, recovering.
Motor states: stopped, running. Sensor health: healthy, failed.
Sensor communication: online, offline.
Injection names: `low-battery`, `critical-battery`, `overheating`, `sensor-failure`,
`sensor-stale`, `communication-loss`, `obstacle`. Injections stack and persist
until explicitly cleared or reset. Clearing does not automatically restart motion.

`detectFaults(telemetry, now)` returns faults sorted critical, warning, info then
by id. Each fault has `id`, `title`, `severity`, `evidence`, `timestamp`,
`recommendedResponse`. Baseline thresholds: battery <=20% warning, <=10% or
voltage <=21V critical; motor >=70C warning, >=85C critical; sensor age >3000ms
critical; packet/heartbeat age >3000ms critical; obstacle <=0.5m warning.
Malformed or future-dated data is critical, never silently healthy.

`policyFor(faults)` returns `{stopRequired, reason}`. Critical faults and obstacle
blockage require immediate simulated stop. A latched stop requires confirmed
retry even after the cause clears. Return-to-base requires no blocking faults
and battery >10%, voltage >21V. Shutdown, retry and return-to-base require
explicit confirmation; inspect is non-motion. No automatic restart.

`createMonitor(config = {})` exposes `tick(dtMs=1000)`, `command(action,
{confirmed=false}={})`, `inject(name)`, `clear(name)`, `snapshot()`.
Config includes simulator options plus `startTime` (default deterministic
2026-01-01T12:00:00Z). Snapshot:
`{now, telemetry, mode, running, faults, events, injections, latched,
motionEnabled, shutdown, policy, actions}`. Events are chronological objects
`{id,timestamp,type,message}`; action results `{ok,message}`. Actions object maps
inspect/retry/return-to-base/shutdown to `{allowed,reason,requiresConfirmation}`.
Commands: start, pause, reset, inspect, retry, return-to-base, shutdown.
Tick always advances the independent monitor clock, even while paused/faulted;
running controls mission movement, not safety monitoring. `mode` and
`motionEnabled` are authoritative commanded state; a stale telemetry mode may
lag and must be labelled as reported state in UI. Events bounded at 300.
Reset starts a new plant and clears fault/latch/shutdown, leaves robot idle,
preserves prior history and records reset. Rejected commands are logged.

## Verification stages

1. Simulator tests: deterministic samples, physical ranges, every injection,
   combined injections, configuration rejection and reset.
2. Detector/policy tests: each fault, thresholds, invalid/stale/future data,
   severity order and confirmation/interlocks.
3. Monitor tests: normal flow, no unsafe restarts, independent clock,
   communication loss, fault resolution, logging and reset.
4. HTTP smoke and browser interaction; deterministic CLI scenario assertions.
5. Fresh dependency-free setup and full `npm test`, `npm run check`, `npm run demo`.

## Design decisions and assumptions

Browser-first is an implementation choice based on the empty workspace and Node
availability. Synthetic values are plausible illustrations, not calibrated robot
models. Thresholds are demo assumptions, not certified safety limits. Hardware
validation is deliberately excluded and must never be implied by passing tests.
