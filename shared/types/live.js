/** Protocolo WebSocket ao vivo — operador ↔ projetor (paridade v0.0.8). */
/** Paridade v0.0.8 monitor/projetor (Fase 3). */
export const BASELINE_LIVE_ACTIONS = [
    'background',
    'limparFundo',
    'texto',
    'video',
    'youtube',
    'viewMusica',
    'viewBiblia',
    'removeConteudo',
    'atualizar',
    'ajustarTela',
];
/** Retorno de palco — visão distinta da projeção pública (Fase 5, CA-R20). */
export const STAGE_RETURN_ACTIONS = [
    'viewMusicaRetorno',
    'viewBibliaRetorno',
];
/** Overlay contador/timer de culto — sync multi-monitor (CAD-187). */
export const SERVICE_TIMER_ACTIONS = ['serviceTimer'];
/** Texto rolante de alerta no rodapé — sync multi-monitor (CAD-188). */
export const FOOTER_ALERT_ACTIONS = ['footerAlert'];
export const OVERLAY_ACTIONS = [
    ...SERVICE_TIMER_ACTIONS,
    ...FOOTER_ALERT_ACTIONS,
];
export const LIVE_ACTIONS = [
    ...BASELINE_LIVE_ACTIONS,
    ...STAGE_RETURN_ACTIONS,
    ...OVERLAY_ACTIONS,
];
