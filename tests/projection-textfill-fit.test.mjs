#!/usr/bin/env node
/**
 * Medição in-place maximiza fonte; overflow horizontal reduz tamanho.
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
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);

function stubSpanMetrics(span, boxWidth) {
  Object.defineProperty(span, 'scrollHeight', {
    configurable: true,
    get() {
      const size = Number.parseInt(this.style.fontSize || '8', 10);
      const wide = boxWidth <= 150;
      const lines = wide ? 1 : 3;
      return Math.ceil(size * lines * 1.35);
    },
  });
  Object.defineProperty(span, 'scrollWidth', {
    configurable: true,
    get() {
      const size = Number.parseInt(this.style.fontSize || '8', 10);
      const wide = boxWidth <= 150;
      return wide ? Math.ceil(size * 12) : boxWidth;
    },
  });
  Object.defineProperty(span, 'offsetHeight', {
    configurable: true,
    get() {
      return this.scrollHeight;
    },
  });
}

const { applyPreviewTextfill } = await import('../dist/shared/projection-textfill.js');

const root = document.createElement('div');
root.className = 'conteudo';
root.style.width = '320px';
root.style.height = '240px';
root.innerHTML = `
  <div class="titulo"></div>
  <div class="content" style="width:280px;height:200px;overflow:hidden"><span>Um plano pra salvar<br>Um pacto pra selar<br>Silêncio no céu</span></div>
  <div class="rodape">Jesus</div>
`;
document.body.appendChild(root);

const box = root.querySelector('.content');
Object.defineProperty(box, 'clientWidth', { configurable: true, get: () => 280 });
Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => 200 });
Object.defineProperty(root, 'clientWidth', { configurable: true, get: () => 320 });
Object.defineProperty(root, 'clientHeight', { configurable: true, get: () => 240 });

const span = root.querySelector('.content > span');
stubSpanMetrics(span, 280);

applyPreviewTextfill(root, 8, 120, true, {});

const fontSize = Number.parseInt(span.style.fontSize, 10);
assert(Number.isFinite(fontSize) && fontSize > 0, `fontSize aplicado (${fontSize})`);
assert(fontSize > 40, `fontSize deve maximizar área útil (${fontSize})`);
assert(fontSize <= 120, `fontSize não deve exceder max (${fontSize})`);

const nowrapRoot = document.createElement('div');
nowrapRoot.className = 'conteudo';
nowrapRoot.style.width = '160px';
nowrapRoot.style.height = '120px';
nowrapRoot.innerHTML = `
  <div class="content" style="width:120px;height:80px"><span>TextoLongoSemEspacos</span></div>
`;
document.body.appendChild(nowrapRoot);

const nowrapSpan = nowrapRoot.querySelector('.content > span');
stubSpanMetrics(nowrapSpan, 120);

applyPreviewTextfill(nowrapRoot, 8, 120, true, {});
const nowrapPx = Number.parseInt(nowrapSpan.style.fontSize, 10);
assert(nowrapPx < 40, `overflow horizontal deve reduzir fonte (${nowrapPx})`);

console.log('projection-textfill-fit.test: OK');
process.exit(0);
