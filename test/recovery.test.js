import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonitor } from '../src/monitor.js';

for (const cause of ['communication-loss', 'sensor-stale']) {
  test(`recovery cannot authorize motion from unchanged ${cause} observations below the stale timeout`, () => {
    const monitor = createMonitor();
    monitor.command('start');
    monitor.inject('overheating');
    monitor.clear('overheating');
    assert.equal(monitor.command('retry', { confirmed: true }).ok, true);
    monitor.inject(cause);
    const state = monitor.tick(1000);
    assert.deepEqual(state.faults, [], 'the ordinary 3000 ms stale timeout has not elapsed');
    assert.equal(state.motionEnabled, false, 'an unchanged source cannot complete recovery');
    assert.equal(state.mode, 'faulted');
    assert.equal(state.latched, true);
    assert.equal(state.events.at(-1).type, 'recovery-blocked');
    assert.equal(state.events.some(event => event.type === 'recovery-complete'), false);
  });
}

const recoveryActions = ['retry', 'return-to-base'];
const frozenSources = ['communication-loss', 'sensor-stale'];

function stoppedMonitor() {
  const monitor = createMonitor({ startTime: 0 });
  assert.equal(monitor.command('start').ok, true);
  monitor.inject('overheating');
  monitor.clear('overheating');
  assert.equal(monitor.snapshot().latched, true);
  return monitor;
}

function assertBlocked(state) {
  assert.deepEqual(state.faults, [], 'ordinary stale detection has not fired');
  assert.equal(state.mode, 'faulted');
  assert.equal(state.motionEnabled, false);
  assert.equal(state.running, false);
  assert.equal(state.latched, true);
  assert.equal(state.mission, null);
  assert.equal(state.events.at(-1).type, 'recovery-blocked');
  assert.equal(state.events.some(event => event.type === 'recovery-complete'), false);
}

function assertCurrentEvidence(state) {
  assert.equal(state.telemetry.timestamp, state.now);
  assert.equal(state.telemetry.heartbeat, state.now);
  assert.equal(state.telemetry.sensor.timestamp, state.now);
}

for (const cause of frozenSources) {
  test(`${cause} already frozen before confirmation blocks retry and return-to-base`, () => {
    for (const action of recoveryActions) {
      const monitor = stoppedMonitor();
      monitor.inject(cause);
      assert.equal(monitor.command(action, { confirmed: true }).ok, true);
      assert.equal(monitor.snapshot().motionEnabled, false);
      assertBlocked(monitor.tick(1000));
    }
  });

  test(`${cause} after 500 ms blocks both actions despite evidence newer than the request`, () => {
    for (const action of recoveryActions) {
      const monitor = stoppedMonitor();
      const requestedAt = monitor.snapshot().now;
      assert.equal(monitor.command(action, { confirmed: true }).ok, true);
      const halfway = monitor.tick(500);
      assert.equal(halfway.mode, 'recovering');
      assert.equal(halfway.motionEnabled, false);
      assertCurrentEvidence(halfway);
      monitor.inject(cause);
      const state = monitor.tick(500);
      assert.ok(state.telemetry.sensor.timestamp > requestedAt);
      assert.ok(state.telemetry.sensor.timestamp < state.now);
      if (cause === 'communication-loss') {
        assert.equal(state.telemetry.timestamp, halfway.now);
        assert.equal(state.telemetry.heartbeat, halfway.now);
      } else {
        assert.equal(state.telemetry.timestamp, state.now);
        assert.equal(state.telemetry.heartbeat, state.now);
      }
      assertBlocked(state);
    }
  });
}

test('zero-time ticks and repeated confirmed retry cannot skip the recovery interval', () => {
  const monitor = stoppedMonitor();
  for (let attempt = 0; attempt < 3; attempt++) {
    assert.equal(monitor.command('retry', { confirmed: true }).ok, true);
    const state = monitor.tick(0);
    assert.equal(state.now, 0);
    assert.equal(state.mode, 'recovering');
    assert.equal(state.motionEnabled, false);
    assert.equal(state.latched, true);
    assert.equal(state.events.some(event => event.type === 'recovery-complete'), false);
  }
  assert.equal(monitor.tick(999).motionEnabled, false);
  assert.equal(monitor.tick(0).mode, 'recovering');
  const state = monitor.tick(1);
  assert.equal(state.mode, 'navigating');
  assert.equal(state.motionEnabled, true);
  assert.equal(state.latched, false);
  assertCurrentEvidence(state);
});

test('restoring a frozen source cannot resume a blocked recovery without a new confirmed fresh check', () => {
  for (const cause of frozenSources) {
    for (const action of recoveryActions) {
      const monitor = stoppedMonitor();
      assert.equal(monitor.command(action, { confirmed: true }).ok, true);
      monitor.inject(cause);
      assertBlocked(monitor.tick(1000));
      monitor.clear(cause);
      const restored = monitor.tick(1000);
      assertCurrentEvidence(restored);
      assert.equal(restored.mode, 'faulted');
      assert.equal(restored.latched, true);
      assert.equal(restored.motionEnabled, false);
      assert.equal(monitor.command('start').ok, false);
      assert.equal(monitor.command(action).ok, false);
      assert.equal(monitor.command(action, { confirmed: true }).ok, true);
      assert.equal(monitor.tick(0).motionEnabled, false);
      const recovered = monitor.tick(1000);
      assert.equal(recovered.mode, 'navigating');
      assert.equal(recovered.motionEnabled, true);
      assert.equal(recovered.latched, false);
      assert.equal(recovered.mission, action);
      assertCurrentEvidence(recovered);
      assert.equal(recovered.events.filter(event => event.type === 'recovery-complete').length, 1);
    }
  }
});

test('healthy retry and return-to-base recover across two 500 ms ticks', () => {
  for (const action of recoveryActions) {
    const monitor = stoppedMonitor();
    assert.equal(monitor.command(action, { confirmed: true }).ok, true);
    const halfway = monitor.tick(500);
    assert.equal(halfway.mode, 'recovering');
    assert.equal(halfway.motionEnabled, false);
    assert.equal(halfway.latched, true);
    const recovered = monitor.tick(500);
    assert.equal(recovered.mode, 'navigating');
    assert.equal(recovered.motionEnabled, true);
    assert.equal(recovered.latched, false);
    assert.equal(recovered.mission, action);
    assertCurrentEvidence(recovered);
    assert.equal(recovered.events.at(-1).type, 'recovery-complete');
  }
});

test('confirmed reset after blocked recovery clears causes but leaves the plant stopped', () => {
  for (const cause of frozenSources) {
    const monitor = stoppedMonitor();
    assert.equal(monitor.command('retry', { confirmed: true }).ok, true);
    monitor.inject(cause);
    assertBlocked(monitor.tick(1000));
    assert.equal(monitor.command('reset', { confirmed: true }).ok, true);
    const state = monitor.tick(1000);
    assert.equal(state.mode, 'idle');
    assert.equal(state.motionEnabled, false);
    assert.equal(state.running, false);
    assert.equal(state.latched, false);
    assert.equal(state.shutdown, false);
    assert.equal(state.mission, null);
    assert.deepEqual(state.injections, []);
    assert.deepEqual(state.faults, []);
    assert.equal(state.telemetry.motor.state, 'stopped');
    assertCurrentEvidence(state);
    assert.equal(state.events.some(event => event.type === 'recovery-blocked'), true);
    assert.equal(state.events.some(event => event.type === 'reset'), true);
    assert.equal(state.events.some(event => event.type === 'recovery-complete'), false);
  }
});
