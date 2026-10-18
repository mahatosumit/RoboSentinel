import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonitor } from '../src/monitor.js';

test('normal mission stays healthy over 60 ticks; pause keeps monitoring', () => {
  const m = createMonitor();
  assert.equal(m.snapshot().mode, 'idle');
  assert.ok(m.command('start').ok);
  for (let i = 0; i < 60; i++) {
    m.tick();
    assert.deepEqual(m.snapshot().faults, []);
    assert.equal(m.snapshot().motionEnabled, true);
  }
  m.command('pause');
  const before = m.snapshot(); m.tick();
  assert.equal(m.snapshot().mode, 'paused');
  assert.equal(m.snapshot().motionEnabled, false);
  assert.equal(m.snapshot().now, before.now + 1000);
});

test('critical stop is immediate and latched; unsafe actions cannot bypass it', () => {
  const m = createMonitor(); m.command('start'); m.inject('overheating');
  let s = m.snapshot();
  assert.equal(s.mode, 'faulted'); assert.equal(s.motionEnabled, false); assert.ok(s.latched);
  assert.equal(s.telemetry.motor.state, 'stopped');
  for (const action of ['start', 'retry', 'return-to-base']) {
    assert.equal(m.command(action, { confirmed: true }).ok, false);
    assert.equal(m.snapshot().motionEnabled, false);
  }
  m.command('pause');
  assert.equal(m.snapshot().mode, 'faulted');
  m.clear('overheating');
  assert.deepEqual(m.snapshot().faults, []);
  assert.equal(m.command('start').ok, false);
  assert.equal(m.command('retry').ok, false);
  assert.equal(m.command('retry', { confirmed: 'yes' }).ok, false);
  assert.equal(m.command('retry', { confirmed: true }).ok, true);
  assert.equal(m.snapshot().mode, 'recovering');
  assert.equal(m.snapshot().motionEnabled, false);
  m.tick(); s = m.snapshot();
  assert.equal(s.mode, 'navigating'); assert.ok(s.motionEnabled); assert.equal(s.latched, false);
});

test('new fault during confirmed recovery cancels restart', () => {
  const m = createMonitor(); m.command('retry', { confirmed: true });
  m.inject('sensor-failure'); m.tick(2000);
  assert.equal(m.snapshot().mode, 'faulted');
  m.clear('sensor-failure'); m.tick();
  assert.equal(m.snapshot().motionEnabled, false);
});

for (const name of ['critical-battery', 'sensor-failure', 'obstacle']) {
  test(`${name} stops mission and blocks recovery`, () => {
    const m = createMonitor(); m.command('start'); m.inject(name);
    assert.equal(m.snapshot().motionEnabled, false);
    assert.equal(m.command('retry', { confirmed: true }).ok, false);
    assert.equal(m.command('return-to-base', { confirmed: true }).ok, false);
  });
}

test('stale sensor stops after timeout even when mission is paused', () => {
  const m = createMonitor(); m.command('start'); m.command('pause'); m.inject('sensor-stale');
  m.tick(3000); assert.equal(m.snapshot().faults.length, 0);
  m.tick(1); assert.ok(m.snapshot().faults.some(f => f.id === 'sensor-stale'));
  assert.ok(m.snapshot().latched);
});

test('communication loss freezes packet, not commanded safety state or monitor clock', () => {
  const m = createMonitor(); m.command('start'); m.inject('communication-loss');
  const packet = m.snapshot().telemetry;
  m.tick(3000); assert.ok(m.snapshot().motionEnabled);
  m.tick(1000); const s = m.snapshot();
  assert.deepEqual(s.telemetry, packet);
  assert.equal(s.mode, 'faulted'); assert.equal(s.motionEnabled, false);
  assert.deepEqual(s.faults.map(f => f.id), ['communication-loss', 'sensor-stale', 'telemetry-stale']);
  m.clear('communication-loss');
  assert.equal(m.snapshot().latched, true);
  assert.deepEqual(m.snapshot().faults, []);
});

test('monitoring gap latches stop before advancing unobserved plant time', () => {
  const m = createMonitor(); m.command('start'); m.tick(60_000);
  assert.ok(m.snapshot().faults.some(f => f.id === 'monitoring-gap'));
  assert.equal(m.snapshot().motionEnabled, false);
  m.tick();
  assert.deepEqual(m.snapshot().faults, []);
  assert.equal(m.command('start').ok, false);
});

test('warning battery recommends confirmed return, simulated transit finishes at idle', () => {
  const m = createMonitor(); m.inject('low-battery');
  assert.equal(m.command('start').ok, false);
  assert.equal(m.command('return-to-base').ok, false);
  assert.ok(m.command('return-to-base', { confirmed: true }).ok);
  m.tick(); assert.equal(m.snapshot().mode, 'navigating');
  for (let i = 0; i < 5; i++) m.tick();
  assert.equal(m.snapshot().mode, 'idle');
  assert.equal(m.snapshot().motionEnabled, false);
  assert.ok(m.snapshot().events.some(e => e.message.includes('base')));
});

test('shutdown needs confirmation, prevents all motion until reset', () => {
  const m = createMonitor(); m.command('start');
  assert.equal(m.command('shutdown').ok, false);
  assert.ok(m.command('shutdown', { confirmed: true }).ok);
  m.tick(); assert.equal(m.snapshot().shutdown, true);
  for (const action of ['start', 'retry', 'return-to-base']) assert.equal(m.command(action, { confirmed: true }).ok, false);
  const before = m.snapshot();
  assert.equal(m.command('reset').ok, false);
  assert.equal(m.snapshot().shutdown, true); assert.equal(m.snapshot().latched, true);
  assert.deepEqual(m.snapshot().events.slice(0, -1), before.events);
  assert.ok(m.command('reset', { confirmed: true }).ok);
  assert.equal(m.snapshot().shutdown, false); assert.equal(m.snapshot().mode, 'idle');
  assert.match(m.snapshot().events.at(-1).message, /safety latch true; shutdown true/);
});

test('reset requires explicit confirmation and preserves the audit trail', () => {
  const m = createMonitor();
  m.inject('overheating');
  const before = m.snapshot();
  for (const options of [undefined, null, { confirmed: false }, { confirmed: 'yes' }, { confirmed: 1 }]) {
    const prior = m.snapshot();
    assert.equal(m.command('reset', options).ok, false);
    const rejected = m.snapshot();
    assert.deepEqual(rejected.events.slice(0, -1), prior.events);
    assert.equal(rejected.events.at(-1).type, 'command-rejected');
    assert.deepEqual({ ...rejected, events: [] }, { ...prior, events: [] });
  }
  assert.deepEqual(m.snapshot().injections, ['overheating']);
  assert.ok(m.snapshot().faults.some(f => f.id === 'motor-overheating'));
  assert.ok(m.snapshot().events.some(e => e.type === 'command-rejected'));
  assert.equal(m.command('reset', { confirmed: true }).ok, true);
  const after = m.snapshot();
  assert.deepEqual(after.injections, []);
  assert.deepEqual(after.faults, []);
  assert.equal(after.mode, 'idle');
  assert.equal(after.latched, false);
  assert.equal(after.motionEnabled, false);
  assert.equal(after.telemetry.motor.state, 'stopped');
  assert.ok(after.events.length > before.events.length);
  assert.equal(after.events.at(-1).type, 'reset');
  assert.match(after.events.at(-1).message, /faults \[motor-overheating\]; injections \[overheating\]; safety latch true/);
});

test('confirmed reset rechecks unsafe configured initial conditions and stays stopped', () => {
  const m = createMonitor({ motorTempC: 95 });
  assert.ok(m.command('reset', { confirmed: true }).ok);
  const after = m.snapshot();
  assert.equal(after.mode, 'faulted');
  assert.equal(after.latched, true);
  assert.equal(after.motionEnabled, false);
  assert.equal(after.telemetry.motor.state, 'stopped');
  assert.ok(after.faults.some(f => f.id === 'motor-overheating'));
});

test('multiple faults, lifecycle timestamps, no repeated alerts, escalation and reset audit', () => {
  const m = createMonitor(); m.inject('low-battery');
  const time = m.snapshot().faults[0].timestamp;
  const raised = () => m.snapshot().events.filter(e => e.type === 'fault-raised');
  m.tick(1000); assert.equal(m.snapshot().faults[0].timestamp, time);
  assert.equal(raised().length, 1);
  m.inject('critical-battery');
  assert.ok(m.snapshot().events.some(e => e.type === 'fault-changed'));
  m.inject('overheating'); m.inject('obstacle');
  assert.deepEqual(m.snapshot().faults.map(f => f.severity), ['critical', 'critical', 'warning']);
  m.clear('overheating'); assert.ok(m.snapshot().events.some(e => e.type === 'fault-cleared'));
  const before = m.snapshot(); m.command('reset', { confirmed: true }); const after = m.snapshot();
  assert.deepEqual(after.injections, []); assert.deepEqual(after.faults, []);
  assert.equal(after.latched, false); assert.equal(after.mode, 'idle');
  assert.ok(after.events.length > before.events.length);
  assert.equal(after.events.at(-1).type, 'reset');
  assert.ok(after.events.every((e, i, a) => i === 0 || e.timestamp >= a[i - 1].timestamp));
});

test('snapshot isolation, bounded events, deterministic reset and invalid command handling', () => {
  const a = createMonitor(), b = createMonitor();
  a.command('start'); b.command('start'); a.tick(); b.tick();
  assert.deepEqual(a.snapshot(), b.snapshot());
  const changed = a.snapshot(); changed.telemetry.battery.percent = 0; changed.events.length = 0;
  assert.notEqual(a.snapshot().telemetry.battery.percent, 0);
  assert.equal(a.command('fly').ok, false);
  assert.equal(a.inject('not-a-fault').ok, false);
  for (const dt of [-1, NaN, Infinity, '1000']) assert.throws(() => a.tick(dt), /dtMs/);
  for (let i = 0; i < 350; i++) a.command('inspect');
  assert.equal(a.snapshot().events.length, 300);
  assert.equal(new Set(a.snapshot().events.map(e => e.id)).size, 300);
  const history = a.snapshot().events;
  a.command('reset', { confirmed: true });
  assert.equal(a.snapshot().events.length, 300);
  assert.deepEqual(a.snapshot().events.slice(0, -1), history.slice(1));
  assert.equal(a.snapshot().events.at(-1).type, 'reset');
  assert.throws(() => createMonitor({ startTime: NaN }), /startTime/);
});
