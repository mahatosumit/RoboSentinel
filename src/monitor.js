import { createSimulator } from './simulator.js';
import { detectFaults, THRESHOLDS } from './detector.js';
import { policyFor, actionEligibility } from './policy.js';

export function createMonitor(config = {}) {
  const initialTime = config.startTime ?? Date.parse('2026-01-01T12:00:00Z');
  if (typeof initialTime !== 'number' || !Number.isFinite(initialTime) || Math.abs(initialTime) > 8.64e15) {
    throw new RangeError('startTime must be a finite epoch timestamp');
  }
  const simulator = createSimulator(config);
  let now = initialTime;
  let mode = 'idle';
  let telemetry;
  let faults = [];
  let latched = false;
  let shutdown = false;
  let mission = null;
  let recoveryMs = 0;
  let returnMs = 0;
  let gapFault = null;
  let nextEventId = 1;
  const events = [];

  function log(type, message) {
    events.push({ id: nextEventId++, timestamp: now, type, message });
    if (events.length > 300) events.splice(0, events.length - 300);
  }
  function setMode(value) { mode = value; simulator.setMode(value); }
  function stop() {
    mission = null;
    recoveryMs = 0;
    returnMs = 0;
    setMode('faulted');
  }
  function evaluate() {
    telemetry = simulator.sample(now);
    const detected = detectFaults(telemetry, now);
    if (gapFault) detected.unshift(gapFault);
    const previous = new Map(faults.map(f => [f.id, f]));
    for (const fault of detected) {
      const old = previous.get(fault.id);
      if (old) {
        fault.timestamp = old.timestamp;
        if (old.severity !== fault.severity) log('fault-changed', `${fault.title}: ${old.severity} → ${fault.severity}. ${fault.evidence}`);
      } else log('fault-raised', `${fault.severity.toUpperCase()}: ${fault.title}. ${fault.evidence}`);
    }
    for (const old of faults) {
      if (!detected.some(f => f.id === old.id)) log('fault-cleared', `${old.title} cleared. Motion is not automatically reauthorized.`);
    }
    faults = detected;
    const policy = policyFor(faults);
    if (policy.stopRequired) {
      if (!latched || mode === 'navigating' || mode === 'recovering') log('safety-stop', `${policy.reason} Stop is latched; no automatic restart.`);
      latched = true;
      stop();
      // The independent simulated stop can change plant mode even when packets
      // are lost. A frozen reported mode is never treated as authoritative.
      telemetry = simulator.sample(now);
    }
  }
  function snapshot() {
    return structuredClone({
      now, telemetry, mode, running: mode === 'navigating' || mode === 'recovering',
      motionEnabled: mode === 'navigating' && !shutdown && !policyFor(faults).stopRequired,
      faults, events, injections: [...simulator.injections].sort(), latched, shutdown,
      policy: policyFor(faults), actions: actionEligibility({ faults, telemetry, shutdown }), mission,
    });
  }
  function tick(dtMs = 1000) {
    if (typeof dtMs !== 'number' || !Number.isFinite(dtMs) || dtMs < 0 || now + dtMs > 8.64e15) {
      throw new RangeError('dtMs must be finite, nonnegative and within the epoch clock range');
    }
    gapFault = null;
    if (dtMs > THRESHOLDS.staleMs) {
      now += dtMs;
      gapFault = {
        id: 'monitoring-gap', title: 'Monitoring update delayed', severity: 'critical', timestamp: now,
        evidence: `No monitoring callback for ${Math.round(dtMs)} ms; allowed gap <=${THRESHOLDS.staleMs} ms.`,
        explanation: 'A browser callback delay cannot certify continuous observation of the simulated mission.',
        recommendedResponse: 'Stop and inspect the session. Require a fresh monitoring update and confirmed retry.',
      };
      // Stop before advancing blind time; this is a simulation-only fallback,
      // not proof that a browser could stop real hardware during suspension.
      evaluate();
      simulator.advance(dtMs);
      evaluate();
      return snapshot();
    }
    evaluate();
    let remaining = dtMs;
    while (remaining > 0) {
      const step = Math.min(1000, remaining);
      const previousMode = mode;
      simulator.advance(step);
      now += step;
      remaining -= step;
      evaluate();
      if (previousMode === 'recovering' && mode === 'recovering') {
        recoveryMs -= step;
        const eligible = actionEligibility({ faults, telemetry, shutdown });
        if (!eligible[mission]?.allowed) {
          latched = true; stop(); log('recovery-blocked', 'Recovery cancelled: interlocks changed during the recovery check.');
        } else if (recoveryMs <= 0) {
          const missing = [
            ['packet', telemetry.timestamp], ['heartbeat', telemetry.heartbeat], ['sensor', telemetry.sensor.timestamp],
          ].filter(([, timestamp]) => timestamp !== now).map(([name]) => name);
          if (missing.length > 0) {
            latched = true; stop();
            log('recovery-blocked', `Recovery cancelled: missing fresh ${missing.join(', ')} observations from the current monitoring update.`);
          } else {
            latched = false; setMode('navigating');
            log('recovery-complete', `${mission} recovery check passed; simulated motion enabled.`);
          }
        }
      } else if (previousMode === 'navigating' && mode === 'navigating' && mission === 'return-to-base') {
        returnMs -= step;
        if (returnMs <= 0) {
          setMode('idle'); mission = null;
          log('base-arrival', 'Synthetic return-to-base transit complete. Robot idle; no real route or charging is modelled.');
        }
      }
      evaluate();
    }
    return snapshot();
  }
  function reject(message) { log('command-rejected', message); return { ok: false, message }; }
  function command(action, options = {}) {
    if (action === 'reset' && options?.confirmed !== true) return reject('reset requires explicit operator confirmation.');
    evaluate();
    if (action === 'reset') {
      const cleared = `faults [${faults.map(f => f.id).join(', ')}]; injections [${[...simulator.injections].sort().join(', ')}]; safety latch ${latched}; shutdown ${shutdown}`;
      simulator.reset(); faults = []; gapFault = null; latched = false; shutdown = false;
      mission = null; recoveryMs = 0; returnMs = 0; setMode('idle');
      evaluate();
      log('reset', `Operator confirmed simulation reset. Cleared prior state: ${cleared}. Plant restored to configured initial state. History preserved; motion remains disabled.`);
      return { ok: true, message: 'Simulation reset. Robot idle unless configured initial conditions require a stop.' };
    }
    if (action === 'inspect') {
      log('inspection', `${mode}; ${faults.length} active faults; simulated motion ${mode === 'navigating' ? 'enabled' : 'disabled'}.`);
      return { ok: true, message: 'Inspected current simulation state. Review telemetry, fault evidence and history.' };
    }
    if (action === 'pause') {
      if (shutdown) return reject('Pause unavailable after shutdown; reset is required.');
      mission = null; recoveryMs = 0; returnMs = 0;
      if (!latched) setMode('paused');
      log('operator-pause', 'Simulated mission paused. Monitoring and any safety latch remain active.');
      evaluate(); return { ok: true, message: 'Simulated motion paused; monitoring continues.' };
    }
    if (action === 'start') {
      if (shutdown || latched || faults.length > 0) return reject('Start blocked by shutdown, a safety latch or an active fault. Clear faults and use confirmed retry or eligible return-to-base.');
      if (mode === 'navigating' || mode === 'recovering') return reject('Mission already active.');
      mission = 'mission'; setMode('navigating'); log('mission-start', 'Operator started simulated navigation.');
      evaluate(); return { ok: true, message: 'Simulated mission started.' };
    }
    const actions = actionEligibility({ faults, telemetry, shutdown });
    if (!Object.hasOwn(actions, action)) return reject(`Unknown simulation action: ${String(action)}`);
    if (!actions[action].allowed) return reject(actions[action].reason);
    if (options?.confirmed !== true) return reject(`${action} requires explicit operator confirmation.`);
    if (action === 'shutdown') {
      shutdown = true; latched = true; stop(); log('shutdown', 'Operator confirmed simulated shutdown. Reset required before motion.');
      evaluate(); return { ok: true, message: 'Simulated shutdown applied; safety monitoring continues.' };
    }
    mission = action; recoveryMs = 1000; returnMs = 5000;
    setMode('recovering');
    log('recovery-requested', `Operator confirmed ${action}. Motion disabled during recovery check.`);
    evaluate(); return { ok: true, message: `${action} confirmed. A fresh monitored recovery check is required before simulated motion.` };
  }
  function injectionOperation(name, clearing) {
    try { clearing ? simulator.clear(name) : simulator.inject(name); }
    catch (error) { return reject(error.message); }
    log(clearing ? 'cause-cleared' : 'fault-injected', `${clearing ? 'Cleared' : 'Injected'} synthetic cause: ${name}.`);
    evaluate();
    return { ok: true, message: `${name} ${clearing ? 'cause cleared; no automatic restart' : 'injected in simulation'}.` };
  }
  log('initialized', 'Local simulation initialized; independent safety monitoring active. No hardware connected.');
  evaluate();
  return { tick, command, inject: name => injectionOperation(name, false), clear: name => injectionOperation(name, true), snapshot };
}
