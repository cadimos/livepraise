#!/usr/bin/env node
/**
 * Reconcile visível reinicia em loBound — não deve cair para o mínimo com scrollHeight inflado.
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

document.fonts = {
  load: async () => {},
  ready: Promise.resolve(),
};

const { refreshOutputTextfill } = await import('../shared/projection-textfill.js');

const root = document.createElement('div');
root.innerHTML = `
  <div class="titulo"></div>
  <div class="content"><span>Um plano pra salvar<br>Um pacto pra selar<br>Silêncio no céu</span></div>
  <div class="rodape">Jesus, o Plano Perfeito</div>
`;
document.body.appendChild(root);

const span = root.querySelector('.content > span');
const box = root.querySelector('.content');
const rodape = root.querySelector('.rodape');
Object.defineProperty(rodape, 'offsetHeight', { configurable: true, get: () => 18 });

const slackPx = 2;
const maxH = () => box.clientHeight - slackPx;
const realScrollH = (size) => {
  const chars = 72;
  const lineHeight = 1.35;
  const charsPerLine = Math.max(1, 752 / size);
  const lines = Math.max(1, Math.ceil(chars / charsPerLine));
  return Math.ceil(size * lines * lineHeight);
};

let reconcilePass = false;

Object.defineProperty(box, 'clientWidth', { configurable: true, get: () => 752 });
Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => 525 });
Object.defineProperty(box, 'scrollWidth', { configurable: true, get: () => 752 });
Object.defineProperty(span, 'scrollWidth', { configurable: true, get: () => 752 });
Object.defineProperty(span, 'scrollHeight', {
  configurable: true,
  get() {
    const size = Number.parseInt(span.style.fontSize || '24', 10);
    if (!reconcilePass && span.style.visibility === 'hidden') return 130;
    return realScrollH(size);
  },
});
Object.defineProperty(span, 'offsetHeight', {
  configurable: true,
  get() {
    return this.scrollHeight;
  },
});

const originalDescriptor = Object.getOwnPropertyDescriptor(span.style, 'visibility');
let visibilityValue = '';
Object.defineProperty(span.style, 'visibility', {
  configurable: true,
  enumerable: true,
  get() {
    return visibilityValue;
  },
  set(value) {
    visibilityValue = value;
    if (value === '' && !reconcilePass) {
      reconcilePass = true;
    }
  },
});

await refreshOutputTextfill(root, 24, 120, true, {});

const fontSize = Number.parseInt(span.style.fontSize, 10);
assert(visibilityValue === '', 'span visível no final');
assert(
  Math.ceil(span.scrollHeight) <= maxH() + 3,
  `fonte deve caber visível (${fontSize}px, scrollH=${span.scrollHeight})`,
);
assert(fontSize > 40, `deve maximizar área útil (${fontSize}px)`);
assert(fontSize <= 120, `não deve exceder max (${fontSize})`);

console.log('projection-textfill-two-pass.test: OK');
process.exit(0);
