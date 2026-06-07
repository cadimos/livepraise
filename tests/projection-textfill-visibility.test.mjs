#!/usr/bin/env node
/**
 * Garante que refreshOutputTextfill oculta o root durante o cálculo (sem flash entre passagens).
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

const { refreshOutputTextfill } = await import('../shared/projection-textfill.js');

const root = document.createElement('div');
root.innerHTML = `
  <div class="titulo">Louvor</div>
  <div class="content" style="height:200px;width:400px;overflow:hidden">
    <span>Linha um<br>Linha dois<br>Linha três com texto longo para forçar textfill</span>
  </div>
  <div class="rodape"></div>
`;
document.body.appendChild(root);

const visibilityLog = [];
let visibilityValue = '';
Object.defineProperty(root.style, 'visibility', {
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

assert(visibilityLog.includes('hidden'), 'root deve ficar hidden durante textfill');
assert(
  visibilityLog.filter((v) => v === 'hidden').length >= 1,
  'pelo menos uma escrita hidden',
);
assert(visibilityValue === '', 'root deve voltar visível após textfill');

const span = root.querySelector('.content > span');
assert(span, 'span de conteúdo presente');
const fontSize = Number.parseInt(span.style.fontSize, 10);
assert(Number.isFinite(fontSize) && fontSize >= 24, `fontSize final aplicado (${fontSize})`);

console.log('projection-textfill-visibility.test: OK');
