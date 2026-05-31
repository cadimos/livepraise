#!/usr/bin/env node
/**
 * Smoke CAD-224: critérios CA-1–CA-7 (grupos de prévia CAD-221).
 * CA-4 / entrega WS hub: scripts/smoke-cad221.mjs
 */
const EXTERNAL_ORDER = ['live', 'vocal', 'stage', 'player'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Espelha apps/operator/src/composables/usePreviewGroups.ts */
function computeVisibleGroupIds(assignments, onlineProfiles) {
  const out = [];
  out.push('projection');

  const hasStageReturnMonitor = assignments.some((a) => a.role === 'stage-return');
  const projectionMonitors = assignments.filter((a) => a.role === 'projection');
  const hasSecondPhysical =
    hasStageReturnMonitor || projectionMonitors.length > 1;

  if (hasSecondPhysical) {
    out.push('stage-return');
  }

  const online = new Set(onlineProfiles);
  for (const profile of EXTERNAL_ORDER) {
    if (online.has(profile)) out.push(`external-${profile}`);
  }
  return out;
}

/** Espelha MultiOutputPreviewColumn.groupShowsFooterAlert */
function uiShowsFooterAlert(kind) {
  return (
    kind === 'projection' ||
    kind === 'stage-return' ||
    kind === 'live' ||
    kind === 'vocal'
  );
}

// —— CA-1: só operador → 1 tile projetor
{
  const ids = computeVisibleGroupIds(
    [{ role: 'operator', displayId: 0 }],
    [],
  );
  assert(ids.length === 1 && ids[0] === 'projection', `CA-1: esperado [projection], obteve ${ids.join()}`);
}

// —— CA-7: papel operator nunca gera tile
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
}

// —— CA-2: projetor + retorno → 2 físicas
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
    ids.length === 2 &&
      ids[0] === 'projection' &&
      ids[1] === 'stage-return',
    `CA-2: esperado 2 físicas, obteve ${ids.join()}`,
  );
}

// —— CA-3: N vocais online → 1 tile external-vocal
{
  const ids = computeVisibleGroupIds(
    [{ role: 'projection', displayId: 1 }],
    ['vocal', 'vocal', 'vocal', 'vocal', 'vocal'],
  );
  const vocalTiles = ids.filter((id) => id === 'external-vocal');
  assert(vocalTiles.length === 1, `CA-3: um tile vocal, obteve ${vocalTiles.length}`);
}

// —— CA-6: ordem projetor → 2.ª física → live → vocal → stage → player
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
    `CA-6 ordem: ${ids.join()}`,
  );
}

// —— CA-2 divergência de conteúdo (filtragem partilhada)
const {
  effectiveDeliveryAction,
  actionReceivableByRole,
} = await import('../dist/shared/live-delivery.js');
const {
  applyLiveActionToPreviewFrame,
  EMPTY_OUTPUT_PREVIEW_FRAME,
} = await import('../dist/shared/output-preview.js');

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
assert(
  !retornoFrame.contentHtml.includes('Público'),
  'CA-2: retorno não herda viewMusica do projetor',
);

// —— CA-5: overlay footerAlert — hub vs UI (Should)
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
      `CA-5 (Should): perfil ${profile} recebe footerAlert no hub mas UI não mostra overlay na prévia`,
    );
  }
}

console.log('smoke-cad224: OK');
