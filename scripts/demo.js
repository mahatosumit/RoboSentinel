import { readFile } from 'node:fs/promises';
import { runScenario } from '../src/scenarios.js';

const scenarios = JSON.parse(await readFile(new URL('../scenarios/demo.json', import.meta.url), 'utf8'));
console.log('ROBOSENTINEL — DETERMINISTIC SIMULATION DEMO\nNo hardware connected. Assertions fail the command if a safety expectation is unmet.');
for (const scenario of scenarios) {
  console.log(`\n${scenario.name}`);
  for (const row of runScenario(scenario)) {
    console.log(`${new Date(row.timestamp).toISOString()} | ${row.label} | ${row.mode} | motion=${row.motionEnabled} | faults=${row.faults.join(',') || 'none'}${row.ok === undefined ? '' : ` | accepted=${row.ok}`}`);
  }
}
console.log('\nAll scenario assertions passed. This is synthetic evidence, not hardware validation.');
