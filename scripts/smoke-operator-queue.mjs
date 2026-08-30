#!/usr/bin/env node
import WebSocket from 'ws';
import {
  assert,
  cleanupSmokeHome,
  configureSmokeEnv,
  createSmokeHome,
  loadLivepraiseServer,
  resolveAppRoot,
} from './lib/smoke-helpers.mjs';

const appRoot = resolveAppRoot(import.meta.url);
const testHome = createSmokeHome('livepraise-smoke-queue-sync-');
configureSmokeEnv({ home: testHome, appRoot, port: '0' });
const { startLivepraiseServer, stopLivepraiseServer } = await loadLivepraiseServer(appRoot);

function waitForMessage(ws, predicate, timeoutMs = 5_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error('Timeout aguardando operator-queue-sync'));
    }, timeoutMs);
    function onMessage(data) {
      const message = JSON.parse(data.toString());
      if (!predicate(message)) return;
      clearTimeout(timer);
      ws.off('message', onMessage);
      resolve(message);
    }
    ws.on('message', onMessage);
  });
}

async function connectOperator(port, name) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await new Promise((resolve, reject) => {
    ws.once('error', reject);
    ws.once('open', resolve);
  });
  const joined = waitForMessage(ws, (message) => message.type === 'joined');
  ws.send(JSON.stringify({ type: 'join', role: 'operator', name }));
  await joined;
  return ws;
}

async function putState(base, body) {
  const response = await fetch(`${base}/api/operator-queue`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

let operatorA;
let operatorB;
try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;
  operatorA = await connectOperator(port, 'Operador A');
  operatorB = await connectOperator(port, 'Operador B');

  const initial = await fetch(`${base}/api/operator-queue`).then((res) => res.json());
  assert(initial.state.enabled === false, 'sync começa desabilitado');
  assert(initial.state.revision === 0, 'revisão inicial zero');

  const tabs = [{
    id: 'tab-smoke',
    label: 'Culto',
    items: [{ id: 'item-1', kind: 'blank', label: 'Avisos' }],
  }];
  const enabledBroadcast = waitForMessage(
    operatorB,
    (message) => message.type === 'operator-queue-sync' && message.state.revision === 1,
  );
  const enabled = await putState(base, {
    expectedRevision: 0,
    enabled: true,
    tabs,
  });
  assert(enabled.response.status === 200, 'habilita sync via REST');
  const enabledMessage = await enabledBroadcast;
  assert(enabledMessage.state.tabs[0].items.length === 1, 'operador B recebe fila');

  const stale = await putState(base, {
    expectedRevision: 0,
    enabled: true,
    tabs: [],
  });
  assert(stale.response.status === 409, 'revisão antiga retorna conflito');
  assert(stale.body.state.tabs.length === 1, 'conflito devolve fila autoritativa');

  const nextTabs = [{
    ...tabs[0],
    items: [...tabs[0].items, { id: 'item-2', kind: 'blank', label: 'Encerramento' }],
  }];
  const updateBroadcast = waitForMessage(
    operatorA,
    (message) => message.type === 'operator-queue-sync' && message.state.revision === 2,
  );
  const updated = await putState(base, {
    expectedRevision: 1,
    enabled: true,
    tabs: nextTabs,
  });
  assert(updated.response.status === 200, 'atualiza fila compartilhada');
  const updateMessage = await updateBroadcast;
  assert(updateMessage.state.tabs[0].items.length === 2, 'alteração chega ao operador A');

  const disabledBroadcast = waitForMessage(
    operatorB,
    (message) => message.type === 'operator-queue-sync' && message.state.revision === 3,
  );
  const disabled = await putState(base, {
    expectedRevision: 2,
    enabled: false,
  });
  assert(disabled.response.status === 200, 'desabilita sync');
  const disabledMessage = await disabledBroadcast;
  assert(!disabledMessage.state.enabled, 'operador B recebe desativação');
  assert(disabledMessage.state.tabs[0].items.length === 2, 'última fila fica preservada');

  console.log('Smoke fila compartilhada OK (2 operadores, conflito e desativação)');
} finally {
  operatorA?.close();
  operatorB?.close();
  await stopLivepraiseServer().catch(() => {});
  cleanupSmokeHome(testHome);
}
