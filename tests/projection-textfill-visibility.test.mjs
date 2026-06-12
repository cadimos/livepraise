#!/usr/bin/env node
/**
 * Garante que refreshOutputTextfill oculta com opacity (layout fiel) e termina visível.
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

const opacityLog = [];
let opacityValue = '';
Object.defineProperty(root.style, 'opacity', {
  configurable: true,
  enumerable: true,
  get() {
    return opacityValue;
  },
  set(value) {
    opacityLog.push(value);
    opacityValue = value;
  },
});

await refreshOutputTextfill(root, 24, 120, true, {});

assert(opacityLog.includes('0'), 'root deve ficar com opacity 0 durante textfill');
assert(opacityValue === '', 'root deve voltar visível após textfill');

const span = root.querySelector('.content > span');
assert(span, 'span de conteúdo presente');
const fontSize = Number.parseInt(span.style.fontSize, 10);
assert(Number.isFinite(fontSize) && fontSize >= 24, `fontSize final aplicado (${fontSize})`);

console.log('projection-textfill-visibility.test: OK');
process.exit(0);
