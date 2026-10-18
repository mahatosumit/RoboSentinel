import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createIncidentReplay } from '../src/incident.js';
import { createMonitor } from '../src/monitor.js';

const START_TIME = Date.parse('2026-01-01T12:00:00Z');
const STALE_FAULTS = ['communication-loss', 'sensor-stale', 'telemetry-stale'];
const OPERATIONS = [
  { op: 'command', action: 'start' },
  { op: 'inject', name: 'communication-loss' },
  { op: 'tick', dtMs: 1000, count: 4 },
  { op: 'inject', name: 'overheating' },
  { op: 'command', action: 'retry', confirmed: true },
  { op: 'clear', name: 'communication-loss' },
  { op: 'command', action: 'retry', confirmed: true },
  { op: 'clear', name: 'overheating' },
  { op: 'command', action: 'start' },
  { op: 'command', action: 'retry' },
  { op: 'command', action: 'retry', confirmed: true },
  { op: 'tick', dtMs: 1000 },
];

function finish(replay = createIncidentReplay()) {
  for (let step = 0; step < 12; step++) replay.next();
  return replay.snapshot();
}

test('incident begins at a fixed healthy idle monitor without executing a step', () => {
  const replay = createIncidentReplay();
  const view = replay.snapshot();
  assert.equal(typeof view.id, 'string');
  assert.ok(view.id.length > 0);
  assert.ok(view.title.length > 0);
  assert.equal(view.stepIndex, 0);
  assert.equal(view.totalSteps, 12);
  assert.equal(view.complete, false);
  assert.deepEqual(view.frames, []);
  assert.equal(view.current.step, 0);
  assert.ok(view.current.title.length > 0);
  assert.ok(view.current.explanation.length > 0);
  assert.equal(view.current.operation, null);
  assert.equal(view.current.result, null);
  assert.deepEqual(view.current.checks, []);
  assert.deepEqual(view.current.state, createMonitor({ seed: 1, startTime: START_TIME }).snapshot());
  assert.deepEqual(replay.snapshot(), view);
});

test('each next executes exactly the prescribed operation against a real independent monitor', () => {
  const replay = createIncidentReplay();
  const monitor = createMonitor({ seed: 1, startTime: START_TIME });
  for (const [index, operation] of OPERATIONS.entries()) {
    let result = null;
    if (operation.op === 'command') {
      result = monitor.command(operation.action, { confirmed: operation.confirmed === true });
    } else if (operation.op === 'inject') result = monitor.inject(operation.name);
    else if (operation.op === 'clear') result = monitor.clear(operation.name);
    else for (let tick = 0; tick < (operation.count ?? 1); tick++) monitor.tick(operation.dtMs);
    const view = replay.next();
    assert.equal(view.stepIndex, index + 1);
    assert.equal(view.complete, index === 11);
    assert.equal(view.frames.length, index + 1);
    assert.deepEqual(view.current, view.frames.at(-1));
    assert.equal(view.current.step, index + 1);
    assert.deepEqual(view.current.operation, operation);
    assert.deepEqual(view.current.result, result);
    assert.deepEqual(view.current.state, monitor.snapshot());
  }
});

test('incident proves frozen knowledge, hidden heat, interlocks and fresh confirmed recovery', () => {
  const { frames } = finish();
  const [start, lost, stale, hidden, staleRetry, restored, hotRetry, cooled, startRetry, unconfirmed, recovering, complete] = frames;
  const ids = frame => frame.state.faults.map(fault => fault.id);
  assert.equal(start.result.ok, true);
  assert.equal(start.state.mode, 'navigating');
  assert.equal(start.state.motionEnabled, true);
  assert.deepEqual(ids(start), []);
  assert.deepEqual(lost.state.telemetry, start.state.telemetry);
  assert.equal(lost.state.now - lost.state.telemetry.timestamp, 0);
  assert.deepEqual(ids(lost), []);
  assert.deepEqual(stale.state.telemetry, lost.state.telemetry);
  assert.equal(stale.state.now - stale.state.telemetry.timestamp, 4000);
  assert.equal(stale.state.telemetry.mode, 'navigating');
  assert.deepEqual(ids(stale), STALE_FAULTS);
  assert.equal(stale.state.policy.stopRequired, true);
  assert.deepEqual(hidden.state.injections, ['communication-loss', 'overheating']);
  assert.deepEqual(hidden.state.telemetry, lost.state.telemetry);
  assert.deepEqual(ids(hidden), STALE_FAULTS);
  assert.match(hidden.explanation, /hidden/i);
  assert.match(hidden.explanation, /observ|know|diagnos/i);
  assert.equal(staleRetry.result.ok, false);
  assert.equal(staleRetry.state.actions.retry.allowed, false);
  assert.deepEqual(restored.state.injections, ['overheating']);
  assert.equal(restored.state.telemetry.motor.temperatureC, 95);
  assert.equal(restored.state.now - restored.state.telemetry.timestamp, 0);
  assert.deepEqual(ids(restored), ['motor-overheating']);
  assert.equal(hotRetry.result.ok, false);
  assert.equal(hotRetry.state.actions.retry.allowed, false);
  assert.deepEqual(ids(cooled), []);
  assert.equal(cooled.state.policy.stopRequired, false);
  assert.equal(cooled.state.actions.retry.allowed, true);
  assert.deepEqual(cooled.state.injections, []);
  assert.equal(startRetry.result.ok, false);
  assert.match(startRetry.result.message, /latch/);
  assert.equal(unconfirmed.result.ok, false);
  assert.match(unconfirmed.result.message, /confirmation/);
  for (const frame of frames.slice(2, 10)) {
    assert.equal(frame.state.mode, 'faulted', `step ${frame.step}`);
    assert.equal(frame.state.motionEnabled, false, `step ${frame.step}`);
    assert.equal(frame.state.latched, true, `step ${frame.step}`);
  }
  assert.equal(recovering.result.ok, true);
  assert.equal(recovering.state.mode, 'recovering');
  assert.equal(recovering.state.motionEnabled, false);
  assert.equal(recovering.state.latched, true);
  assert.equal(recovering.state.events.at(-1).type, 'recovery-requested');
  assert.equal(complete.state.now, START_TIME + 5000);
  assert.equal(complete.state.telemetry.timestamp, complete.state.now);
  assert.equal(complete.state.mode, 'navigating');
  assert.equal(complete.state.motionEnabled, true);
  assert.equal(complete.state.latched, false);
  assert.deepEqual(ids(complete), []);
  assert.equal(complete.state.events.at(-1).type, 'recovery-complete');
  assert.equal(complete.state.events.filter(event => event.type === 'command-rejected').length, 4);
  for (const frame of [staleRetry, hotRetry, startRetry, unconfirmed]) {
    assert.equal(frame.state.events.at(-1).type, 'command-rejected');
    assert.equal(frame.state.events.at(-1).message, frame.result.message);
  }
});

test('every executed frame contains computed passing checks and exportable actual evidence', () => {
  const view = finish();
  for (const frame of view.frames) {
    assert.ok(frame.title.length > 0);
    assert.ok(frame.explanation.length > 0);
    assert.ok(frame.checks.length >= 4, `step ${frame.step} must check its safety facts`);
    for (const check of frame.checks) {
      assert.ok(check.label.length > 0);
      assert.ok(Object.hasOwn(check, 'expected'));
      assert.ok(Object.hasOwn(check, 'observed'));
      assert.equal(check.passed, true, `${frame.step}: ${check.label}`);
      assert.deepEqual(check.observed, check.expected);
    }
    assert.ok(frame.state.events.length > 0);
    assert.equal(typeof frame.state.policy.stopRequired, 'boolean');
    assert.equal(typeof frame.state.actions.retry.allowed, 'boolean');
  }
  assert.deepEqual(JSON.parse(JSON.stringify(view)), view);
});

test('CLI demo runs the same asserted 12-step replay as a browser-independent fallback', () => {
  const child = spawnSync(process.execPath, ['scripts/demo.js'], {
    cwd: new URL('../', import.meta.url), encoding: 'utf8',
  });
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /Lost link, hidden heat, verified recovery/);
  assert.match(child.stdout, /step=3 .*reported=navigating .*commanded=faulted .*motion=false/);
  assert.match(child.stdout, /step=5 .*accepted=false/);
  assert.match(child.stdout, /step=12 .*commanded=navigating .*motion=true/);
  assert.match(child.stdout, /All 12 replay steps passed/);
});

test('independent replays produce equal complete snapshots and cannot advance each other', () => {
  const a = createIncidentReplay();
  const b = createIncidentReplay();
  a.next();
  assert.equal(b.snapshot().stepIndex, 0);
  for (let step = 1; step < 12; step++) a.next();
  assert.deepEqual(a.snapshot(), finish(b));
});

test('reset constructs a deterministic fresh initial replay and resets event history', () => {
  const replay = createIncidentReplay();
  const initial = replay.snapshot();
  const completed = finish(replay);
  assert.deepEqual(replay.reset(), initial);
  assert.deepEqual(replay.snapshot(), initial);
  assert.equal(replay.snapshot().current.state.events.length, 1);
  assert.equal(replay.snapshot().current.state.events[0].type, 'initialized');
  assert.deepEqual(finish(replay), completed);
  replay.reset();
  for (let step = 0; step < 4; step++) replay.next();
  assert.deepEqual(replay.reset(), initial);
});

test('completion is idempotent and returned nested data never mutates replay internals', () => {
  const replay = createIncidentReplay();
  const initial = replay.snapshot();
  initial.current.state.events.length = 0;
  initial.current.state.telemetry.motor.temperatureC = 999;
  assert.equal(replay.snapshot().current.state.events.length, 1);
  assert.notEqual(replay.snapshot().current.state.telemetry.motor.temperatureC, 999);
  const first = replay.next();
  first.current.operation.action = 'shutdown';
  first.current.result.ok = false;
  first.current.checks[0].passed = false;
  first.frames[0].state.telemetry.battery.percent = -1;
  assert.equal(replay.snapshot().current.operation.action, 'start');
  assert.equal(replay.snapshot().current.result.ok, true);
  assert.equal(replay.snapshot().current.checks[0].passed, true);
  assert.ok(replay.snapshot().frames[0].state.telemetry.battery.percent > 0);
  for (let step = 1; step < 12; step++) replay.next();
  const complete = replay.snapshot();
  assert.deepEqual(replay.next(), complete);
  assert.deepEqual(replay.next(), complete);
  const altered = replay.next();
  altered.frames[0].state.events[0].message = 'changed';
  altered.frames[2].checks.find(check => Array.isArray(check.observed)).observed.length = 0;
  altered.frames.length = 0;
  assert.deepEqual(replay.snapshot(), complete);
  const reset = replay.reset();
  reset.current.state.events.length = 0;
  assert.equal(replay.snapshot().current.state.events.length, 1);
});

test('a monitor contract mismatch stays failed and refuses further advancement until reset', () => {
  // Module mocking is isolated in a child: production keeps its fixed no-input API.
  // The real monitor executes; only its first reported command result is corrupted.
  const child = spawnSync(process.execPath, ['--experimental-test-module-mocks', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { mock } from 'node:test';
    const monitorUrl = ${JSON.stringify(new URL('../src/monitor.js', import.meta.url).href)};
    const { createMonitor } = await import(monitorUrl);
    let corruptNext = true;
    mock.module(monitorUrl, { namedExports: {
      createMonitor(config) {
        const monitor = createMonitor(config);
        const command = monitor.command;
        monitor.command = (...args) => {
          const result = command(...args);
          if (!corruptNext) return result;
          corruptNext = false;
          return { ...result, ok: false };
        };
        return monitor;
      },
    } });
    const { createIncidentReplay } = await import(${JSON.stringify(new URL('../src/incident.js', import.meta.url).href)});
    const replay = createIncidentReplay();
    const initial = replay.snapshot();
    let failure;
    assert.throws(() => replay.next(), error => {
      failure = error;
      return /Incident step 1 failed:.*Operation accepted/.test(error.message);
    });
    const failed = replay.snapshot();
    assert.equal(failed.complete, false);
    assert.equal(failed.current.checks.find(check => check.label === 'Operation accepted').passed, false);
    assert.equal(failed.current.state.mode, 'navigating');
    assert.throws(() => replay.next(), error => error === failure);
    assert.deepEqual(replay.snapshot(), failed);
    assert.deepEqual(replay.reset(), initial);
    assert.equal(replay.next().current.result.ok, true);
  `], { encoding: 'utf8' });
  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
});
