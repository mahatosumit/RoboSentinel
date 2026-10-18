import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulator } from '../src/simulator.js';
import { detectFaults, THRESHOLDS } from '../src/detector.js';
import { policyFor, actionEligibility } from '../src/policy.js';

const NOW = Date.parse('2026-01-01T12:00:00Z');
const healthy = () => createSimulator().sample(NOW);
const byId = (faults, id) => faults.find(f => f.id === id);

test('healthy synthetic robot produces no alerts', () => {
  assert.deepEqual(detectFaults(healthy(), NOW), []);
});

for (const [injection, id, severity] of [
  ['low-battery', 'low-battery', 'warning'],
  ['critical-battery', 'low-battery', 'critical'],
  ['overheating', 'motor-overheating', 'critical'],
  ['sensor-failure', 'sensor-failure', 'critical'],
  ['obstacle', 'obstacle-blockage', 'warning'],
]) {
  test(`${injection} has explainable evidence and response`, () => {
    const sim = createSimulator();
    sim.inject(injection);
    const fault = byId(detectFaults(sim.sample(NOW), NOW), id);
    assert.equal(fault.severity, severity);
    assert.equal(fault.timestamp, NOW);
    for (const key of ['evidence', 'recommendedResponse', 'explanation', 'title']) {
      assert.ok(typeof fault[key] === 'string' && fault[key].length > 10, key);
    }
  });
}

test('inclusive battery, voltage and motor boundaries', () => {
  const t = healthy();
  for (const [value, severity] of [[20.001, undefined], [20, 'warning'], [10.001, 'warning'], [10, 'critical']]) {
    t.battery.percent = value;
    assert.equal(byId(detectFaults(t, NOW), 'low-battery')?.severity, severity);
  }
  t.battery.percent = 80;
  t.battery.voltage = 21;
  assert.equal(byId(detectFaults(t, NOW), 'low-battery').severity, 'critical');
  t.battery.voltage = 25;
  for (const [value, severity] of [[69.99, undefined], [70, 'warning'], [84.99, 'warning'], [85, 'critical']]) {
    t.motor.temperatureC = value;
    assert.equal(byId(detectFaults(t, NOW), 'motor-overheating')?.severity, severity);
  }
});

test('stale sensor, packet and heartbeat use independent clock and strict timeout', () => {
  assert.equal(THRESHOLDS.staleMs, 3000);
  const t = healthy();
  assert.deepEqual(detectFaults(t, NOW + 3000), []);
  const ids = detectFaults(t, NOW + 3001).map(f => f.id);
  assert.deepEqual(ids, ['communication-loss', 'sensor-stale', 'telemetry-stale']);
  t.timestamp = NOW + 4000;
  t.sensor.timestamp = NOW + 4000;
  assert.deepEqual(detectFaults(t, NOW + 4000).map(f => f.id), ['communication-loss']);
});

test('obstacle threshold is inclusive and requires detection flag', () => {
  const t = healthy();
  t.obstacle = { detected: true, distanceM: 0.5 };
  assert.equal(detectFaults(t, NOW)[0].id, 'obstacle-blockage');
  t.obstacle.distanceM = 0.501;
  assert.deepEqual(detectFaults(t, NOW), []);
  t.obstacle = { detected: false, distanceM: 0.1 };
  assert.deepEqual(detectFaults(t, NOW), []);
});

test('simultaneous faults sorted critical before warning, deterministic tie break', () => {
  const sim = createSimulator();
  ['low-battery', 'overheating', 'sensor-failure', 'obstacle'].forEach(sim.inject);
  const faults = detectFaults(sim.sample(NOW), NOW);
  assert.deepEqual(faults.map(f => f.id), ['motor-overheating', 'sensor-failure', 'low-battery', 'obstacle-blockage']);
  assert.ok(policyFor(faults).stopRequired);
});

test('malformed, missing, non-finite, out-of-range and future data fail closed', () => {
  const mutations = [
    t => { t.battery.percent = NaN; }, t => { t.battery.percent = 101; },
    t => { delete t.sensor; }, t => { t.motor.temperatureC = Infinity; },
    t => { t.heartbeat = NOW + 1; }, t => { t.timestamp = NOW + 1; },
    t => { t.sensor.timestamp = NOW + 1; }, t => { t.mode = 'unknown'; },
    t => { t.obstacle.distanceM = -1; }, t => { t.sensor.health = 'unknown'; },
    t => { t.motor.state = 'unknown'; }, t => { t.battery.voltage = '25'; },
  ];
  for (const mutate of mutations) {
    const t = healthy(); mutate(t);
    const faults = detectFaults(t, NOW);
    assert.equal(faults[0].id, 'invalid-telemetry');
    assert.equal(faults[0].severity, 'critical');
    assert.ok(policyFor(faults).stopRequired);
  }
  for (const t of [null, {}, [], undefined]) assert.equal(detectFaults(t, NOW)[0].id, 'invalid-telemetry');
  assert.throws(() => detectFaults(healthy(), NaN), /clock/i);
});

test('policy stops for critical or obstacle but not low battery warning alone', () => {
  const sim = createSimulator();
  assert.equal(policyFor([]).stopRequired, false);
  sim.inject('low-battery');
  assert.equal(policyFor(detectFaults(sim.sample(NOW), NOW)).stopRequired, false);
  sim.inject('obstacle');
  assert.equal(policyFor(detectFaults(sim.sample(NOW), NOW)).stopRequired, true);
});

test('recovery actions enforce eligibility separately from confirmation', () => {
  const t = healthy();
  const actions = actionEligibility({ faults: [], telemetry: t, shutdown: false });
  assert.equal(actions.retry.allowed, true);
  assert.equal(actions.retry.requiresConfirmation, true);
  assert.equal(actions.inspect.requiresConfirmation, false);
  const sim = createSimulator(); sim.inject('low-battery');
  const telemetry = sim.sample(NOW);
  const low = actionEligibility({ faults: detectFaults(telemetry, NOW), telemetry, shutdown: false });
  assert.equal(low.retry.allowed, false);
  assert.equal(low['return-to-base'].allowed, true);
  sim.inject('overheating');
  const hot = sim.sample(NOW);
  assert.equal(actionEligibility({ faults: detectFaults(hot, NOW), telemetry: hot, shutdown: false })['return-to-base'].allowed, false);
  assert.equal(actionEligibility({ faults: [], telemetry: t, shutdown: true }).retry.allowed, false);
});
