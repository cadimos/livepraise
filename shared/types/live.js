/** Protocolo WebSocket ao vivo — operador ↔ projetor (paridade v0.0.8). */
/** Paridade v0.0.8 monitor/projetor (Fase 3). */
export const BASELINE_LIVE_ACTIONS = [
    'background',
    'texto',
    'video',
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
export const LIVE_ACTIONS = [
    ...BASELINE_LIVE_ACTIONS,
    ...STAGE_RETURN_ACTIONS,
];
