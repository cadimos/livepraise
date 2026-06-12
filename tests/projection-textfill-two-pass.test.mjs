#!/usr/bin/env node
/**
 * Pass 2 com scrollHeight inflado não deve sobrescrever pass 1 válida (regressão alpha.3).
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

const { applyOutputTextfill } = await import('../shared/projection-textfill.js');

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

Object.defineProperty(box, 'clientWidth', { configurable: true, get: () => 752 });
Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => 525 });
Object.defineProperty(box, 'scrollWidth', { configurable: true, get: () => 752 });
Object.defineProperty(span, 'scrollWidth', { configurable: true, get: () => 752 });
Object.defineProperty(span, 'scrollHeight', {
  configurable: true,
  get() {
    const size = Number.parseInt(span.style.fontSize || '24', 10);
    if (root.dataset.textfillPass === '2') return 972;
    return Math.ceil(size * 3 * 1.35);
  },
});
Object.defineProperty(span, 'offsetHeight', {
  configurable: true,
  get() {
    return this.scrollHeight;
  },
});

const slackPx = 2;
const maxH = () => box.clientHeight - slackPx;
const fits = () => Math.ceil(span.scrollHeight) <= maxH() + 3;

root.dataset.textfillPass = '1';
applyOutputTextfill(root, 24, 120, true, {
  diagnosticPass: 1,
  suppressVisibilityToggle: true,
});
const pass1Px = Number.parseInt(span.style.fontSize, 10);
const pass1Fits = fits();

span.style.fontSize = '';
void span.offsetHeight;

root.dataset.textfillPass = '2';
applyOutputTextfill(root, 24, 120, true, {
  diagnosticPass: 2,
  suppressVisibilityToggle: true,
});
const pass2Fits = fits();

if (pass1Fits && !pass2Fits && pass1Px > 0) {
  span.style.fontSize = `${pass1Px}px`;
}

const fontSize = Number.parseInt(span.style.fontSize, 10);
assert(pass1Fits, 'pass 1 deve caber');
assert(!pass2Fits, 'pass 2 simulada deve falhar');
assert(fontSize === pass1Px, `deve manter pass 1 (${fontSize}px === ${pass1Px}px)`);
assert(fontSize > 24, `não deve cair para o mínimo (${fontSize})`);

console.log('projection-textfill-two-pass.test: OK');
