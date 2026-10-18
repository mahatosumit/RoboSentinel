const MODES = new Set(['idle', 'navigating', 'paused', 'faulted', 'recovering']);
const INJECTIONS = new Set([
  'low-battery', 'critical-battery', 'overheating', 'sensor-failure',
  'sensor-stale', 'communication-loss', 'obstacle',
]);
const DEFAULTS = Object.freeze({
  seed: 1,
  batteryPct: 82,
  motorTempC: 39,
  drainPerSecond: 0.02,
  ambientTempC: 22,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rounded = value => Math.round(value * 1000) / 1000;

function finiteRange(name, value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be a finite number between ${min} and ${max}`);
  }
}

function injectionName(name) {
  if (!INJECTIONS.has(name)) throw new RangeError(`Unknown injection: ${String(name)}`);
}

/** A deterministic synthetic plant; the caller owns the clock and safety policy. */
export function createSimulator(config = {}) {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new TypeError('Simulator configuration must be an object');
  }
  const options = Object.fromEntries(Object.entries(DEFAULTS).map(([key, value]) =>
    [key, config[key] === undefined ? value : config[key]]));
  if (!Number.isSafeInteger(options.seed)) throw new RangeError('seed must be a safe integer');
  finiteRange('batteryPct', options.batteryPct, 0, 100);
  finiteRange('motorTempC', options.motorTempC, -20, 150);
  finiteRange('drainPerSecond', options.drainPerSecond, 0, 1);
  finiteRange('ambientTempC', options.ambientTempC, -20, 50);

  const injections = new Set();
  let mode;
  let batteryPct;
  let motorTempC;
  let randomState;
  let variation;
  let lastPacket;
  let staleSensorTime;

  // Mulberry32 uses only local integer state, including for seed zero.
  function random() {
    randomState = (randomState + 0x6D2B79F5) >>> 0;
    let value = randomState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  function updateVariation() {
    variation = {
      battery: (random() - 0.5) * 0.06,
      temperature: (random() - 0.5) * 0.3,
      voltage: (random() - 0.5) * 0.02,
      distance: (random() - 0.5) * 0.1,
    };
  }

  function reset() {
    mode = 'idle';
    batteryPct = options.batteryPct;
    motorTempC = options.motorTempC;
    randomState = options.seed >>> 0;
    lastPacket = null;
    staleSensorTime = null;
    injections.clear();
    updateVariation();
  }

  function advance(dtMs) {
    finiteRange('dtMs', dtMs, 0, Number.MAX_VALUE);
    if (dtMs === 0) return;
    const seconds = dtMs / 1000;
    const moving = mode === 'navigating';
    batteryPct = Math.max(0, batteryPct - options.drainPerSecond * seconds * (moving ? 1 : 0.15));
    const targetTempC = options.ambientTempC + (moving ? 27 : 0);
    // Exponential relaxation remains bounded even for a very large time step.
    motorTempC = targetTempC + (motorTempC - targetTempC) * Math.exp(-seconds / 60);
    updateVariation();
  }

  function sample(now) {
    finiteRange('now', now, -8.64e15, 8.64e15);
    if (injections.has('communication-loss') && lastPacket !== null) {
      return structuredClone(lastPacket);
    }

    let percent = batteryPct === 0 ? 0 : clamp(batteryPct + variation.battery, 0, 100);
    if (injections.has('low-battery')) percent = Math.min(percent, 15);
    if (injections.has('critical-battery')) percent = Math.min(percent, 5);
    let voltage = 21 + percent * 0.05 + variation.voltage;
    if (injections.has('critical-battery')) voltage = Math.min(voltage, 20.5);
    let temperatureC = clamp(motorTempC + variation.temperature, -20, 150);
    if (injections.has('overheating')) temperatureC = Math.max(temperatureC, 95);

    if (injections.has('sensor-stale')) {
      // Before the first packet there is no caller clock: anchor lazily to now.
      staleSensorTime ??= now;
    } else {
      staleSensorTime = null;
    }
    const sensorFailed = injections.has('sensor-failure');
    const blocked = injections.has('obstacle');
    lastPacket = {
      timestamp: now,
      heartbeat: now,
      battery: { percent: rounded(percent), voltage: rounded(voltage) },
      motor: { temperatureC: rounded(temperatureC), state: mode === 'navigating' ? 'running' : 'stopped' },
      sensor: {
        health: sensorFailed ? 'failed' : 'healthy',
        communication: sensorFailed ? 'offline' : 'online',
        timestamp: staleSensorTime ?? now,
      },
      obstacle: { detected: blocked, distanceM: blocked ? 0.3 : rounded(3.5 + variation.distance) },
      mode,
    };
    return structuredClone(lastPacket);
  }

  function setMode(nextMode) {
    if (!MODES.has(nextMode)) throw new RangeError(`Unknown mode: ${String(nextMode)}`);
    mode = nextMode;
  }

  function inject(name) {
    injectionName(name);
    if (injections.has(name)) return;
    if (name === 'sensor-stale') staleSensorTime = lastPacket?.sensor.timestamp ?? null;
    injections.add(name);
  }

  function clear(name) {
    injectionName(name);
    injections.delete(name);
    if (name === 'sensor-stale') staleSensorTime = null;
  }

  reset();
  return { sample, advance, setMode, inject, clear, reset, get injections() { return injections; } };
}
