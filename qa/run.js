import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createAppServer } from '../server.js';

// Isolated test browser: never attaches to a user's profile or external browser.
const evidence = fileURLToPath(new URL(process.env.CAPTURE_EVIDENCE === '1'
  ? '../docs/evidence/' : '../test-results/browser-qa/', import.meta.url));
const replayEvidence = process.env.CAPTURE_REPLAY_EVIDENCE === '1'
  ? fileURLToPath(new URL('../docs/evidence/', import.meta.url)) : evidence;
await mkdir(evidence, { recursive: true });
const server = createAppServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let passed = 0;

async function eventually(check, label) {
  const end = Date.now() + 5000;
  let last;
  do {
    try { await check(); return; } catch (error) { last = error; }
    await new Promise(resolve => setTimeout(resolve, 25));
  } while (Date.now() < end);
  throw new Error(`${label}: ${last?.message}`);
}
async function text(page, selector, pattern) {
  const visiblePattern = new RegExp(pattern.source, pattern.flags.includes('i') ? pattern.flags : `${pattern.flags}i`);
  await eventually(async () => assert.match(await page.locator(selector).innerText(), visiblePattern), selector);
}
async function openPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [], failedAssets = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => failedAssets.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failedAssets.push(`${response.status()} ${response.url()}`); });
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.clock.pauseAt(new Date('2026-01-01T12:00:01Z'));
  try { await text(page, '#operator-message', /Local simulation ready/); }
  catch (error) {
    console.error('Initialization diagnostics', { errors, failedAssets,
      operator: await page.locator('#operator-message').textContent(),
      fatal: await page.locator('#fatal-error').textContent() });
    await page.screenshot({ path: `${evidence}qa-failure.png`, fullPage: true });
    await context.close();
    throw error;
  }
  return { context, page, errors, failedAssets };
}
async function check(name, fn, options) {
  const session = await openPage(options);
  try {
    await fn(session.page);
    assert.deepEqual(session.errors, [], 'JavaScript/console errors');
    assert.deepEqual(session.failedAssets, [], 'Failed asset requests');
    console.log(`PASS ${++passed}: ${name}`);
  } catch (error) {
    await session.page.screenshot({ path: `${evidence}qa-failure.png`, fullPage: true });
    throw new Error(`${name}: ${error.message}`, { cause: error });
  } finally { await session.context.close(); }
}
async function inject(page, name) {
  await page.getByLabel('Synthetic fault cause').selectOption(name);
  await page.getByRole('button', { name: 'Inject fault', exact: true }).click();
}
async function confirm(page, name) {
  await page.getByRole('button', { name, exact: true }).click();
  assert.ok(await page.getByRole('dialog').isVisible());
  assert.equal(await page.locator('#cancel-confirmation:focus').count(), 1, 'Cancel initially focused');
  await page.locator('#confirm-action').click();
  await eventually(async () => assert.equal(await page.getByRole('dialog').isVisible(), false), 'dialog closed');
}
async function layout(page, width) {
  for (const locator of await page.locator('main section, main button, main select, main .reading, main .fault-details dd').all()) {
    const box = await locator.boundingBox();
    if (box) assert.ok(box.x >= -1 && box.x + box.width <= width + 1, `Element outside ${width}px viewport: ${await locator.getAttribute('class')}`);
  }
}

try {
  browser = await chromium.launch({ headless: true });
  console.log(`Isolated browser: Chromium ${browser.version()}; Playwright 1.64.1`);
  await check('healthy load, live telemetry, empty state and keyboard start/pause', async page => {
    await text(page, '#commanded-mode', /^idle$/);
    await text(page, '#faults', /No active faults detected/);
    await text(page, '#telemetry', /82\.\d %/);
    await text(page, '#telemetry', /healthy/);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.skip-link:focus-visible').count(), 1);
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Start mission', exact: true }).focus();
    await page.keyboard.press('Enter');
    await text(page, '#commanded-mode', /^navigating$/);
    await page.clock.runFor(2000);
    await text(page, '#motion-state', /Motion enabled/);
    await page.getByRole('button', { name: 'Pause mission', exact: true }).click();
    await text(page, '#commanded-mode', /^paused$/);
    await layout(page, 1440);
    await page.screenshot({ path: `${evidence}healthy-desktop.png`, fullPage: true });
  });
  await check('overheat stop, critical badge, rejected start, clear and explicit retry', async page => {
    await page.locator('#start').click();
    await inject(page, 'overheating');
    await text(page, '#commanded-mode', /^faulted$/);
    await text(page, '#motion-state', /Motion disabled/);
    await text(page, '#faults', /95 °C/);
    await text(page, '#faults', /CRITICAL/);
    await text(page, '#faults', /Recommended response/);
    await text(page, '#faults', /Detected:.*UTC/);
    assert.match(await page.locator('#monitor-status').getAttribute('class'), /critical/);
    assert.equal(await page.getByRole('button', { name: 'Retry mission…', exact: true }).isDisabled(), true);
    await page.locator('#start').click();
    await text(page, '#operator-message', /blocked/);
    await text(page, '#history', /command rejected/);
    await page.screenshot({ path: `${evidence}overheat-stop.png`, fullPage: true });
    await page.getByRole('button', { name: 'Clear Motor overheating', exact: true }).click();
    await text(page, '#safety-title', /latched/i);
    await text(page, '#motion-state', /Motion disabled/);
    await page.getByRole('button', { name: 'Retry mission…', exact: true }).click();
    assert.equal(await page.locator('#cancel-confirmation:focus').count(), 1);
    await page.keyboard.press('Escape');
    await text(page, '#motion-state', /Motion disabled/);
    await confirm(page, 'Retry mission…');
    await text(page, '#commanded-mode', /^recovering$/);
    await page.clock.runFor(1100);
    await text(page, '#commanded-mode', /^navigating$/);
  });
  for (const [cause, title, stop] of [
    ['low-battery', 'Battery reserve low', false], ['critical-battery', 'Battery reserve low', true],
    ['sensor-failure', 'Navigation sensor failure', true], ['obstacle', 'Navigation route blocked', true],
  ]) await check(`${cause} injection and action eligibility`, async page => {
    await page.locator('#start').click();
    await inject(page, cause);
    await text(page, '#faults', new RegExp(title));
    await text(page, '#motion-state', stop ? /Motion disabled/ : /Motion enabled/);
    assert.ok(await page.getByRole('button', { name: 'Retry mission…', exact: true }).isDisabled());
    assert.equal(await page.getByRole('button', { name: 'Return to base…', exact: true }).isDisabled(), cause !== 'low-battery');
  });
  await check('stacked faults priority and confirmed reset retaining evidence', async page => {
    await inject(page, 'low-battery'); await inject(page, 'obstacle'); await inject(page, 'sensor-failure');
    assert.equal(await page.locator('.fault-card').count(), 3);
    assert.match(await page.locator('.fault-card').first().innerText(), /CRITICAL.*Navigation sensor failure/s);
    await page.locator('#reset').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.fault-card').count(), 3);
    await confirm(page, 'Reset simulation…');
    await text(page, '#commanded-mode', /^idle$/);
    await text(page, '#fault-count', /^0$/);
    await text(page, '#history', /faults \[.*sensor-failure/);
    await text(page, '#history', /Operator confirmed simulation reset/);
  });
  for (const cause of ['sensor-stale', 'communication-loss']) await check(`${cause} timeout and commanded/reported state separation`, async page => {
    await page.locator('#start').click(); await inject(page, cause);
    await text(page, '#fault-count', /^0$/);
    await page.clock.runFor(3000);
    await text(page, '#fault-count', /^0$/);
    await page.clock.runFor(1000);
    await text(page, '#motion-state', /Motion disabled/);
    await text(page, '#faults', /Sensor readings stale/);
    if (cause === 'communication-loss') {
      await text(page, '#faults', /Heartbeat lost/);
      await text(page, '#reported-mode', /^navigating$/);
      await text(page, '#commanded-mode', /^faulted$/);
      await page.screenshot({ path: `${evidence}communication-loss.png`, fullPage: true });
    }
  });
  await check('monitoring gap, confirmed shutdown and reset', async page => {
    await page.locator('#start').click();
    await page.clock.fastForward(10_000);
    await text(page, '#history', /Monitoring update delayed/);
    await text(page, '#motion-state', /Motion disabled/);
    await confirm(page, 'Shut down…');
    await text(page, '#safety-title', /shut down/);
    assert.ok(await page.locator('#start').isDisabled());
    await confirm(page, 'Reset simulation…');
    await text(page, '#commanded-mode', /^idle$/);
  });
  await check('confirmation revalidates changed interlocks instead of trusting old eligibility', async page => {
    await page.locator('#start').click(); await inject(page, 'communication-loss');
    await page.getByRole('button', { name: 'Retry mission…', exact: true }).click();
    await page.clock.runFor(4000);
    await page.locator('#confirm-action').click();
    await text(page, '#operator-message', /blocked/);
    await text(page, '#commanded-mode', /^faulted$/);
    await text(page, '#history', /command rejected/);
  });
  await check('confirmed low-battery return-to-base completes synthetic transit', async page => {
    await inject(page, 'low-battery');
    await confirm(page, 'Return to base…');
    await page.clock.runFor(7000);
    await text(page, '#commanded-mode', /^idle$/);
    await text(page, '#history', /Synthetic return-to-base transit complete/);
    await text(page, '#motion-state', /Motion disabled/);
  });
  await check('narrow layout, touch sizes and keyboard confirmation', async page => {
    await inject(page, 'overheating');
    await layout(page, 390);
    for (const control of await page.locator('main button, main select').all()) {
      const box = await control.boundingBox();
      if (box) assert.ok(box.height >= 44, 'Touch target >=44px');
    }
    await page.locator('#reset').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#cancel-confirmation:focus-visible').count(), 1);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#confirm-action:focus-visible').count(), 1);
    await page.keyboard.press('Enter');
    await text(page, '#commanded-mode', /^idle$/);
    await page.screenshot({ path: `${evidence}narrow-screen.png`, fullPage: true });
  }, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await check('320px and tablet widths retain readable, contained controls', async page => {
    await inject(page, 'sensor-failure');
    await layout(page, 320);
    await page.setViewportSize({ width: 768, height: 1024 });
    await layout(page, 768);
  }, { viewport: { width: 320, height: 740 } });
  await check('deterministic incident replay proves hidden faults, recovery and exported evidence', async page => {
    await page.getByRole('link', { name: 'Replay safety case', exact: true }).click();
    await text(page, '#replay-progress', /0\s*\/\s*12/);
    assert.ok(await page.locator('#replay-export').isDisabled());
    const next = () => page.locator('#replay-next').click();
    await next();
    await text(page, '#replay-commanded', /^navigating$/);
    await next(); await next();
    await text(page, '#replay-reported', /^navigating$/);
    await text(page, '#replay-commanded', /^faulted$/);
    await text(page, '#replay-motion', /disabled/i);
    await text(page, '#replay-faults', /Heartbeat lost/);
    await text(page, '#replay-evidence', /4000/);
    await page.screenshot({ path: `${replayEvidence}incident-replay.png`, fullPage: true });
    const held = await page.locator('#replay-evidence').innerText();
    await page.clock.runFor(60_000);
    assert.equal(await page.locator('#replay-evidence').innerText(), held, 'Replay never advances with wall time');
    await next();
    assert.doesNotMatch(await page.locator('#replay-faults').innerText(), /Motor temperature high/);
    await next();
    await text(page, '#replay-history', /command rejected/);
    await next();
    await text(page, '#replay-faults', /Motor temperature high/);
    await text(page, '#replay-faults', /95/);
    await next(); await next();
    await text(page, '#replay-latch', /latched/i);
    await text(page, '#replay-motion', /disabled/i);
    await text(page, '#replay-eligibility', /confirmation/i);
    await next(); await next(); await next();
    await text(page, '#replay-commanded', /^recovering$/);
    await text(page, '#replay-motion', /disabled/i);
    await next();
    await text(page, '#replay-commanded', /^navigating$/);
    await text(page, '#replay-progress', /12\s*\/\s*12/);
    assert.ok(await page.locator('#replay-next').isDisabled());
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#replay-export').click();
    const download = await downloadPromise;
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    const exported = JSON.parse(Buffer.concat(chunks).toString());
    assert.equal(exported.schema, 'robosentinel.incident.v1');
    assert.equal(exported.replay.frames.length, 12);
    assert.equal(exported.replay.complete, true);
    assert.equal(exported.replay.frames[2].state.telemetry.mode, 'navigating');
    assert.equal(exported.replay.frames[2].state.mode, 'faulted');
    assert.ok(exported.replay.frames.every(frame => frame.checks.length && frame.checks.every(check => check.passed)));
    await page.screenshot({ path: `${replayEvidence}incident-recovery.png`, fullPage: true });
    await page.locator('#replay-reset').click();
    await text(page, '#replay-progress', /0\s*\/\s*12/);
    await text(page, '#replay-commanded', /^idle$/);
    assert.ok(await page.locator('#replay-export').isDisabled());
  });
  await check('incident replay is keyboard-operable and contained at 320px', async page => {
    await page.getByRole('link', { name: 'Replay safety case', exact: true }).click();
    // The HTML progress placeholder exists before the dynamic engine import;
    // a disabled button cannot receive keyboard focus until initialization ends.
    await text(page, '#replay-status', /Independent replay ready/);
    await text(page, '#replay-progress', /0\s*\/\s*12/);
    await page.locator('#replay-next').focus();
    await page.keyboard.press('Enter');
    await text(page, '#replay-progress', /1\s*\/\s*12/);
    await layout(page, 320);
    assert.ok(await page.locator('#replay-next:focus-visible').count());
    for (const control of await page.locator('main button').all()) {
      const box = await control.boundingBox();
      if (box) assert.ok(box.height >= 44, 'Replay target >=44px');
    }
    await page.setViewportSize({ width: 768, height: 1024 });
    await layout(page, 768);
  }, { viewport: { width: 320, height: 740 } });
  await check('loaded cockpit remains a local simulation when HTTP networking goes offline', async page => {
    await page.context().setOffline(true);
    await page.locator('#start').click();
    await inject(page, 'overheating');
    await page.clock.runFor(1000);
    await text(page, '#commanded-mode', /^faulted$/);
    await text(page, '#faults', /95 °C/);
    await text(page, '#motion-state', /Motion disabled/);
    assert.ok(await page.locator('#fatal-error').isHidden());
    // There is no robot/network telemetry API. Browser HTTP loss must not be
    // misrepresented as an injected simulated robot communication-loss fault.
    assert.doesNotMatch(await page.locator('#faults').innerText(), /Heartbeat lost/);
  });
  const replayFailureContext = await browser.newContext();
  try {
    const page = await replayFailureContext.newPage();
    await page.route('**/src/incident.js', route => route.fulfill({ status: 503,
      contentType: 'text/plain', body: 'Intentional QA unavailable module' }));
    await page.goto(`${origin}/replay.html`, { waitUntil: 'networkidle' });
    await text(page, '#replay-error', /Replay unavailable/);
    await text(page, '#replay-commanded', /Unavailable/);
    for (const control of await page.locator('main button').all()) assert.ok(await control.isDisabled());
    console.log(`PASS ${++passed}: replay HTTP 503 module failure is explicit and disables controls (intentional failed request)`);
  } finally { await replayFailureContext.close(); }
  // Deliberately fail a local module request to exercise the real error UI.
  // Expected network failure is checked separately from the clean-load journeys.
  const failureContext = await browser.newContext();
  try {
    const page = await failureContext.newPage();
    await page.route('**/src/monitor.js', route => route.abort('failed'));
    await page.goto(origin, { waitUntil: 'networkidle' });
    await text(page, '#fatal-error', /Monitor unavailable/);
    await text(page, '#commanded-mode', /Unavailable/);
    await text(page, '#motion-state', /Motion state unavailable/);
    for (const control of await page.locator('main button, main select').all()) assert.ok(await control.isDisabled());
    assert.equal(await page.getByRole('dialog').isVisible(), false);
    await page.screenshot({ path: `${evidence}module-error.png`, fullPage: true });
    console.log(`PASS ${++passed}: module-loading failure reports unavailable state and disables controls (intentional failed request)`);
  } finally { await failureContext.close(); }
  console.log(`Browser QA: ${passed} journeys passed. These are automated Chromium checks, not a human accessibility certification.`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
