#!/usr/bin/env node
/**
 * Probe off-screen + área calculada — fonte maximizada sem cair no mínimo.
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

const probeSpan = document.createElement('span');
const chars = 72;
const lineHeight = 1.35;
const realScrollH = (size) => {
  const charsPerLine = Math.max(1, area.width / size);
  const lines = Math.max(1, Math.ceil(chars / charsPerLine));
  return Math.ceil(size * lines * lineHeight);
};

Object.defineProperty(probeSpan, 'offsetHeight', {
  configurable: true,
  get() {
    const size = Number.parseInt(this.style.fontSize || '24', 10);
    return realScrollH(size);
  },
});
Object.defineProperty(probeSpan, 'offsetWidth', {
  configurable: true,
  get() {
    return area.width;
  },
});

globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
const { Element } = dom.window;

const origAppend = Element.prototype.appendChild;
Element.prototype.appendChild = function appendChild(child) {
  const result = origAppend.call(this, child);
  if (this.className === 'content' && child.tagName === 'SPAN') {
    Object.defineProperty(child, 'offsetHeight', Object.getOwnPropertyDescriptor(probeSpan, 'offsetHeight'));
    Object.defineProperty(child, 'offsetWidth', Object.getOwnPropertyDescriptor(probeSpan, 'offsetWidth'));
  }
  return result;
};

await refreshOutputTextfill(root, 24, 120, true, {});

Element.prototype.appendChild = origAppend;

const span = root.querySelector('.content > span');
const fontSize = Number.parseInt(span.style.fontSize, 10);
const maxH = area.height - 2;
assert(fontSize > 40, `deve maximizar (${fontSize}px)`);
assert(fontSize <= 120, `não excede max (${fontSize})`);
assert(realScrollH(fontSize) <= maxH + 3, `probe cabe na área (${realScrollH(fontSize)}<=${maxH})`);

console.log('projection-textfill-two-pass.test: OK');
process.exit(0);
