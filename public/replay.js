const byId = (id) => document.getElementById(id);
let replay;
let view;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function text(id, value) {
  byId(id).textContent = String(value);
}

function words(value) {
  return typeof value === 'string' ? value.replaceAll('-', ' ') : 'Unavailable';
}

function evidence(value) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? 'Not supplied';
}

function milliseconds(value) {
  return Number.isFinite(value) ? `${value} ms` : 'Unavailable';
}

function age(now, timestamp) {
  return Number.isFinite(now) && Number.isFinite(timestamp)
    ? milliseconds(now - timestamp) : 'Unavailable';
}

function details(rows) {
  const list = node('dl', 'replay-details');
  for (const [label, value] of rows) {
    const row = node('div');
    row.append(node('dt', '', label), node('dd', '', evidence(value)));
    list.append(row);
  }
  return list;
}

function jsonSection(title, value) {
  const section = node('section');
  section.append(node('h3', '', title), node('pre', '', evidence(value)));
  return section;
}

function renderChecks(checks) {
  const section = node('section');
  section.append(node('h3', '', 'Computed checks'));
  if (checks.length === 0) {
    section.append(node('p', 'muted', 'No step checks have run in this initial snapshot.'));
    return section;
  }
  const list = node('ul', 'replay-checks');
  for (const check of checks) {
    const item = node('li');
    item.append(
      node('span', `badge ${check.passed ? 'healthy' : 'critical'}`, check.passed ? 'Check passed' : 'Check failed'),
      node('h4', '', check.label),
      details([['Expected', check.expected], ['Observed', check.observed]]),
    );
    list.append(item);
  }
  section.append(list);
  return section;
}

function renderEvidence(frame) {
  const state = frame.state;
  const telemetry = state.telemetry;
  const clocks = node('section');
  clocks.append(node('h3', '', 'Independent clock and packet evidence'), details([
    ['Replay ID', view.id],
    ['Simulation clock', milliseconds(state.now)],
    ['Packet timestamp', milliseconds(telemetry.timestamp)],
    ['Packet age', age(state.now, telemetry.timestamp)],
    ['Heartbeat timestamp', milliseconds(telemetry.heartbeat)],
    ['Heartbeat age', age(state.now, telemetry.heartbeat)],
    ['Sensor timestamp', milliseconds(telemetry.sensor?.timestamp)],
    ['Sensor age', age(state.now, telemetry.sensor?.timestamp)],
    ['Reported motor temperature', `${evidence(telemetry.motor?.temperatureC)} °C`],
  ]));
  byId('replay-evidence').replaceChildren(
    clocks,
    jsonSection('Executed operation', frame.operation),
    jsonSection('Operation result', frame.result),
    renderChecks(frame.checks),
    jsonSection('Current monitor policy', state.policy),
    jsonSection('Injected simulation causes', state.injections),
  );
}

function renderFaults(state) {
  text('replay-fault-count', state.faults.length);
  const fragment = document.createDocumentFragment();
  if (state.faults.length === 0) {
    fragment.append(node('p', 'empty-state', state.latched
      ? 'No active faults in this snapshot. The stop remains latched; cleared faults do not authorize motion.'
      : 'No active faults in this snapshot.'));
  }
  for (const fault of state.faults) {
    const article = node('article', 'replay-fault');
    const severity = ['critical', 'warning', 'info'].includes(fault.severity) ? fault.severity : 'info';
    article.append(
      node('span', `badge ${severity}`, fault.severity),
      node('h3', '', fault.title),
      details([
        ['Rule', fault.id],
        ['Explanation', fault.explanation ?? 'No explanation supplied by the monitor.'],
        ['Evidence', fault.evidence],
        ['Detected at simulation time', milliseconds(fault.timestamp)],
        ['Recommended response', fault.recommendedResponse],
      ]),
    );
    fragment.append(article);
  }
  byId('replay-faults').replaceChildren(fragment);
}

function renderTimeline(frames) {
  const fragment = document.createDocumentFragment();
  if (frames.length === 0) fragment.append(node('li', 'empty-state', 'No steps executed. Advance once to begin the incident.'));
  for (const frame of frames) {
    const item = node('li');
    const passed = frame.checks.filter((check) => check.passed).length;
    const result = frame.result === null ? 'No command result for this operation.'
      : `${frame.result.ok ? 'Accepted' : 'Rejected'}: ${frame.result.message}`;
    item.append(
      node('p', 'replay-step-meta', `Step ${frame.step} · simulation clock ${milliseconds(frame.state.now)}`),
      node('h3', '', frame.title),
      node('p', '', result),
      node('p', 'muted', `Commanded ${frame.state.mode} · reported ${frame.state.telemetry.mode} · motion ${frame.state.motionEnabled ? 'enabled' : 'disabled'} · ${passed} / ${frame.checks.length} checks passed`),
    );
    fragment.append(item);
  }
  byId('replay-timeline').replaceChildren(fragment);
}

function renderHistory(events) {
  const fragment = document.createDocumentFragment();
  if (events.length === 0) fragment.append(node('li', 'empty-state', 'No monitor events in this snapshot.'));
  for (const event of events) {
    const item = node('li');
    item.append(
      node('p', 'replay-step-meta', `Simulation time ${milliseconds(event.timestamp)}`),
      node('h3', '', words(event.type)),
      node('p', '', event.message),
    );
    fragment.append(item);
  }
  byId('replay-history').replaceChildren(fragment);
}

function render(nextView) {
  if (!nextView?.current?.state?.telemetry || !Array.isArray(nextView.frames)
    || !Array.isArray(nextView.current.checks)) throw new Error('The incident engine returned an invalid replay snapshot.');
  view = nextView;
  const frame = view.current;
  const state = frame.state;
  const retry = state.actions.retry;
  text('replay-title', view.title);
  text('replay-progress', `${view.stepIndex} / ${view.totalSteps}`);
  text('replay-completion', view.complete ? 'Complete evidence' : 'Partial evidence');
  text('replay-export-note', view.frames.length === 0 ? 'Execute a step to enable evidence download.'
    : view.complete ? 'Download the complete executed replay and monitor snapshots.'
      : `Download partial evidence: ${view.stepIndex} of ${view.totalSteps} steps executed.`);
  text('replay-reported', state.telemetry.mode);
  text('replay-commanded', state.mode);
  text('replay-motion', state.motionEnabled ? 'Motion enabled' : 'Motion disabled');
  text('replay-latch', state.latched ? 'Stop latched' : 'Stop not latched');
  text('replay-eligibility', `${retry.allowed ? 'Retry allowed' : 'Retry blocked'} · ${retry.reason}${retry.requiresConfirmation ? ' · Explicit confirmation required.' : ' · Confirmation not required by this snapshot.'}`);
  text('replay-step-number', `Step ${view.stepIndex}`);
  text('replay-step-title', frame.title);
  text('replay-explanation', frame.explanation);
  renderEvidence(frame);
  renderFaults(state);
  renderTimeline(view.frames);
  renderHistory(state.events);
  byId('replay-error').hidden = true;
  byId('replay-next').disabled = view.complete;
  byId('replay-reset').disabled = false;
  byId('replay-export').disabled = view.frames.length === 0;
}

function fail(error, initialization = false) {
  const message = error instanceof Error ? error.message : String(error);
  byId('replay-error').hidden = false;
  text('replay-error', `Replay unavailable: ${message}. ${initialization
    ? 'Reload the page to try initialization again. No replay controls are available.'
    : 'Execution stopped. Any evidence below is the last successfully rendered snapshot. Restart to reconstruct the independent replay.'}`);
  text('replay-status', 'Replay unavailable. No further evidence steps are executing.');
  text('replay-completion', 'Replay unavailable');
  for (const id of ['replay-reported', 'replay-commanded', 'replay-motion', 'replay-latch']) text(id, 'Unavailable');
  text('replay-eligibility', 'Unavailable while the replay is stopped.');
  byId('replay-next').disabled = true;
  byId('replay-export').disabled = true;
  byId('replay-reset').disabled = initialization;
}

byId('replay-next').addEventListener('click', () => {
  const hadFocus = document.activeElement === byId('replay-next');
  try {
    render(replay.next());
    text('replay-status', `Step ${view.stepIndex} of ${view.totalSteps}: ${view.current.title}.${view.complete ? ' Replay complete.' : ' Waiting for your next step.'}`);
    if (hadFocus && view.complete) byId('replay-reset').focus();
  } catch (error) { fail(error); }
});

byId('replay-reset').addEventListener('click', () => {
  try {
    render(replay.reset());
    text('replay-status', 'Replay restarted at step 0. A fresh independent instance is ready.');
  } catch (error) { fail(error); }
});

byId('replay-export').addEventListener('click', () => {
  let url;
  let anchor;
  try {
    const payload = { schema: 'robosentinel.incident.v1', scope: 'simulation-only', replay: view };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    url = URL.createObjectURL(blob);
    anchor = node('a');
    anchor.href = url;
    anchor.download = `robosentinel-incident-${view.complete ? 'complete' : `partial-${view.stepIndex}`}.json`;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    text('replay-status', `${view.complete ? 'Complete' : 'Partial'} evidence JSON download requested for step ${view.stepIndex} of ${view.totalSteps}.`);
  } catch (error) {
    text('replay-status', `Evidence download unavailable: ${error instanceof Error ? error.message : String(error)}. The replay state has not changed.`);
  } finally {
    anchor?.remove();
    if (url) URL.revokeObjectURL(url);
  }
});

async function initialize() {
  try {
    const { createIncidentReplay } = await import('/src/incident.js');
    replay = createIncidentReplay();
    render(replay.snapshot());
    text('replay-status', 'Independent replay ready at step 0. Advance an evidence step when ready.');
  } catch (error) { fail(error, true); }
}

initialize();
