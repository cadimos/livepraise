#!/usr/bin/env node
/**
 * Medição oculta só o span (root visível) — sem opacity:0 no root.
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
  <div class="content" style="height:200px;width:400px;overflow:hidden">
    <span>Linha um<br>Linha dois<br>Linha três com texto longo para forçar textfill</span>
  </div>
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

assert(visibilityLog.includes('hidden'), 'span deve ficar hidden durante textfill');
assert(visibilityValue === '', 'span deve voltar visível após textfill');
assert(root.style.opacity !== '0', 'root não deve usar opacity:0');

const fontSize = Number.parseInt(span.style.fontSize, 10);
assert(Number.isFinite(fontSize) && fontSize >= 24, `fontSize final aplicado (${fontSize})`);

console.log('projection-textfill-visibility.test: OK');
process.exit(0);
