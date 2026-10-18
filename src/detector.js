export const THRESHOLDS = Object.freeze({
  lowBatteryPct: 20, criticalBatteryPct: 10, criticalVoltage: 21,
  warmMotorC: 70, criticalMotorC: 85, staleMs: 3000, obstacleM: 0.5,
});
const modes = ['idle', 'navigating', 'paused', 'faulted', 'recovering'];
const finite = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

/** Validation is fail-closed; missing or impossible data cannot imply health. */
function invalidEvidence(t, now) {
  if (!t || typeof t !== 'object' || Array.isArray(t)) return 'Telemetry packet is missing or not an object.';
  const errors = [];
  for (const [label, value] of [['Packet timestamp', t.timestamp], ['Heartbeat', t.heartbeat], ['Sensor timestamp', t.sensor?.timestamp]]) {
    if (!finite(value, -8.64e15, now)) errors.push(`${label} must be a valid epoch timestamp no later than the monitor clock`);
  }
  for (const [label, value, min, max] of [
    ['Battery percent', t.battery?.percent, 0, 100], ['Battery voltage', t.battery?.voltage, 0, 60],
    ['Motor temperature', t.motor?.temperatureC, -20, 150], ['Obstacle distance', t.obstacle?.distanceM, 0, 1000],
  ]) {
    if (!finite(value, min, max)) errors.push(`${label} must be finite and within ${min}..${max}`);
  }
  if (!modes.includes(t.mode)) errors.push('Reported robot mode is unknown');
  if (!['stopped', 'running'].includes(t.motor?.state)) errors.push('Motor state is unknown');
  if (!['healthy', 'failed'].includes(t.sensor?.health)) errors.push('Sensor health is unknown');
  if (!['online', 'offline'].includes(t.sensor?.communication)) errors.push('Sensor communication status is unknown');
  if (typeof t.obstacle?.detected !== 'boolean') errors.push('Obstacle detection flag must be boolean');
  return errors.join('; ');
}

export function detectFaults(telemetry, now) {
  if (!finite(now, -8.64e15, 8.64e15)) throw new RangeError('Monitor clock must be a finite epoch timestamp');
  const faults = [];
  function add(id, title, severity, evidence, explanation, recommendedResponse) {
    faults.push({ id, title, severity, evidence, explanation, recommendedResponse, timestamp: now });
  }
  const invalid = invalidEvidence(telemetry, now);
  if (invalid) {
    add('invalid-telemetry', 'Invalid telemetry packet', 'critical', invalid,
      'Missing, non-finite, impossible or future-dated values invalidate safe motion decisions.',
      'Stop simulated motion. Inspect the telemetry source before confirming any retry.');
    return faults;
  }
  const t = telemetry;
  if (t.battery.percent <= THRESHOLDS.lowBatteryPct || t.battery.voltage <= THRESHOLDS.criticalVoltage) {
    const critical = t.battery.percent <= THRESHOLDS.criticalBatteryPct || t.battery.voltage <= THRESHOLDS.criticalVoltage;
    add('low-battery', 'Battery reserve low', critical ? 'critical' : 'warning',
      `${t.battery.percent}% battery; ${t.battery.voltage} V. Warning <=20%; critical <=10% or <=21 V.`,
      'Insufficient power reserve can interrupt navigation or safe stopping.',
      critical ? 'Stop and inspect power. Confirm shutdown; do not attempt return-to-base with critically low power.' : 'Confirm return-to-base only if the route sensors, communication and motor remain healthy.');
  }
  if (t.motor.temperatureC >= THRESHOLDS.warmMotorC) {
    const critical = t.motor.temperatureC >= THRESHOLDS.criticalMotorC;
    add('motor-overheating', 'Motor temperature high', critical ? 'critical' : 'warning',
      `${t.motor.temperatureC} °C; warning >=70 °C; critical >=85 °C.`,
      'Thermal loading outside the illustrative operating envelope needs inspection.',
      critical ? 'Stop, inspect the motor and allow cooling. Retry only after the cause clears.' : 'Inspect motor loading. Do not initiate a new mission until temperature is below 70 °C.');
  }
  if (t.sensor.health === 'failed' || t.sensor.communication === 'offline') {
    add('sensor-failure', 'Navigation sensor failure', 'critical',
      `Sensor health: ${t.sensor.health}; sensor link: ${t.sensor.communication}.`,
      'Navigation cannot be trusted when its sensor reports a failure or loses its link.',
      'Stop and inspect sensor connections. Confirm retry only after healthy fresh readings return.');
  }
  for (const [id, title, value, recommendation] of [
    ['communication-loss', 'Heartbeat lost', t.heartbeat, 'Inspect the simulated communication link. Do not authorize blind motion.'],
    ['sensor-stale', 'Sensor readings stale', t.sensor.timestamp, 'Inspect the sensor. Require fresh readings before confirming retry.'],
    ['telemetry-stale', 'Telemetry packet stale', t.timestamp, 'Inspect the telemetry source. Require a fresh packet before confirming retry.'],
  ]) {
    const age = now - value;
    if (age > THRESHOLDS.staleMs) add(id, title, 'critical',
      `Age ${Math.round(age)} ms exceeds ${THRESHOLDS.staleMs} ms; source time ${new Date(value).toISOString()}.`,
      'The independent monitor clock, not the packet clock, determines freshness.', `Stop simulated motion. ${recommendation}`);
  }
  if (t.obstacle.detected && t.obstacle.distanceM <= THRESHOLDS.obstacleM) {
    add('obstacle-blockage', 'Navigation route blocked', 'warning',
      `Obstacle detected at ${t.obstacle.distanceM} m; stop boundary <=${THRESHOLDS.obstacleM} m.`,
      'A nearby detected obstacle requires a navigation pause even though its alert severity is warning.',
      'Pause and inspect the route. Clear the obstruction; explicitly confirm retry after all interlocks clear.');
  }
  const rank = { critical: 0, warning: 1, info: 2 };
  return faults.sort((a, b) => rank[a.severity] - rank[b.severity] || a.id.localeCompare(b.id));
}
