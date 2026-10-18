const byId = (id) => document.getElementById(id);
const injectionLabels = {
  'low-battery': 'Low battery', 'critical-battery': 'Critical battery',
  overheating: 'Motor overheating', 'sensor-failure': 'Sensor failure',
  'sensor-stale': 'Stale sensor readings', 'communication-loss': 'Communication loss',
  obstacle: 'Obstacle blockage',
};
const actionLabels = { inspect: 'Inspect state', retry: 'Retry mission', 'return-to-base': 'Return to base', shutdown: 'Shut down' };
const descriptions = {
  retry: 'Retry the simulated mission? This can authorize motion after a latched safety stop. The monitor will recheck the current interlocks at confirmation.',
  'return-to-base': 'Command the simulated robot to return to base? This can authorize motion. The monitor will recheck the current interlocks at confirmation.',
  shutdown: 'Shut down the simulated robot? Motion will stop. Safety monitoring continues; reset the simulation to operate again.',
  reset: 'Reset the simulated plant? All injected causes, active faults, shutdown and safety latch will be cleared. The robot returns to idle. Prior event history is preserved and a reset event is recorded.',
};
const severityRank = { critical: 0, warning: 1, info: 2 };
const actionNodes = new Map();
const telemetryNodes = new Map();
let monitor;
let state;
let pendingAction = null;
let previousFocus = null;
let lastWall = Date.now();
let lastMonotonic = performance.now();
let sessionElapsed = 0;
let lastFaultSignature = '';
let lastInjectionSignature = '';
let lastEventSignature = '';
let timer;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function setText(id, text) {
  const target = byId(id);
  if (target.textContent !== text) target.textContent = text;
}
function words(value) { return typeof value === 'string' ? value.replaceAll('-', ' ') : 'Unavailable'; }
function number(value, places = 1) { return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(places) : 'Unavailable'; }
function timestamp(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unavailable';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Invalid timestamp' : date.toISOString().replace('T', ' ').replace('Z', ' UTC');
}
function age(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unavailable';
  const elapsed = state.now - value;
  return elapsed < 0 ? `Future dated (${number(-elapsed / 1000)} s)` : `${number(elapsed / 1000)} s`;
}
function evidenceText(value) {
  if (typeof value === 'string') return value;
  return value == null ? 'No detail supplied by monitor.' : JSON.stringify(value);
}
function message(text, error = false) {
  const target = byId('operator-message');
  target.textContent = text;
  target.classList.toggle('error', error);
}
function fail(error) {
  clearInterval(timer);
  byId('fatal-error').hidden = false;
  setText('fatal-error', `Monitor unavailable: ${error instanceof Error ? error.message : String(error)}. Monitoring updates have stopped; displayed readings may be outdated. Reload this page to initialize a new local simulation.`);
  setText('monitor-status', 'Monitoring error');
  byId('monitor-status').className = 'badge critical';
  setText('safety-title', 'State unavailable');
  setText('safety-detail', 'Do not interpret the last displayed readings as current.');
  setText('commanded-mode', 'Unavailable');
  setText('motion-state', 'Motion state unavailable · monitoring stopped; readings below are stale');
  byId('safety-panel').className = 'safety-panel critical';
  document.querySelectorAll('main button, main select').forEach((control) => { control.disabled = true; });
  pendingAction = null;
  if (byId('confirmation').open) byId('confirmation').close();
}

function buildTelemetry() {
  const fields = [
    ['battery', 'Battery', ['Voltage']],
    ['motor', 'Motor', ['Motor state']],
    ['sensor', 'Sensor', ['Communication', 'Reading age', 'Reading timestamp (UTC)']],
    ['obstacle', 'Obstacle', ['Distance']],
    ['link', 'Packet / heartbeat', ['Packet age', 'Heartbeat age', 'Heartbeat timestamp (UTC)']],
    ['motion', 'Mission', ['Motion authorization', 'Reported mode']],
  ];
  for (const [id, label, details] of fields) {
    const card = node('section', 'telemetry-card');
    card.append(node('h3', '', label));
    const reading = node('p', 'reading', '—');
    card.append(reading);
    const list = node('dl', 'telemetry-details');
    const values = details.map((detail) => {
      const row = node('div');
      const value = node('dd', '', '—');
      row.append(node('dt', '', detail), value);
      list.append(row);
      return value;
    });
    card.append(list);
    byId('telemetry').append(card);
    telemetryNodes.set(id, { reading, values });
  }
}
function reading(id, value, details) {
  const target = telemetryNodes.get(id);
  target.reading.textContent = value;
  details.forEach((detail, index) => { target.values[index].textContent = detail; });
}
function renderTelemetry() {
  const telemetry = state.telemetry ?? {};
  reading('battery', `${number(telemetry.battery?.percent)} %`, [`${number(telemetry.battery?.voltage, 2)} V`]);
  reading('motor', `${number(telemetry.motor?.temperatureC)} °C`, [words(telemetry.motor?.state)]);
  reading('sensor', words(telemetry.sensor?.health), [words(telemetry.sensor?.communication), age(telemetry.sensor?.timestamp), timestamp(telemetry.sensor?.timestamp)]);
  reading('obstacle', typeof telemetry.obstacle?.detected === 'boolean' ? (telemetry.obstacle.detected ? 'Detected' : 'Clear') : 'Unavailable', [`${number(telemetry.obstacle?.distanceM, 2)} m`]);
  reading('link', 'Packet ages', [age(telemetry.timestamp), age(telemetry.heartbeat), timestamp(telemetry.heartbeat)]);
  reading('motion', state.running ? 'Running' : 'Not running', [state.motionEnabled ? 'Enabled' : 'Disabled', words(telemetry.mode)]);
  setText('packet-time', `Packet timestamp: ${timestamp(telemetry.timestamp)} · All ages use the independent simulation clock.`);
}

function renderFaults() {
  const faults = [...state.faults].sort((a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3) || String(a.id).localeCompare(String(b.id)));
  setText('fault-count', String(faults.length));
  const signature = JSON.stringify([faults, state.latched]);
  if (signature === lastFaultSignature) return;
  lastFaultSignature = signature;
  const content = document.createDocumentFragment();
  if (!faults.length) {
    const empty = node('div', 'empty-state');
    empty.append(node('strong', '', 'No active faults detected'), node('p', '', state.latched ? 'The safety stop remains latched. Clear causes and explicitly confirm a permitted retry to resume.' : 'Monitoring remains active. Inject a synthetic fault to examine detection, interlocks and event history.'));
    content.append(empty);
  }
  for (const fault of faults) {
    const card = node('article', 'fault-card');
    const heading = node('div', 'fault-heading');
    const severity = Object.hasOwn(severityRank, fault.severity) ? fault.severity : 'info';
    heading.append(node('span', `badge ${severity}`, String(fault.severity).toUpperCase()), node('h3', '', fault.title));
    const details = node('dl', 'fault-details');
    const rows = [['Rule / explanation', fault.explanation ?? `Monitor rule: ${fault.id}. ${fault.severity === 'critical' ? 'Critical fault detected.' : 'Abnormal condition detected.'} See evidence and the authoritative safety interlock above.`], ['Evidence', evidenceText(fault.evidence)], ['Recommended response', fault.recommendedResponse]];
    for (const [label, value] of rows) {
      const row = node('div');
      row.append(node('dt', '', label), node('dd', '', value ?? 'Not supplied.'));
      details.append(row);
    }
    card.append(heading, details, node('p', 'fault-time', `Detected: ${timestamp(fault.timestamp)}`));
    content.append(card);
  }
  byId('faults').replaceChildren(content);
}
function buildActions() {
  for (const [action, label] of Object.entries(actionLabels)) {
    const row = node('div', 'action-row');
    const button = node('button', '', action === 'inspect' ? label : `${label}…`);
    button.type = 'button';
    button.disabled = true;
    const reason = node('p', '', 'Waiting for monitor policy.');
    reason.id = `reason-${action}`;
    button.setAttribute('aria-describedby', reason.id);
    button.addEventListener('click', () => requestAction(action));
    row.append(button, reason);
    byId('actions').append(row);
    actionNodes.set(action, { button, reason });
  }
}
function renderActions() {
  for (const [action, target] of actionNodes) {
    const policy = state.actions?.[action];
    target.button.disabled = !policy?.allowed;
    target.reason.textContent = policy?.reason || (policy?.allowed ? (policy.requiresConfirmation ? 'Available. Explicit confirmation required.' : 'Available. Read-only inspection.') : 'Action unavailable.');
  }
}
function renderInjections() {
  const injections = [...state.injections];
  setText('injection-count', String(injections.length));
  const signature = JSON.stringify(injections);
  if (signature === lastInjectionSignature) return;
  lastInjectionSignature = signature;
  const focus = document.activeElement;
  const restoreFocus = byId('injections').contains(focus);
  const content = document.createDocumentFragment();
  if (!injections.length) content.append(node('li', 'muted', 'No causes injected.'));
  for (const name of injections) {
    const row = node('li');
    const button = node('button', '', 'Clear cause');
    const label = injectionLabels[name] ?? name;
    button.type = 'button';
    button.setAttribute('aria-label', `Clear ${label}`);
    button.addEventListener('click', () => operate(() => monitor.clear(name), `${label} cause cleared. The monitor determines whether recovery is permitted.`));
    row.append(node('span', '', label), button);
    content.append(row);
  }
  byId('injections').replaceChildren(content);
  if (restoreFocus) byId('injection-select').focus();
}
function renderHistory() {
  const events = state.events;
  setText('event-count', `${events.length} / 300 retained`);
  const signature = JSON.stringify(events);
  if (signature === lastEventSignature) return;
  lastEventSignature = signature;
  const list = byId('history');
  const wasAtEnd = list.scrollHeight - list.clientHeight - list.scrollTop < 24;
  const oldScroll = list.scrollTop;
  const fragment = document.createDocumentFragment();
  if (!events.length) fragment.append(node('li', 'empty-state', 'No events recorded.'));
  for (const event of events) {
    const item = node('li');
    const time = node('time', '', timestamp(event.timestamp));
    if (Number.isFinite(event.timestamp) && !Number.isNaN(new Date(event.timestamp).valueOf())) time.dateTime = new Date(event.timestamp).toISOString();
    item.append(time, node('span', 'event-type', words(event.type)), node('span', '', event.message));
    fragment.append(item);
  }
  list.replaceChildren(fragment);
  list.scrollTop = wasAtEnd ? list.scrollHeight : oldScroll;
}
function render() {
  state = monitor.snapshot();
  setText('commanded-mode', words(state.mode));
  setText('reported-mode', words(state.telemetry?.mode));
  setText('motion-state', state.shutdown ? 'Shutdown active · motion disabled' : `Motion ${state.motionEnabled ? 'enabled' : 'disabled'} · mission ${state.running ? 'running' : 'not running'}`);
  const monitoringSeverity = state.faults.some(fault => fault.severity === 'critical') ? 'critical'
    : state.faults.length || state.latched || state.shutdown ? 'warning' : 'healthy';
  setText('monitor-status', state.shutdown ? 'Monitoring active · shutdown' : state.faults.length
    ? `Monitoring active · ${state.faults.length} fault${state.faults.length === 1 ? '' : 's'}`
    : state.latched ? 'Monitoring active · stop latched' : 'Monitoring active · no faults');
  byId('monitor-status').className = `badge ${monitoringSeverity}`;
  setText('simulation-time', timestamp(state.now));
  setText('wall-time', timestamp(Date.now()));
  setText('elapsed-time', `${number(sessionElapsed / 1000)} s wall time accounted`);
  const blocking = state.policy?.stopRequired;
  const safetyTitle = state.shutdown ? 'Simulation shut down' : blocking ? 'Safety stop required' : state.latched ? 'Safety stop latched' : 'No stop interlock active';
  setText('safety-title', safetyTitle);
  setText('safety-detail', state.shutdown ? 'Motion is disabled. Monitoring continues independently. Reset the simulated plant to operate again.' : state.latched && !blocking ? 'The detected cause has cleared, but motion remains interlocked until a permitted retry is explicitly confirmed.' : state.policy?.reason || 'The monitor reports no blocking condition. All motion commands remain subject to current policy.');
  byId('safety-panel').className = `safety-panel${blocking ? ' critical' : state.latched || state.shutdown ? ' warning' : ''}`;
  byId('start').disabled = state.shutdown || state.running;
  byId('pause').disabled = state.shutdown || !state.running;
  setText('run-control-reason', state.shutdown ? 'Start and pause are unavailable during shutdown. Reset the simulation to operate again.' : state.running ? 'Start is unavailable because the mission is already running. Pause stops mission motion, not monitoring.' : 'Pause is unavailable because the mission is not running. Start requests are checked by the monitor; a latched safety stop requires a confirmed retry.');
  byId('reset').disabled = false;
  byId('injection-select').disabled = false;
  byId('inject').disabled = false;
  renderTelemetry();
  renderFaults();
  renderActions();
  renderInjections();
  renderHistory();
}

// Monitoring is independent of mission motion. Consume real elapsed time even
// after background-tab throttling; no cap silently drops a stale-data interval.
function synchronizeClock() {
  const wall = Date.now();
  const monotonic = performance.now();
  const elapsed = Math.max(0, wall - lastWall, monotonic - lastMonotonic);
  lastWall = wall;
  lastMonotonic = monotonic;
  if (elapsed > 0) {
    monitor.tick(elapsed);
    sessionElapsed += elapsed;
  }
}
function refresh() {
  try { synchronizeClock(); render(); } catch (error) { fail(error); }
}
function operate(operation, fallback) {
  try {
    synchronizeClock();
    const result = operation();
    render();
    message(result?.message || fallback, result?.ok === false);
  } catch (error) { fail(error); }
}
function requestAction(action) {
  try {
    synchronizeClock();
    render();
    if (action === 'inspect') {
      operate(() => monitor.command(action), 'Simulation state inspected; see telemetry, fault evidence and history.');
      return;
    }
    const policy = state.actions?.[action];
    if (action !== 'reset' && !policy?.allowed) {
      message(policy?.reason || 'This action is currently unavailable.', true);
      return;
    }
    pendingAction = action;
    previousFocus = document.activeElement;
    setText('confirmation-title', action === 'reset' ? 'Reset simulation?' : `${actionLabels[action]}?`);
    setText('confirmation-description', descriptions[action]);
    setText('confirmation-policy', action === 'reset' ? 'This changes only this browser tab’s simulated scene. Event history is preserved.' : policy.reason || 'The monitor will validate eligibility again when you confirm.');
    setText('confirm-action', action === 'reset' ? 'Confirm reset' : `Confirm ${actionLabels[action].toLowerCase()}`);
    byId('confirmation').returnValue = 'cancel';
    byId('confirmation').showModal();
    byId('cancel-confirmation').focus();
  } catch (error) { fail(error); }
}

byId('confirmation').addEventListener('close', () => {
  const action = pendingAction;
  pendingAction = null;
  if (byId('confirmation').returnValue === 'confirm' && action) {
    operate(() => monitor.command(action, { confirmed: true }), `${action === 'reset' ? 'Simulation reset' : actionLabels[action]} completed.`);
  }
  if (previousFocus?.isConnected && !previousFocus.disabled) previousFocus.focus();
  else byId('reset').focus();
});
byId('confirmation').addEventListener('cancel', () => { byId('confirmation').returnValue = 'cancel'; });
byId('start').addEventListener('click', () => operate(() => monitor.command('start'), 'Start command processed.'));
byId('pause').addEventListener('click', () => operate(() => monitor.command('pause'), 'Pause command processed; safety monitoring continues.'));
byId('reset').addEventListener('click', () => requestAction('reset'));
byId('injection-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = byId('injection-select').value;
  operate(() => monitor.inject(name), `${injectionLabels[name]} cause injected. Safety monitoring continues.`);
});

async function initialize() {
  try {
    const { createMonitor } = await import('/src/monitor.js');
    monitor = createMonitor();
    lastWall = Date.now();
    lastMonotonic = performance.now();
    buildTelemetry();
    buildActions();
    render();
    message('Local simulation ready. Start the mission or inject a synthetic fault. No hardware is connected.');
    timer = setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && byId('fatal-error').hidden) refresh(); });
    window.addEventListener('pageshow', () => { if (byId('fatal-error').hidden) refresh(); });
  } catch (error) { fail(error); }
}
initialize();
