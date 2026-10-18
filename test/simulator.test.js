import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulator } from '../src/simulator.js';

const NOW = Date.parse('2026-01-01T12:00:00Z');
const NAMES = ['low-battery', 'critical-battery', 'overheating', 'sensor-failure',
  'sensor-stale', 'communication-loss', 'obstacle'];

test('healthy telemetry has the shared shape and supplied clock', () => {
  const simulator = createSimulator();
  const packet = simulator.sample(NOW);
  assert.deepEqual(Object.keys(packet).sort(),
    ['timestamp', 'heartbeat', 'battery', 'motor', 'sensor', 'obstacle', 'mode'].sort());
  assert.equal(packet.timestamp, NOW);
  assert.equal(packet.heartbeat, NOW);
  assert.equal(packet.sensor.timestamp, NOW);
  assert.equal(packet.mode, 'idle');
  assert.equal(packet.motor.state, 'stopped');
  assert.equal(packet.sensor.health, 'healthy');
  assert.equal(packet.sensor.communication, 'online');
  assert.equal(packet.obstacle.detected, false);
  assert.ok(packet.battery.percent > 20 && packet.battery.percent <= 100);
  assert.ok(packet.battery.voltage > 21 && packet.battery.voltage < 30);
  assert.ok(packet.motor.temperatureC > 20 && packet.motor.temperatureC < 70);
  assert.ok(packet.obstacle.distanceM > 0.5);
});

test('equal seeds and steps reproduce bounded varying healthy readings', () => {
  const a = createSimulator({ seed: 42 });
  const b = createSimulator({ seed: 42 });
  const other = createSimulator({ seed: 43 });
  a.setMode('navigating');
  b.setMode('navigating');
  other.setMode('navigating');
  let seedDiffers = false;
  const temperatures = new Set();
  for (let step = 0; step < 300; step += 1) {
    for (const simulator of [a, b, other]) simulator.advance(1000);
    const packet = a.sample(NOW + step * 1000);
    assert.deepEqual(packet, b.sample(NOW + step * 1000));
    seedDiffers ||= JSON.stringify(packet) !== JSON.stringify(other.sample(NOW + step * 1000));
    temperatures.add(packet.motor.temperatureC);
    assert.ok(packet.battery.percent >= 0 && packet.battery.percent <= 100);
    assert.ok(packet.motor.temperatureC >= -20 && packet.motor.temperatureC < 70);
    assert.equal(packet.motor.state, 'running');
    assert.ok(packet.battery.percent > 20);
  }
  assert.ok(seedDiffers, 'the configured seed affects synthetic variation');
  assert.ok(temperatures.size > 1);
});

test('sampling changes clocks only; advancing changes physics without a wall clock', () => {
  const simulator = createSimulator({ drainPerSecond: 0.1 });
  const first = simulator.sample(NOW);
  const second = simulator.sample(NOW + 1000);
  assert.deepEqual(second.battery, first.battery);
  assert.deepEqual(second.motor, first.motor);
  assert.deepEqual(second.obstacle, first.obstacle);
  simulator.advance(0);
  assert.deepEqual(simulator.sample(NOW), first);
  simulator.advance(10_000);
  const advanced = simulator.sample(NOW);
  assert.ok(advanced.battery.percent < first.battery.percent);
  assert.ok(advanced.motor.temperatureC < first.motor.temperatureC);
  assert.equal(advanced.timestamp, NOW);
});

test('navigation heats and drains more than idle, while stopped modes cool', () => {
  const idle = createSimulator({ motorTempC: 25, ambientTempC: 22 });
  const moving = createSimulator({ motorTempC: 25, ambientTempC: 22 });
  moving.setMode('navigating');
  idle.advance(60_000);
  moving.advance(60_000);
  const parked = idle.sample(NOW);
  const driven = moving.sample(NOW);
  assert.ok(driven.battery.percent < parked.battery.percent);
  assert.ok(driven.motor.temperatureC > parked.motor.temperatureC);
  for (const mode of ['idle', 'paused', 'faulted', 'recovering']) {
    const simulator = createSimulator({ motorTempC: 90 });
    simulator.setMode(mode);
    simulator.advance(60_000);
    const packet = simulator.sample(NOW);
    assert.equal(packet.motor.state, 'stopped');
    assert.equal(packet.mode, mode);
    assert.ok(packet.motor.temperatureC < 90);
  }
});

test('physical limits hold for empty/full batteries and very long steps', () => {
  for (const batteryPct of [0, 100]) {
    for (const motorTempC of [-20, 150]) {
      const simulator = createSimulator({ batteryPct, motorTempC, drainPerSecond: 1 });
      simulator.setMode('navigating');
      simulator.advance(Number.MAX_VALUE);
      const packet = simulator.sample(NOW);
      assert.equal(packet.battery.percent, 0);
      assert.ok(Number.isFinite(packet.battery.voltage));
      assert.ok(packet.motor.temperatureC >= -20 && packet.motor.temperatureC <= 150);
    }
  }
});

test('readings and frozen packets are deep clones', () => {
  const simulator = createSimulator();
  const original = simulator.sample(NOW);
  const edited = simulator.sample(NOW);
  edited.battery.percent = -999;
  edited.motor.state = 'running';
  edited.sensor.timestamp = NaN;
  edited.obstacle.detected = true;
  assert.deepEqual(simulator.sample(NOW), original);
  simulator.inject('communication-loss');
  const frozen = simulator.sample(NOW + 1000);
  frozen.battery.percent = 999;
  frozen.sensor.health = 'failed';
  assert.deepEqual(simulator.sample(NOW + 2000), original);
});

for (const [name, verify] of [
  ['low-battery', packet => {
    assert.ok(packet.battery.percent > 10 && packet.battery.percent <= 20);
    assert.ok(packet.battery.voltage > 21);
  }],
  ['critical-battery', packet => {
    assert.ok(packet.battery.percent <= 10);
    assert.ok(packet.battery.voltage <= 21);
  }],
  ['overheating', packet => assert.ok(packet.motor.temperatureC >= 85)],
  ['sensor-failure', packet => {
    assert.equal(packet.sensor.health, 'failed');
    assert.equal(packet.sensor.communication, 'offline');
  }],
  ['obstacle', packet => {
    assert.equal(packet.obstacle.detected, true);
    assert.ok(packet.obstacle.distanceM >= 0 && packet.obstacle.distanceM <= 0.5);
  }],
]) {
  test(`${name} persists until cleared and reveals the healthy plant afterward`, () => {
    const simulator = createSimulator();
    const original = simulator.sample(NOW);
    simulator.inject(name);
    simulator.inject(name);
    assert.deepEqual([...simulator.injections], [name]);
    verify(simulator.sample(NOW));
    verify(simulator.sample(NOW + 5000));
    simulator.clear(name);
    simulator.clear(name);
    assert.equal(simulator.injections.size, 0);
    assert.deepEqual(simulator.sample(NOW), original);
  });
}

test('stale sensor time freezes independently of packet time and physics', () => {
  const simulator = createSimulator();
  const original = simulator.sample(NOW);
  simulator.inject('sensor-stale');
  simulator.setMode('navigating');
  simulator.advance(5000);
  const stale = simulator.sample(NOW + 5000);
  assert.equal(stale.timestamp, NOW + 5000);
  assert.equal(stale.heartbeat, NOW + 5000);
  assert.equal(stale.sensor.timestamp, original.sensor.timestamp);
  assert.equal(stale.sensor.health, 'healthy');
  assert.notDeepEqual(stale.battery, original.battery);
  simulator.clear('sensor-stale');
  assert.equal(simulator.sample(NOW + 6000).sensor.timestamp, NOW + 6000);
  simulator.inject('sensor-stale');
  assert.equal(simulator.sample(NOW + 7000).sensor.timestamp, NOW + 6000);
});

test('communication loss freezes the whole last packet while plant and faults continue', () => {
  const simulator = createSimulator();
  const last = simulator.sample(NOW);
  simulator.inject('communication-loss');
  simulator.inject('critical-battery');
  simulator.setMode('faulted');
  simulator.advance(20_000);
  assert.deepEqual(simulator.sample(NOW + 20_000), last);
  simulator.clear('communication-loss');
  const resumed = simulator.sample(NOW + 21_000);
  assert.equal(resumed.timestamp, NOW + 21_000);
  assert.equal(resumed.mode, 'faulted');
  assert.ok(resumed.battery.percent <= 10);
});

test('faults injected before any sample initialize valid frozen timestamps', () => {
  for (const names of [['sensor-stale'], ['communication-loss'],
    ['sensor-stale', 'communication-loss'], ['communication-loss', 'sensor-stale']]) {
    const simulator = createSimulator();
    for (const name of names) simulator.inject(name);
    const first = simulator.sample(NOW);
    for (const value of [first.timestamp, first.heartbeat, first.sensor.timestamp]) {
      assert.equal(value, NOW);
      assert.ok(Number.isFinite(new Date(value).getTime()));
    }
    const later = simulator.sample(NOW + 5000);
    assert.equal(later.sensor.timestamp, NOW);
    assert.equal(later.timestamp, names.includes('communication-loss') ? NOW : NOW + 5000);
  }
});

test('all injections stack, critical battery wins, and clearing one leaves the others', () => {
  const simulator = createSimulator();
  simulator.sample(NOW);
  for (const name of NAMES) simulator.inject(name);
  assert.equal(simulator.injections.size, NAMES.length);
  simulator.clear('communication-loss');
  const packet = simulator.sample(NOW + 5000);
  assert.ok(packet.battery.percent <= 10);
  assert.ok(packet.motor.temperatureC >= 85);
  assert.equal(packet.sensor.health, 'failed');
  assert.equal(packet.sensor.timestamp, NOW);
  assert.equal(packet.obstacle.detected, true);
  simulator.clear('critical-battery');
  const warning = simulator.sample(NOW + 6000);
  assert.ok(warning.battery.percent > 10 && warning.battery.percent <= 20);
  assert.ok(warning.motor.temperatureC >= 85);
  simulator.setMode('faulted');
  for (const name of NAMES) simulator.clear(name);
  const cleared = simulator.sample(NOW + 7000);
  assert.equal(cleared.mode, 'faulted');
  assert.equal(cleared.motor.state, 'stopped');
  assert.equal(cleared.sensor.health, 'healthy');
  assert.equal(cleared.sensor.timestamp, NOW + 7000);
  assert.equal(cleared.obstacle.detected, false);
});

test('reset clears injected/frozen state and restores seed, configuration, and idle mode', () => {
  const config = { seed: 9, batteryPct: 63, motorTempC: 32, ambientTempC: 18,
    drainPerSecond: 0.1 };
  const simulator = createSimulator(config);
  const first = simulator.sample(NOW);
  const injectionSet = simulator.injections;
  simulator.setMode('navigating');
  simulator.advance(60_000);
  for (const name of NAMES) simulator.inject(name);
  simulator.sample(NOW + 60_000);
  simulator.reset();
  assert.equal(simulator.injections, injectionSet);
  assert.equal(simulator.injections.size, 0);
  assert.deepEqual(simulator.sample(NOW), first);
  const fresh = createSimulator(config);
  simulator.advance(1000);
  fresh.advance(1000);
  assert.deepEqual(simulator.sample(NOW), fresh.sample(NOW));
});

test('rejects invalid configuration without coercion', () => {
  for (const config of [null, [], 'bad', 1]) assert.throws(() => createSimulator(config));
  for (const [key, values] of Object.entries({
    seed: [0.5, NaN, Infinity, '1', Number.MAX_SAFE_INTEGER + 1],
    batteryPct: [-1, 101, NaN, Infinity, '82', null],
    motorTempC: [-21, 151, NaN, Infinity, '39', null],
    drainPerSecond: [-0.1, 1.1, NaN, Infinity, '0.1', null],
    ambientTempC: [-21, 51, NaN, Infinity, '22', null],
  })) {
    for (const value of values) {
      assert.throws(() => createSimulator({ [key]: value }), undefined, `${key}: ${value}`);
    }
  }
  for (const config of [
    { seed: 0, batteryPct: 0, motorTempC: -20, drainPerSecond: 0, ambientTempC: -20 },
    { seed: -1, batteryPct: 100, motorTempC: 150, drainPerSecond: 1, ambientTempC: 50 },
  ]) assert.doesNotThrow(() => createSimulator(config));
});

test('rejects unknown modes, injections, invalid dt and invalid clocks without changing state', () => {
  const simulator = createSimulator();
  const original = simulator.sample(NOW);
  for (const value of ['unknown', '', null, undefined, 1]) {
    assert.throws(() => simulator.setMode(value));
    assert.throws(() => simulator.inject(value));
    assert.throws(() => simulator.clear(value));
  }
  for (const value of [-1, NaN, Infinity, -Infinity, '1000', null, undefined]) {
    assert.throws(() => simulator.advance(value));
  }
  for (const value of [NaN, Infinity, -Infinity, '1000', null, undefined, 8.64e15 + 1]) {
    assert.throws(() => simulator.sample(value));
  }
  assert.deepEqual(simulator.sample(NOW), original);
  assert.equal(simulator.injections.size, 0);
  assert.equal(simulator.sample(0).timestamp, 0);
});
