#!/usr/bin/env node
/**
 * textFitsBox maximiza fonte até maxFontPx; scrollWidth ≈ clientWidth não bloqueia o tamanho.
 */
import { JSDOM } from 'jsdom';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.requestAnimationFrame = (cb) => {
  cb(0);
  return 0;
};

const { applyPreviewTextfill } = await import('../shared/projection-textfill.js');

function mockBox(span, box, { width, height, lines = 3 }) {
  Object.defineProperty(box, 'clientWidth', { configurable: true, get: () => width });
  Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => height });
  Object.defineProperty(box, 'scrollWidth', { configurable: true, get: () => width });
  Object.defineProperty(span, 'scrollWidth', {
    configurable: true,
    get: () => width,
  });
  Object.defineProperty(span, 'scrollHeight', {
    configurable: true,
    get() {
      const size = Number.parseInt(span.style.fontSize || '8', 10);
      return Math.ceil(size * lines * 1.35);
    },
  });
  Object.defineProperty(span, 'offsetHeight', {
    configurable: true,
    get() {
      return this.scrollHeight;
    },
  });
}

const root = document.createElement('div');
root.innerHTML = `
  <div class="titulo"></div>
  <div class="content"><span>Um plano pra salvar<br>Um pacto pra selar<br>Silêncio no céu</span></div>
  <div class="rodape">Jesus, o Plano Perfeito</div>
`;
document.body.appendChild(root);

const span = root.querySelector('.content > span');
const box = root.querySelector('.content');
mockBox(span, box, { width: 280, height: 200, lines: 3 });

applyPreviewTextfill(root, 8, 120, true, {});

const fontSize = Number.parseInt(span.style.fontSize, 10);
assert(Number.isFinite(fontSize) && fontSize > 0, `fontSize aplicado (${fontSize})`);
assert(fontSize > 40, `fontSize deve maximizar área útil (${fontSize})`);
assert(fontSize <= 120, `fontSize não deve exceder max (${fontSize})`);
assert(span.scrollHeight <= box.clientHeight + 2, 'altura deve caber na caixa');

const nowrapRoot = document.createElement('div');
nowrapRoot.innerHTML = `
  <div class="content"><span>TextoLongoSemEspacos</span></div>
`;
document.body.appendChild(nowrapRoot);
const nowrapSpan = nowrapRoot.querySelector('.content > span');
const nowrapBox = nowrapRoot.querySelector('.content');
Object.defineProperty(nowrapBox, 'clientWidth', { configurable: true, get: () => 120 });
Object.defineProperty(nowrapBox, 'clientHeight', { configurable: true, get: () => 80 });
Object.defineProperty(nowrapBox, 'scrollWidth', { configurable: true, get: () => 120 });
Object.defineProperty(nowrapSpan, 'scrollWidth', {
  configurable: true,
  get() {
    const size = Number.parseInt(this.style.fontSize || '8', 10);
    return size * 12;
  },
});
Object.defineProperty(nowrapSpan, 'scrollHeight', {
  configurable: true,
  get() {
    const size = Number.parseInt(this.style.fontSize || '8', 10);
    return Math.ceil(size * 1.35);
  },
});
Object.defineProperty(nowrapSpan, 'offsetHeight', {
  configurable: true,
  get() {
    return this.scrollHeight;
  },
});

applyPreviewTextfill(nowrapRoot, 8, 120, true, {});
const nowrapPx = Number.parseInt(nowrapSpan.style.fontSize, 10);
assert(nowrapPx < 40, `overflow horizontal deve reduzir fonte (${nowrapPx})`);

console.log('projection-textfill-fit.test: OK');
