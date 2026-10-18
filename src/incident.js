import { createMonitor } from './monitor.js';

const STALE_FAULTS = ['communication-loss', 'sensor-stale', 'telemetry-stale'];
const STEPS = [
  {
    title: 'Start a healthy mission',
    explanation: 'The operator starts simulated navigation. Fresh telemetry and clear interlocks authorize motion.',
    operation: { op: 'command', action: 'start' },
    mode: 'navigating', motionEnabled: true, latched: false, faults: [],
  },
  {
    title: 'Lose the communication link',
    explanation: 'The synthetic link now freezes the last navigating packet. At age zero the monitor has not yet observed a stale packet; an injected cause is not itself a diagnosis.',
    operation: { op: 'inject', name: 'communication-loss' },
    mode: 'navigating', motionEnabled: true, latched: false, faults: [],
  },
  {
    title: 'Observe the timeout and latch a stop',
    explanation: 'Four separate 1000 ms monitoring updates age the frozen packet to 4000 ms without a monitoring gap. Heartbeat, sensor and packet freshness fail. The commanded safety state is faulted even though the old packet still reports navigating.',
    operation: { op: 'tick', dtMs: 1000, count: 4 },
    mode: 'faulted', motionEnabled: false, latched: true, faults: STALE_FAULTS,
  },
  {
    title: 'Introduce heat behind the lost link',
    explanation: 'Overheating is now a hidden synthetic plant cause. The monitor still observes the frozen cool packet, so it cannot diagnose motor overheating yet. Plant causes and observed knowledge are distinct.',
    operation: { op: 'inject', name: 'overheating' },
    mode: 'faulted', motionEnabled: false, latched: true, faults: STALE_FAULTS,
  },
  {
    title: 'Reject a blind confirmed retry',
    explanation: 'Operator confirmation cannot override stale observations. The actual policy rejects retry while all three freshness faults remain active.',
    operation: { op: 'command', action: 'retry', confirmed: true },
    mode: 'faulted', motionEnabled: false, latched: true, faults: STALE_FAULTS,
  },
  {
    title: 'Restore the link and discover the heat',
    explanation: 'Clearing communication loss delivers a fresh 95 °C packet. Freshness faults clear, but motor overheating is now actually observed. The safety stop remains latched.',
    operation: { op: 'clear', name: 'communication-loss' },
    mode: 'faulted', motionEnabled: false, latched: true, faults: ['motor-overheating'],
  },
  {
    title: 'Reject retry with a hot motor',
    explanation: 'A fresh packet does not imply a safe plant. Confirmed retry is rejected because the observed motor fault still blocks recovery.',
    operation: { op: 'command', action: 'retry', confirmed: true },
    mode: 'faulted', motionEnabled: false, latched: true, faults: ['motor-overheating'],
  },
  {
    title: 'Clear heat without restarting',
    explanation: 'Clearing the synthetic overheating cause restores normal readings and removes every fault. The safety latch persists: clearing a cause never automatically reauthorizes motion.',
    operation: { op: 'clear', name: 'overheating' },
    mode: 'faulted', motionEnabled: false, latched: true, faults: [],
  },
  {
    title: 'Reject start through the latch',
    explanation: 'The ordinary start command cannot bypass a latched safety stop, even after every fault has cleared.',
    operation: { op: 'command', action: 'start' },
    mode: 'faulted', motionEnabled: false, latched: true, faults: [],
  },
  {
    title: 'Require explicit retry confirmation',
    explanation: 'Retry is now eligible, but the operator has not confirmed it. The monitor rejects the request and keeps motion disabled.',
    operation: { op: 'command', action: 'retry' },
    mode: 'faulted', motionEnabled: false, latched: true, faults: [],
  },
  {
    title: 'Confirm a monitored recovery check',
    explanation: 'Explicit confirmation starts recovering, not navigation. Motion remains disabled and the latch remains set until a fresh monitoring update verifies recovery.',
    operation: { op: 'command', action: 'retry', confirmed: true },
    mode: 'recovering', motionEnabled: false, latched: true, faults: [],
  },
  {
    title: 'Verify fresh recovery before motion',
    explanation: 'One fresh 1000 ms update completes the real monitor recovery check. Only now does the monitor clear the latch, resume simulated navigation and record recovery-complete.',
    operation: { op: 'tick', dtMs: 1000 },
    mode: 'navigating', motionEnabled: true, latched: false, faults: [],
  },
];

/** A fixed safety case executed by an isolated monitor, one operator step at a time. */
export function createIncidentReplay() {
  let monitor;
  let frames;
  let current;
  let failure;

  function snapshot() {
    return structuredClone({
      id: 'lost-link-hidden-heat',
      title: 'Lost link, hidden heat, verified recovery',
      stepIndex: frames.length,
      totalSteps: STEPS.length,
      complete: frames.length === STEPS.length && failure === null,
      current,
      frames,
    });
  }

  function reset() {
    monitor = createMonitor({ seed: 1, startTime: Date.parse('2026-01-01T12:00:00Z') });
    frames = [];
    failure = null;
    current = {
      step: 0,
      title: 'Ready to replay the safety incident',
      explanation: 'A new isolated deterministic simulation is idle. Advance through the actual monitor operations to distinguish hidden plant causes, observed evidence, stop policy and confirmed recovery. No hardware or live plant is connected.',
      operation: null,
      result: null,
      state: monitor.snapshot(),
      checks: [],
    };
    return snapshot();
  }

  function next() {
    if (failure) throw failure;
    if (frames.length === STEPS.length) return snapshot();
    try {
      const definition = STEPS[frames.length];
      const step = frames.length + 1;
      const operation = definition.operation;
      let result = null;
      if (operation.op === 'command') {
        result = monitor.command(operation.action, { confirmed: operation.confirmed === true });
      } else if (operation.op === 'inject') result = monitor.inject(operation.name);
      else if (operation.op === 'clear') result = monitor.clear(operation.name);
      else {
        for (let tick = 0; tick < (operation.count ?? 1); tick++) monitor.tick(operation.dtMs);
      }

      const state = monitor.snapshot();
      const checks = [];
      function check(label, expected, observed) {
        checks.push({ label, expected, observed, passed: JSON.stringify(expected) === JSON.stringify(observed) });
      }
      check('Commanded mode', definition.mode, state.mode);
      check('Simulated motion enabled', definition.motionEnabled, state.motionEnabled);
      check('Safety stop latched', definition.latched, state.latched);
      check('Active faults', definition.faults, state.faults.map(fault => fault.id));
      check('Policy requires stop', definition.faults.length > 0, state.policy.stopRequired);

      if (result !== null) check('Operation accepted', ![5, 7, 9, 10].includes(step), result.ok);
      if (step >= 2 && step <= 5) {
        check('Packet remains frozen', frames[0].state.telemetry, state.telemetry);
        check('Packet still reports navigating', 'navigating', state.telemetry.mode);
      }
      if (step === 2) {
        check('Packet age (ms)', 0, state.now - state.telemetry.timestamp);
        check('Communication loss cause exists', true, state.injections.includes('communication-loss'));
      }
      if (step >= 3 && step <= 5) {
        check('Packet age (ms)', 4000, state.now - state.telemetry.timestamp);
        check('Heartbeat age (ms)', 4000, state.now - state.telemetry.heartbeat);
        check('Sensor age (ms)', 4000, state.now - state.telemetry.sensor.timestamp);
      }
      if (step === 4) {
        check('Hidden plant causes', ['communication-loss', 'overheating'], state.injections);
        check('Motor overheating diagnosed', false, state.faults.some(fault => fault.id === 'motor-overheating'));
      }
      if (step === 5 || step === 7) check('Retry eligible', false, state.actions.retry.allowed);
      if (step === 6) {
        check('Remaining plant causes', ['overheating'], state.injections);
        check('Observed motor temperature (°C)', 95, state.telemetry.motor.temperatureC);
        check('Packet age (ms)', 0, state.now - state.telemetry.timestamp);
        check('Heartbeat age (ms)', 0, state.now - state.telemetry.heartbeat);
        check('Sensor age (ms)', 0, state.now - state.telemetry.sensor.timestamp);
      }
      if (step >= 8) {
        check('Remaining plant causes', [], state.injections);
        check('Retry eligible', true, state.actions.retry.allowed);
      }
      if ([5, 7, 9, 10].includes(step)) {
        check('Latest audit event', 'command-rejected', state.events.at(-1)?.type);
        check('Rejection evidence matches command', result.message, state.events.at(-1)?.message);
      }
      if (step === 9) check('Rejection names the safety latch', true, result.message.includes('latch'));
      if (step === 10) check('Rejection requires confirmation', true, result.message.includes('confirmation'));
      if (step === 11) check('Latest audit event', 'recovery-requested', state.events.at(-1)?.type);
      if (step === 12) {
        check('Recovery advanced clock (ms)', 1000, state.now - frames.at(-1).state.now);
        check('Packet age (ms)', 0, state.now - state.telemetry.timestamp);
        check('Latest audit event', 'recovery-complete', state.events.at(-1)?.type);
      }

      current = { step, title: definition.title, explanation: definition.explanation, operation, result, state, checks };
      frames.push(current);
      const mismatches = checks.filter(check => !check.passed);
      if (mismatches.length > 0) {
        throw new Error(`Incident step ${step} failed: ${mismatches.map(check => `${check.label}: expected ${JSON.stringify(check.expected)}, observed ${JSON.stringify(check.observed)}`).join('; ')}`);
      }
      return snapshot();
    } catch (error) {
      // A failed check or operation cannot advance or become a completed replay.
      // Only reconstruction via reset may authorize another attempt.
      failure = error;
      throw error;
    }
  }

  reset();
  return { snapshot, next, reset };
}
