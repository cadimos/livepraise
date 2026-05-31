/** Tamanho e posição da área de projeção (paridade v0.0.8 `conf_tela`). */

export const SCREEN_POSITIONS = ['centro', 'topo', 'personalizado'];

export const SCREEN_CONTENT_FITS = ['estender', 'centralizar', 'proporcional'];

export function isRatioPreset(tipo) {
  return ['16:9', '4:3', '7:3', '5:3', '13:7'].includes(tipo);
}

export function normalizeContentFit(value) {
  return SCREEN_CONTENT_FITS.includes(value) ? value : 'estender';
}

export function defaultScreenLayoutFields() {
  return {
    livePreview: false,
    position: 'centro',
    offsetX: '',
    offsetY: '',
    contentFit: 'estender',
  };
}

export function buildAjustarTelaValor(preset, largura, altura) {
  if (preset === 'personalizado') {
    const w = String(largura ?? '').trim() || '0';
    const h = String(altura ?? '').trim() || '0';
    return `${w}x${h}`;
  }
  return preset;
}

const DEVICE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Payload live-action `ajustarTela`:
 * `displayId|tamanho`, `deviceId|tamanho` ou `…|tamanho~posição~offsetX~offsetY[~contentFit]`
 */
export function parseAjustarTelaPayload(valor) {
  const raw = String(valor ?? '');
  const pipe = raw.indexOf('|');
  let displayId = null;
  let deviceId = null;
  let rest = raw;
  if (pipe >= 0) {
    const idPart = raw.slice(0, pipe);
    if (DEVICE_ID_RE.test(idPart)) {
      deviceId = idPart;
    } else {
      const parsedId = Number.parseInt(idPart, 10);
      displayId = Number.isFinite(parsedId) ? parsedId : null;
    }
    rest = raw.slice(pipe + 1);
  }
  const parts = rest.split('~');
  const size = parts[0] ?? 'padrao';
  const position = parts[1] || 'centro';
  const offsetX = Number.parseInt(parts[2] ?? '0', 10) || 0;
  const offsetY = Number.parseInt(parts[3] ?? '0', 10) || 0;
  const contentFit = normalizeContentFit(parts[4] || 'estender');
  return { displayId, deviceId, size, position, offsetX, offsetY, contentFit };
}

function buildAjustarTelaPayloadForTarget(targetId, screen) {
  const size = buildAjustarTelaValor(screen.preset, screen.largura, screen.altura);
  const position = screen.position || 'centro';
  const ox = String(screen.offsetX ?? '').trim();
  const oy = String(screen.offsetY ?? '').trim();
  const contentFit = normalizeContentFit(screen.contentFit ?? 'estender');
  const isDefaultPosition = position === 'centro' && !ox && !oy;
  const isDefaultFit = contentFit === 'estender';

  if (isDefaultPosition && isDefaultFit) {
    return `${targetId}|${size}`;
  }

  let payload = `${targetId}|${size}~${position}~${ox || '0'}~${oy || '0'}`;
  if (!isDefaultFit) {
    payload += `~${contentFit}`;
  }
  return payload;
}

export function buildAjustarTelaPayload(displayId, screen) {
  return buildAjustarTelaPayloadForTarget(displayId, screen);
}

export function buildAjustarTelaPayloadForDevice(deviceId, screen) {
  return buildAjustarTelaPayloadForTarget(deviceId, screen);
}
