import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runScenario } from '../src/scenarios.js';

test('every checked-in scenario satisfies its expected state and fault assertions', async () => {
  const scenarios = JSON.parse(await readFile(new URL('../scenarios/demo.json', import.meta.url), 'utf8'));
  for (const scenario of scenarios) {
    const first = runScenario(scenario);
    const second = runScenario(scenario);
    assert.deepEqual(first, second, scenario.name);
    assert.ok(first.length >= 3);
  }
});

test('scenario runner rejects unknown operations and incorrect expectations', () => {
  assert.throws(() => runScenario({ name: 'bad', steps: [{ op: 'fly' }] }), /operation/);
  assert.throws(() => runScenario({ name: 'bad', steps: [{ op: 'tick', expect: { mode: 'navigating' } }] }), /mode/);
});
