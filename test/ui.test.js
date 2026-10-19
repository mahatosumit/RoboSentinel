import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
test('documented text and semantic colours meet their dark-console contrast roles', async () => {
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const tokens = Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map(match => [match[1], match[2]]));
  for (const name of ['canvas', 'surface', 'surface-raised', 'border', 'ink', 'muted', 'accent', 'accent-strong', 'healthy', 'warning', 'critical']) {
    assert.ok(tokens[name], `Token ${name} exists`);
  }
  const ratio = (foreground, background) => {
    const values = [luminance(tokens[foreground]), luminance(tokens[background])].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  assert.ok(ratio('ink', 'surface') >= 4.5, 'ink on surface');
  assert.ok(ratio('muted', 'surface') >= 4.5, 'muted on surface');
  assert.ok(ratio('accent-strong', 'canvas') >= 4.5, 'accent-strong on canvas');
  assert.ok(ratio('healthy', 'surface') >= 4.5, 'healthy on surface');
  assert.ok(ratio('warning', 'surface') >= 4.5, 'warning on surface');
  assert.ok(ratio('critical', 'surface') >= 4.5, 'critical on surface');
});
