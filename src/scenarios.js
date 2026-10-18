import { createMonitor } from './monitor.js';

/** Executable, deterministic acceptance scenarios. No dynamic code evaluation. */
export function runScenario(scenario) {
  const monitor = createMonitor(scenario.config);
  const transcript = [];
  for (const step of scenario.steps) {
    let result;
    if (step.op === 'command') result = monitor.command(step.action, { confirmed: step.confirmed === true });
    else if (step.op === 'inject') result = monitor.inject(step.name);
    else if (step.op === 'clear') result = monitor.clear(step.name);
    else if (step.op === 'tick') {
      for (let i = 0; i < (step.count ?? 1); i++) monitor.tick(step.dtMs ?? 1000);
    } else throw new Error(`Unknown scenario operation: ${step.op}`);
    const state = monitor.snapshot();
    const observed = { mode: state.mode, motionEnabled: state.motionEnabled, latched: state.latched,
      faults: state.faults.map(f => f.id), ...(result ? { ok: result.ok } : {}) };
    for (const [key, expected] of Object.entries(step.expect ?? {})) {
      if (JSON.stringify(observed[key]) !== JSON.stringify(expected)) {
        throw new Error(`${scenario.name}: ${step.op}: ${key}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(observed[key])}`);
      }
    }
    transcript.push({ label: step.label ?? step.op, timestamp: state.now, ...observed });
  }
  return transcript;
}
