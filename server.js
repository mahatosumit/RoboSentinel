import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Explicit allowlist: neither configuration nor arbitrary workspace files are served.
const routes = new Map([
  ['/', ['public/index.html', 'text/html']],
  ['/index.html', ['public/index.html', 'text/html']],
  ['/app.js', ['public/app.js', 'text/javascript']],
  ['/styles.css', ['public/styles.css', 'text/css']],
  ...['simulator', 'detector', 'policy', 'monitor'].map(name => [`/src/${name}.js`, [`src/${name}.js`, 'text/javascript']]),
]);

export function createAppServer() {
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    response.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Method not allowed'); return;
    }
    const path = request.url.split('?')[0];
    const route = routes.get(path);
    if (!route) { response.writeHead(404); response.end('Not found'); return; }
    try {
      const content = await readFile(new URL(route[0], import.meta.url));
      response.writeHead(200, { 'Content-Type': `${route[1]}; charset=utf-8`, 'Content-Length': content.length });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      console.error('Unable to serve application asset:', error.code);
      response.writeHead(500); response.end('Application asset unavailable');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError('PORT must be an integer from 1 to 65535');
  if (!['127.0.0.1', 'localhost', '0.0.0.0'].includes(host)) throw new RangeError('HOST must be localhost, 127.0.0.1 or explicitly 0.0.0.0');
  const server = createAppServer();
  server.on('error', error => { console.error(`RoboSentinel server failed: ${error.message}`); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`RoboSentinel: http://${host}:${port} (simulation only; Ctrl+C to stop)`));
}
