#!/usr/bin/env node
/**
 * Medição in-place + área calculada — fonte maximizada sem cair no mínimo.
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

const {
  computeProjectionContentArea,
  refreshOutputTextfill,
} = await import('../shared/projection-textfill.js');

const root = document.createElement('div');
root.id = 'conteudo';
root.style.width = '800px';
root.style.height = '600px';
root.style.padding = '24px';
root.style.boxSizing = 'border-box';
root.innerHTML = `
  <div class="titulo"></div>
  <div class="content"><span>Um plano pra salvar<br>Um pacto pra selar<br>Silêncio no céu</span></div>
  <div class="rodape">Jesus, o Plano Perfeito</div>
`;
document.body.appendChild(root);

const box = root.querySelector('.content');
const rodape = root.querySelector('.rodape');
Object.defineProperty(rodape, 'offsetHeight', { configurable: true, get: () => 18 });
Object.defineProperty(box, 'clientWidth', { configurable: true, get: () => 752 });
Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => 525 });

const area = computeProjectionContentArea(root, box);
assert(area.width === 752, `largura calculada (${area.width})`);
assert(area.height === 525, `altura calculada (${area.height})`);

const span = root.querySelector('.content > span');
const chars = 72;
const lineHeight = 1.35;
const realScrollH = (size) => {
  const charsPerLine = Math.max(1, area.width / size);
  const lines = Math.max(1, Math.ceil(chars / charsPerLine));
  return Math.ceil(size * lines * lineHeight);
};

Object.defineProperty(span, 'scrollHeight', {
  configurable: true,
  get() {
    const size = Number.parseInt(this.style.fontSize || '24', 10);
    return realScrollH(size);
  },
});
Object.defineProperty(span, 'scrollWidth', {
  configurable: true,
  get() {
    return area.width;
  },
});
Object.defineProperty(span, 'offsetHeight', {
  configurable: true,
  get() {
    return this.scrollHeight;
  },
});

globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);

await refreshOutputTextfill(root, 24, 120, true, {});

const fontSize = Number.parseInt(span.style.fontSize, 10);
const maxH = area.height - 2;
assert(fontSize > 40, `deve maximizar (${fontSize}px)`);
assert(fontSize <= 120, `não excede max (${fontSize})`);
assert(realScrollH(fontSize) <= maxH + 3, `cabe na área (${realScrollH(fontSize)}<=${maxH})`);

console.log('projection-textfill-two-pass.test: OK');
process.exit(0);
