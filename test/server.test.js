import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createAppServer } from '../server.js';

test('HTTP serves dashboard and modules with security headers, not repository files', async t => {
  const server = createAppServer();
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [path, type, marker] of [
    ['/', 'text/html', 'SIMULATION ONLY'], ['/app.js', 'text/javascript', 'createMonitor'],
    ['/styles.css', 'text/css', '--accent'], ['/src/monitor.js', 'text/javascript', 'export function createMonitor'],
    ['/src/detector.js', 'text/javascript', 'detectFaults'], ['/src/policy.js', 'text/javascript', 'policyFor'],
    ['/src/simulator.js', 'text/javascript', 'createSimulator'],
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type').includes(type));
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(response.headers.get('content-security-policy').includes("default-src 'self'"));
    assert.ok((await response.text()).includes(marker));
  }
  for (const path of ['/package.json', '/.env', '/.git/config', '/README.md', '/src/nope.js', '/%2e%2e/%2e%2e/etc/passwd', '/%ZZ']) {
    assert.equal((await fetch(base + path)).status, 404);
  }
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  const head = await fetch(base, { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
});
