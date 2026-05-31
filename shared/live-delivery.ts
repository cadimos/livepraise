import {
  OVERLAY_ACTIONS,
  STAGE_RETURN_ACTIONS,
  type ClientRole,
  type ExternalDisplayProfile,
  type LiveAction,
  type LiveActionName,
} from './types/live.js';

const STAGE_ONLY = new Set<string>(STAGE_RETURN_ACTIONS);
const PROJECTOR_ONLY = new Set<string>(['viewMusica', 'viewBiblia']);
const OVERLAY_ONLY = new Set<string>(OVERLAY_ACTIONS);

const SHARED_ACTIONS = new Set<string>([
  'background',
  'limparFundo',
  'texto',
  'video',
  'removeConteudo',
  'atualizar',
  'ajustarTela',
]);

/** CA-R21: /live omite fundos (imagens/vídeos de background). */
const LIVE_VIEWER_SKIP = new Set<string>(['background']);

export function receivesLiveBackgroundClear(
  role: ClientRole,
  profile?: ExternalDisplayProfile,
): boolean {
  if (role === 'live-viewer') return true;
  return role === 'external-display' && profile === 'live';
}

function externalDisplayReceives(
  profile: ExternalDisplayProfile,
  acao: LiveActionName,
): boolean {
  if (profile === 'live') {
    if (STAGE_ONLY.has(acao) || acao === 'background') return false;
    return (
      PROJECTOR_ONLY.has(acao) ||
      SHARED_ACTIONS.has(acao) ||
      acao === 'removeConteudo' ||
      acao === 'atualizar'
    );
  }
  if (profile === 'vocal') {
    if (acao === 'background' || acao === 'video') return false;
    return (
      STAGE_ONLY.has(acao) ||
      acao === 'removeConteudo' ||
      acao === 'atualizar'
    );
  }
  if (profile === 'stage') {
    return (
      STAGE_ONLY.has(acao) ||
      acao === 'removeConteudo' ||
      acao === 'atualizar'
    );
  }
  if (profile === 'player') {
    if (STAGE_ONLY.has(acao)) return false;
    return PROJECTOR_ONLY.has(acao) || SHARED_ACTIONS.has(acao);
  }
  if (profile === 'projection') {
    if (STAGE_ONLY.has(acao)) return false;
    return true;
  }
  return false;
}

export function actionReceivableByRole(
  role: ClientRole,
  acao: LiveActionName,
  profile?: ExternalDisplayProfile,
): boolean {
  if (OVERLAY_ONLY.has(acao)) {
    return (
      role === 'projector' ||
      role === 'stage-return' ||
      role === 'external-display'
    );
  }
  if (role === 'external-display' && profile) {
    return externalDisplayReceives(profile, acao);
  }
  if (STAGE_ONLY.has(acao)) return role === 'stage-return';
  if (PROJECTOR_ONLY.has(acao)) {
    return role === 'projector' || role === 'live-viewer';
  }
  if (SHARED_ACTIONS.has(acao)) {
    return (
      role === 'projector' ||
      role === 'stage-return' ||
      role === 'live-viewer'
    );
  }
  return true;
}

export function shouldDeliver(
  role: ClientRole,
  action: LiveAction,
  profile?: ExternalDisplayProfile,
): boolean {
  if (role === 'operator' || role === 'remote-operator') return false;
  if (role === 'live-viewer' && LIVE_VIEWER_SKIP.has(action.acao)) return false;
  if (
    role === 'external-display' &&
    (profile === 'live' || profile === 'vocal') &&
    LIVE_VIEWER_SKIP.has(action.acao)
  ) {
    return false;
  }
  return actionReceivableByRole(role, action.acao, profile);
}

/** Acção efectiva quando o hub substitui `background` por `limparFundo` (CA-R21). */
export function effectiveDeliveryAction(
  role: ClientRole,
  action: LiveAction,
  profile?: ExternalDisplayProfile,
): LiveAction | null {
  if (shouldDeliver(role, action, profile)) return action;
  if (
    action.acao === 'background' &&
    receivesLiveBackgroundClear(role, profile)
  ) {
    return { acao: 'limparFundo', valor: '' };
  }
  return null;
}
