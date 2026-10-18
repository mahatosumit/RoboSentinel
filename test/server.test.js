import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
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

test('raw malformed and traversal paths cannot escape the asset allowlist', async t => {
  const server = createAppServer();
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const send = (path, method = 'GET') => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: server.address().port, path, method }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject); req.end();
  });
  for (const path of ['/../package.json', '/src/../../.git/config', '/%2e%2e/.env', '/%252e%252e/etc/passwd', '/src\\..\\.env', '/app.js%00', '//app.js', '/%ZZ']) {
    const response = await send(path);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['referrer-policy'], 'no-referrer');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
  }
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'TRACE']) {
    const response = await send('/?command=reset&confirmed=true', method);
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.allow, 'GET, HEAD');
  }
  const response = await send('/?command=shutdown');
  assert.equal(response.status, 200);
  assert.ok(response.body.includes('SIMULATION ONLY'));
  assert.ok(response.headers['content-security-policy'].includes("frame-ancestors 'none'"));
  assert.equal(response.headers['access-control-allow-origin'], undefined);
});
