/**
 * SM-011 — asserções auth/delivery/preview groups (ex cad221 + cad224).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';

const EXTERNAL_ORDER = ['live', 'vocal', 'stage', 'player'];

/** Espelha apps/operator/src/composables/usePreviewGroups.ts */
export function computeVisibleGroupIds(assignments, onlineProfiles) {
  const out = [];
  out.push('projection');

  const hasStageReturnMonitor = assignments.some((a) => a.role === 'stage-return');
  const projectionMonitors = assignments.filter((a) => a.role === 'projection');
  const hasSecondPhysical = hasStageReturnMonitor || projectionMonitors.length > 1;

  if (hasSecondPhysical) {
    out.push('stage-return');
  }

  const online = new Set(onlineProfiles);
  for (const profile of EXTERNAL_ORDER) {
    if (online.has(profile)) out.push(`external-${profile}`);
  }
  return out;
}

function uiShowsFooterAlert(kind) {
  return (
    kind === 'projection' ||
    kind === 'stage-return' ||
    kind === 'live' ||
    kind === 'vocal'
  );
}

function waitForMessage(socket, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('Timeout à espera de mensagem WS'));
    }, timeoutMs);

    function onMessage(data) {
      let message;
      try {
        message = JSON.parse(String(data));
      } catch {
        return;
      }
      if (!predicate(message)) return;
      clearTimeout(timer);
      socket.off('message', onMessage);
      resolve(message);
    }

    socket.on('message', onMessage);
  });
}

/**
 * CA-R21 + WS hub delivery (ex smoke-cad221).
 * @param {{ pass: Function; assert: Function; appRoot: string }} ctx
 */
export async function runAuthDeliverySmoke({ pass, assert, appRoot }) {
  const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-auth-delivery-'));
  process.env.LIVEPRAISE_HOME = testHome;
  process.env.LIVEPRAISE_APP_ROOT = appRoot;
  process.env.LIVEPRAISE_PORT = '0';

  const { startLivepraiseServer, stopLivepraiseServer } = await import(
    '../../dist/server/index.js'
  );
  const { effectiveDeliveryAction, shouldDeliver } = await import(
    '../../dist/shared/live-delivery.js'
  );
  const { applyLiveActionToPreviewFrame, EMPTY_OUTPUT_PREVIEW_FRAME } = await import(
    '../../dist/shared/output-preview.js'
  );

  try {
    assert(
      !shouldDeliver('external-display', { acao: 'background', valor: '/imagens/x.jpg' }, 'live'),
      'live skip background',
    );
    const cleared = effectiveDeliveryAction(
      'external-display',
      { acao: 'background', valor: '/imagens/x.jpg' },
      'live',
    );
    assert(cleared?.acao === 'limparFundo', 'live recebe limparFundo em vez de background');

    let liveFrame = { ...EMPTY_OUTPUT_PREVIEW_FRAME };
    liveFrame = applyLiveActionToPreviewFrame(liveFrame, {
      acao: 'viewMusica',
      valor: '<div class="content">A</div>',
    });
    assert(liveFrame.contentHtml.includes('A'), 'frame aplica viewMusica');

    const { port } = await startLivepraiseServer(0);
    const base = `ws://127.0.0.1:${port}/ws/live`;

  const operator = new WebSocket(base);
  await new Promise((resolve, reject) => {
    operator.once('open', resolve);
    operator.once('error', reject);
  });
  operator.send(JSON.stringify({ type: 'join', role: 'operator', name: 'smoke' }));
  await waitForMessage(operator, (m) => m.type === 'joined');

  const liveClient = new WebSocket(base);
  await new Promise((resolve, reject) => {
    liveClient.once('open', resolve);
    liveClient.once('error', reject);
  });
  liveClient.send(
    JSON.stringify({
      type: 'join',
      role: 'external-display',
      name: 'live1',
      deviceId: '11111111-1111-4111-8111-111111111111',
      profile: 'live',
    }),
  );
  await waitForMessage(liveClient, (m) => m.type === 'joined');

  operator.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'background', valor: encodeURIComponent('/imagens/test.jpg') },
    }),
  );

  const liveMsg = await waitForMessage(
    liveClient,
    (m) => m.type === 'live-action' && m.action?.acao === 'limparFundo',
  );
  assert(liveMsg.action.acao === 'limparFundo', 'hub envia limparFundo ao perfil live');

  const projector = new WebSocket(base);
  await new Promise((resolve, reject) => {
    projector.once('open', resolve);
    projector.once('error', reject);
  });
  projector.send(JSON.stringify({ type: 'join', role: 'projector', name: 'p1' }));
  await waitForMessage(projector, (m) => m.type === 'joined');

  operator.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'viewMusica', valor: '<div>smoke</div>' },
    }),
  );
  await waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'viewMusica',
  );

  operator.close();
  liveClient.close();
  projector.close();

    pass('auth-delivery', 'WS hub + live-delivery CA-R21');
  } finally {
    await stopLivepraiseServer().catch(() => {});
    fs.rmSync(testHome, { recursive: true, force: true });
  }
}

/**
 * Grupos de prévia CA-1–CA-7 (ex smoke-cad224).
 * @param {{ pass: Function; assert: Function }} ctx
 */
export async function runPreviewGroupsSmoke({ pass, assert }) {
  {
    const ids = computeVisibleGroupIds([{ role: 'operator', displayId: 0 }], []);
    assert(ids.length === 1 && ids[0] === 'projection', `CA-1: ${ids.join()}`);
    pass('auth-preview-CA-1', 'só operador → projection');
  }

  {
    const ids = computeVisibleGroupIds(
      [
        { role: 'operator', displayId: 0 },
        { role: 'operator', displayId: 1 },
      ],
      ['live', 'vocal'],
    );
    assert(!ids.includes('operator'), 'CA-7: sem tile operator');
    assert(ids[0] === 'projection', 'CA-7: projetor permanece');
    pass('auth-preview-CA-7', 'operator nunca gera tile');
  }

  {
    const ids = computeVisibleGroupIds(
      [
        { role: 'operator', displayId: 0 },
        { role: 'projection', displayId: 1 },
        { role: 'stage-return', displayId: 2 },
      ],
      [],
    );
    assert(
      ids.length === 2 && ids[0] === 'projection' && ids[1] === 'stage-return',
      `CA-2: ${ids.join()}`,
    );
    pass('auth-preview-CA-2', 'projetor + retorno');
  }

  {
    const ids = computeVisibleGroupIds([{ role: 'projection', displayId: 1 }], [
      'vocal',
      'vocal',
      'vocal',
    ]);
    assert(ids.filter((id) => id === 'external-vocal').length === 1, 'CA-3: um tile vocal');
    pass('auth-preview-CA-3', 'N vocais → 1 tile external-vocal');
  }

  {
    const ids = computeVisibleGroupIds(
      [
        { role: 'projection', displayId: 1 },
        { role: 'stage-return', displayId: 2 },
      ],
      ['player', 'stage', 'vocal', 'live'],
    );
    assert(
      ids.join() ===
        'projection,stage-return,external-live,external-vocal,external-stage,external-player',
      `CA-6: ${ids.join()}`,
    );
    pass('auth-preview-CA-6', 'ordem tiles prévia');
  }

  const { effectiveDeliveryAction, actionReceivableByRole } = await import(
    '../../dist/shared/live-delivery.js'
  );
  const { applyLiveActionToPreviewFrame, EMPTY_OUTPUT_PREVIEW_FRAME } = await import(
    '../../dist/shared/output-preview.js'
  );

  let projFrame = { ...EMPTY_OUTPUT_PREVIEW_FRAME };
  let retornoFrame = { ...EMPTY_OUTPUT_PREVIEW_FRAME };
  const musica = { acao: 'viewMusica', valor: '<div class="content">Público</div>' };
  const musicaRetorno = {
    acao: 'viewMusicaRetorno',
    valor: '<div class="content">Palco</div>',
  };
  const effProj = effectiveDeliveryAction('projector', musica);
  const effRet = effectiveDeliveryAction('stage-return', musicaRetorno);
  assert(effProj && effRet, 'CA-2: acções entregues');
  projFrame = applyLiveActionToPreviewFrame(projFrame, effProj);
  retornoFrame = applyLiveActionToPreviewFrame(retornoFrame, effRet);
  assert(
    projFrame.contentHtml.includes('Público') && retornoFrame.contentHtml.includes('Palco'),
    'CA-2: frames divergem',
  );
  assert(!retornoFrame.contentHtml.includes('Público'), 'CA-2: retorno isolado');
  pass('auth-preview-CA-2-frames', 'divergência projetor vs retorno');

  const footerAlert = { acao: 'footerAlert', valor: '{}' };
  for (const profile of EXTERNAL_ORDER) {
    const hubReceives = actionReceivableByRole(
      'external-display',
      footerAlert.acao,
      profile,
    );
    const uiShows = uiShowsFooterAlert(profile);
    if (hubReceives && !uiShows) {
      console.warn(
        `CA-5 (Should): perfil ${profile} recebe footerAlert no hub mas UI não mostra overlay`,
      );
    }
  }
  pass('auth-preview-CA-5', 'footerAlert hub vs UI verificado');
}
