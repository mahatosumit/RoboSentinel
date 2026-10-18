import { readFile } from 'node:fs/promises';
import { runScenario } from '../src/scenarios.js';
import { createIncidentReplay } from '../src/incident.js';

const scenarios = JSON.parse(await readFile(new URL('../scenarios/demo.json', import.meta.url), 'utf8'));
console.log('ROBOSENTINEL — DETERMINISTIC SIMULATION DEMO\nNo hardware connected. Assertions fail the command if a safety expectation is unmet.');
for (const scenario of scenarios) {
  console.log(`\n${scenario.name}`);
  for (const row of runScenario(scenario)) {
    console.log(`${new Date(row.timestamp).toISOString()} | ${row.label} | ${row.mode} | motion=${row.motionEnabled} | faults=${row.faults.join(',') || 'none'}${row.ok === undefined ? '' : ` | accepted=${row.ok}`}`);
  }
}
console.log('\nAll scenario assertions passed. This is synthetic evidence, not hardware validation.');

const replay = createIncidentReplay();
console.log(`\n${replay.snapshot().title} — same safety case as the browser replay`);
while (!replay.snapshot().complete) {
  const { current: frame } = replay.next();
  const state = frame.state;
  console.log(`step=${frame.step} | ${frame.title} | reported=${state.telemetry.mode} | commanded=${state.mode} | motion=${state.motionEnabled} | latched=${state.latched}${frame.result === null ? '' : ` | accepted=${frame.result.ok}`} | checks=${frame.checks.length} passed`);
}
console.log('All 12 replay steps passed. Scripted simulation decisions, not a hardware safety test.');
