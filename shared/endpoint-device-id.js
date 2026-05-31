/** UUID estável por endpoint (/projector, /stage, …) — evita colisão entre rotas no mesmo browser. */

const LEGACY_KEY = 'livepraise.externalDeviceId';

export function endpointDeviceStorageKey(profile) {
  return `${LEGACY_KEY}.${profile}`;
}

function createRandomUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function ensureEndpointDeviceId(profile) {
  const key = endpointDeviceStorageKey(profile);
  let id = localStorage.getItem(key);
  if (id) return id;

  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    localStorage.setItem(key, legacy);
    localStorage.removeItem(LEGACY_KEY);
    return legacy;
  }

  id = createRandomUuid();
  localStorage.setItem(key, id);
  return id;
}
