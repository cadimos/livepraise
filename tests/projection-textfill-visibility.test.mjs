#!/usr/bin/env node
/**
 * Medição in-place no span real — não fica hidden durante textfill.
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
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);

document.fonts = {
  load: async () => {},
  ready: Promise.resolve(),
};

const { refreshOutputTextfill } = await import('../dist/shared/projection-textfill.js');

const root = document.createElement('div');
root.className = 'conteudo';
root.style.width = '400px';
root.style.height = '300px';
root.style.padding = '20px';
root.style.boxSizing = 'border-box';
root.innerHTML = `
  <div class="titulo"></div>
  <div class="content" style="overflow:hidden"><span>Linha um<br>Linha dois<br>Linha três</span></div>
  <div class="rodape">Rodapé</div>
`;
document.body.appendChild(root);

const rodape = root.querySelector('.rodape');
Object.defineProperty(rodape, 'offsetHeight', { configurable: true, get: () => 18 });

const span = root.querySelector('.content > span');
const visibilityLog = [];
let visibilityValue = '';
Object.defineProperty(span.style, 'visibility', {
  configurable: true,
  enumerable: true,
  get() {
    return visibilityValue;
  },
  set(value) {
    visibilityLog.push(value);
    visibilityValue = value;
  },
});

await refreshOutputTextfill(root, 24, 120, true, {});

assert(!visibilityLog.includes('hidden'), 'span não deve ficar hidden durante textfill');
assert(visibilityValue === '', 'span visível após textfill');

const fontSize = Number.parseInt(span.style.fontSize, 10);
assert(Number.isFinite(fontSize) && fontSize >= 24, `fontSize aplicado (${fontSize})`);

console.log('projection-textfill-visibility.test: OK');
process.exit(0);
