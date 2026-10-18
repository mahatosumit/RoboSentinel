export function policyFor(faults) {
  const blockers = faults.filter(f => f.severity === 'critical' || f.id === 'obstacle-blockage');
  return {
    stopRequired: blockers.length > 0,
    reason: blockers.length ? `Simulated stop required: ${blockers.map(f => f.title).join('; ')}.` : 'No blocking fault detected. Recovery still requires explicit operator confirmation.',
  };
}

/** Eligibility is re-evaluated on command, not trusted from a prior UI snapshot. */
export function actionEligibility({ faults, telemetry, shutdown }) {
  const noFaults = faults.length === 0;
  const returnSafe = faults.every(f => f.id === 'low-battery' && f.severity === 'warning') &&
    telemetry?.battery?.percent > 10 && telemetry?.battery?.voltage > 21;
  const option = (allowed, reason, requiresConfirmation) => ({ allowed, reason, requiresConfirmation });
  return {
    inspect: option(true, 'Read-only inspection of simulated state and active fault evidence.', false),
    retry: option(!shutdown && noFaults,
      shutdown ? 'Reset is required after shutdown.' : noFaults ? 'All faults clear. Confirmation authorizes a monitored recovery check before motion.' : 'Retry blocked: clear every fault first; low battery should use return-to-base.', true),
    'return-to-base': option(!shutdown && returnSafe,
      shutdown ? 'Reset is required after shutdown.' : returnSafe ? 'Confirmation starts a synthetic 5-second transit after a recovery check; no real route is planned.' : 'Return blocked: need >10% battery, >21 V and no faults except warning-level low battery.', true),
    shutdown: option(!shutdown, shutdown ? 'Already shut down; reset to operate again.' : 'Confirmation stops this simulated plant; monitoring remains active.', true),
  };
}
