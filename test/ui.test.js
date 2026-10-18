import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
test('documented text and semantic colours meet 4.5:1 contrast on white and canvas', async () => {
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const tokens = Object.fromEntries([...css.matchAll(/--([a-z]+):(#[0-9a-f]{6})/g)].map(match => [match[1], match[2]]));
  for (const name of ['ink', 'muted', 'accent', 'healthy', 'warning', 'critical']) {
    assert.ok(tokens[name], `Token ${name} exists`);
    for (const background of ['#ffffff', tokens.canvas]) {
      const values = [luminance(tokens[name]), luminance(background)].sort((a, b) => b - a);
      const ratio = (values[0] + 0.05) / (values[1] + 0.05);
      assert.ok(ratio >= 4.5, `${name} on ${background}: ${ratio.toFixed(2)}:1`);
    }
  }
});
