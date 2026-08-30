/**
 * Cliente mínimo do Chrome DevTools Protocol para smokes de interface.
 *
 * Arrastos HTML5 não podem ser reproduzidos apenas com eventos de rato: o
 * Chrome só os materializa através de `Input.setInterceptDrags` +
 * `Input.dispatchDragEvent`, que é o que `nativeDrag` faz.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'google-chrome',
  'google-chrome-stable',
  'chromium',
  'chromium-browser',
];

/** Executável do Chrome, ou `null` quando nenhum está disponível. */
export function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (!candidate) continue;
    if (candidate.includes('/')) {
      if (fs.existsSync(candidate)) return candidate;
      continue;
    }
    for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
      if (dir && fs.existsSync(path.join(dir, candidate))) return path.join(dir, candidate);
    }
  }
  return null;
}

async function waitForDevtools(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      /* ainda a arrancar */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Chrome não expôs o DevTools na porta ${port}`);
}

export async function launchChrome({ port = 9333, timeoutMs = 30_000 } = {}) {
  const executable = findChrome();
  if (!executable) throw new Error('Chrome não encontrado');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cdp-'));
  const child = spawn(
    executable,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--window-size=1600,1000',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  try {
    await waitForDevtools(port, timeoutMs);
  } catch (error) {
    child.kill('SIGKILL');
    fs.rmSync(profile, { recursive: true, force: true });
    throw error;
  }
  return {
    port,
    close() {
      child.kill('SIGKILL');
      fs.rmSync(profile, { recursive: true, force: true });
    },
  };
}

export async function attachToPage(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find((t) => t.type === 'page');
  if (!target) throw new Error('Nenhum target de página no Chrome');

  const ws = new WebSocket(target.webSocketDebuggerUrl, { maxPayload: 64 * 1024 * 1024 });
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

  let nextId = 1;
  const pending = new Map();
  const listeners = [];

  ws.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.method ?? 'CDP'}: ${message.error.message}`));
      else resolve(message.result);
      return;
    }
    for (const entry of [...listeners]) {
      if (entry.method === message.method) entry.handler(message.params);
    }
  });

  function send(method, params = {}) {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  function on(method, handler) {
    listeners.push({ method, handler });
  }

  function once(method, timeoutMs = 15_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timeout à espera de ${method}`)),
        timeoutMs,
      );
      const entry = {
        method,
        handler: (params) => {
          clearTimeout(timer);
          listeners.splice(listeners.indexOf(entry), 1);
          resolve(params);
        },
      };
      listeners.push(entry);
    });
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`Erro na página: ${result.exceptionDetails.text}`);
    }
    return result.result.value;
  }

  async function navigate(url, settleMs = 1200) {
    const loaded = once('Page.loadEventFired');
    await send('Page.navigate', { url });
    await loaded;
    await new Promise((r) => setTimeout(r, settleMs));
  }

  /** Rectângulo do elemento devolvido por `selectorExpression`. */
  async function rectOf(selectorExpression) {
    return evaluate(`
      (() => {
        const el = ${selectorExpression};
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      })()
    `);
  }

  /**
   * Arrasto HTML5 real. Devolve os dados interceptados, incluindo os tipos MIME
   * que a origem colocou no DataTransfer.
   */
  async function nativeDrag(from, to, { steps = 6, onDragOver } = {}) {
    await send('Input.setInterceptDrags', { enabled: true });
    const intercepted = once('Input.dragIntercepted');

    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: from.x,
      y: from.y,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: from.x + 12,
      y: from.y,
      button: 'left',
      buttons: 1,
    });

    const { data } = await intercepted;

    for (let i = 1; i <= steps; i += 1) {
      const x = from.x + ((to.x - from.x) * i) / steps;
      const y = from.y + ((to.y - from.y) * i) / steps;
      await send('Input.dispatchDragEvent', {
        type: i === 1 ? 'dragEnter' : 'dragOver',
        x,
        y,
        data,
      });
      await new Promise((r) => setTimeout(r, 40));
    }
    if (onDragOver) await onDragOver();

    await send('Input.dispatchDragEvent', { type: 'drop', x: to.x, y: to.y, data });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: to.x,
      y: to.y,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    });
    await send('Input.setInterceptDrags', { enabled: false });
    await new Promise((r) => setTimeout(r, 400));
    return data;
  }

  /** Arrasto que para em `dragover` para inspecionar o estado intermédio. */
  async function dragOverAndInspect(from, to, inspect) {
    await send('Input.setInterceptDrags', { enabled: true });
    const intercepted = once('Input.dragIntercepted');
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: from.x,
      y: from.y,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: from.x + 12,
      y: from.y,
      button: 'left',
      buttons: 1,
    });
    const { data } = await intercepted;

    const observations = [];
    // `dragEnter` apenas anuncia a entrada no alvo; é o `dragover` seguinte que
    // os handlers da aplicação escutam.
    await send('Input.dispatchDragEvent', { type: 'dragEnter', ...to[0], data });
    for (const point of to) {
      await send('Input.dispatchDragEvent', { type: 'dragOver', ...point, data });
      await new Promise((r) => setTimeout(r, 200));
      observations.push(await inspect());
    }

    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: from.x,
      y: from.y,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    });
    await send('Input.setInterceptDrags', { enabled: false });
    return observations;
  }

  return {
    send,
    on,
    once,
    evaluate,
    navigate,
    rectOf,
    nativeDrag,
    dragOverAndInspect,
    close: () => ws.close(),
  };
}
