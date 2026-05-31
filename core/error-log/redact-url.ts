const SENSITIVE_QUERY_KEYS = [
  'password',
  'senha',
  'token',
  'access_token',
  'api_key',
  'apikey',
  'secret',
  'signature',
  'sig',
  'auth',
  'authorization',
  'jwt',
  'session',
  'credential',
  'key',
] as const;

function isSensitiveQueryKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.startsWith('x-amz-')) return true;
  return SENSITIVE_QUERY_KEYS.some((k) => lower === k);
}

/** Redige parâmetros sensíveis de query em URLs de importação de mídia. */
export function redactMediaImportUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.search) return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    const params = new URLSearchParams(parsed.search);
    for (const key of [...params.keys()]) {
      if (isSensitiveQueryKey(key)) {
        params.set(key, '[REDACTED]');
      }
    }
    parsed.search = params.toString() ? `?${params.toString()}` : '';
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return '[invalid-url]';
  }
}
