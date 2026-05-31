const ERROR_LOG_PATH = '/api/system/error-log';

let nativeFetch: typeof fetch | null = null;
let fetchInstalled = false;
let uiInstalled = false;

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function isRelevantApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url, location.origin);
    if (parsed.origin !== location.origin) return false;
    if (!parsed.pathname.startsWith('/api/')) return false;
    if (parsed.pathname.startsWith(ERROR_LOG_PATH)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function reportClientError(opts: {
  message: string;
  detail?: string;
  level?: 'error' | 'warn';
  source?: string;
}): Promise<void> {
  const message = opts.message.trim();
  if (!message) return;

  const fetchFn = nativeFetch ?? fetch;
  try {
    await fetchFn(`${location.origin}${ERROR_LOG_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: opts.level ?? 'error',
        source: opts.source ?? 'client',
        message,
        ...(opts.detail ? { detail: opts.detail } : {}),
      }),
    });
  } catch {
    // Não propagar falha de telemetria.
  }
}

export function installUiErrorReporter(): void {
  if (typeof window === 'undefined' || uiInstalled) return;
  uiInstalled = true;

  window.addEventListener('error', (event) => {
    const detail =
      event.error instanceof Error
        ? event.error.stack
        : [event.filename, event.lineno, event.colno].filter(Boolean).join(':') || undefined;
    void reportClientError({
      source: 'ui',
      message: event.message || 'Erro JavaScript',
      detail,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'Promise rejeitada';
    void reportClientError({
      source: 'ui',
      message: `Promise rejeitada: ${message}`,
      detail: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

export function createVueErrorHandler(): (
  err: unknown,
  instance: unknown,
  info: string,
) => void {
  return (err, _instance, info) => {
    const message = err instanceof Error ? err.message : String(err);
    void reportClientError({
      source: 'vue',
      message,
      detail: err instanceof Error ? err.stack : info,
    });
  };
}

export function installErrorReporters(): void {
  installFetchErrorReporter();
  installUiErrorReporter();
}

export function installFetchErrorReporter(): void {
  if (fetchInstalled || typeof window === 'undefined') return;
  fetchInstalled = true;
  nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = resolveUrl(input);
    try {
      const res = await nativeFetch!(input, init);
      if (isRelevantApiUrl(url) && !res.ok) {
        void reportClientError({
          source: 'fetch',
          message: `${init?.method ?? 'GET'} ${new URL(url, location.origin).pathname} → HTTP ${res.status}`,
        });
      }
      return res;
    } catch (err) {
      if (isRelevantApiUrl(url)) {
        const detail = err instanceof Error ? err.message : String(err);
        void reportClientError({
          source: 'fetch',
          message: `Falha de rede: ${new URL(url, location.origin).pathname}`,
          detail,
        });
      }
      throw err;
    }
  };
}
