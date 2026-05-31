const BEARER_RE = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const PASSWORD_JSON_RE =
  /("(?:password|senha|secret|token|api[_-]?key|authorization)"\s*:\s*")([^"]*)(")/gi;
const QUERY_SECRET_RE =
  /((?:password|senha|token|api[_-]?key|secret)=)[^&\s"']+/gi;

/** Remove segredos comuns antes de persistir ou devolver entradas de log. */
export function sanitizeErrorLogText(text: string): string {
  return text
    .replace(BEARER_RE, 'Bearer [REDACTED]')
    .replace(PASSWORD_JSON_RE, '$1[REDACTED]$3')
    .replace(QUERY_SECRET_RE, '$1[REDACTED]');
}

export function sanitizeErrorLogEntry<T extends Record<string, unknown>>(entry: T): T {
  const next: Record<string, unknown> = { ...entry };
  for (const key of ['message', 'detail', 'source'] as const) {
    const value = next[key];
    if (typeof value === 'string') {
      next[key] = sanitizeErrorLogText(value);
    }
  }
  return next as T;
}
