export const EMPTY_OUTPUT_PREVIEW_FRAME = {
    contentHtml: '',
    backgroundMedia: '',
    backgroundKind: null,
};
export function decodePreviewMediaValor(valor) {
    try {
        return decodeURIComponent(String(valor ?? ''));
    }
    catch {
        return String(valor ?? '').trim();
    }
}
/** Reduz live-action ao frame de prévia (ignora overlays e ajustarTela). */
export function applyLiveActionToPreviewFrame(frame, action) {
    switch (action.acao) {
        case 'viewMusica':
        case 'viewBiblia':
        case 'viewMusicaRetorno':
        case 'viewBibliaRetorno':
            return {
                ...frame,
                contentHtml: action.valor,
            };
        case 'texto': {
            let text = action.valor;
            try {
                text = decodeURIComponent(action.valor);
            }
            catch {
                text = action.valor;
            }
            return {
                ...frame,
                contentHtml: `<div class="content"><span>${text}</span></div>`,
            };
        }
        case 'removeConteudo':
            return { ...frame, contentHtml: '' };
        case 'background':
            return {
                ...frame,
                backgroundMedia: decodePreviewMediaValor(action.valor),
                backgroundKind: 'image',
            };
        case 'video':
            return {
                ...frame,
                backgroundMedia: decodePreviewMediaValor(action.valor),
                backgroundKind: 'video',
            };
        case 'youtube':
            return {
                ...frame,
                backgroundMedia: action.valor.trim(),
                backgroundKind: 'youtube',
            };
        case 'limparFundo':
            return {
                ...frame,
                backgroundMedia: '',
                backgroundKind: null,
            };
        case 'serviceTimer':
        case 'footerAlert':
        case 'ajustarTela':
        case 'atualizar':
            return frame;
        default:
            return frame;
    }
}
export function previewFrameIsEmpty(frame) {
    return (!frame.contentHtml.trim() &&
        !frame.backgroundMedia.trim());
}
