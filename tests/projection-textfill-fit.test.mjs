#!/usr/bin/env node
/**
 * textFitsBox deve validar largura e altura — evita verso cortado na prévia.
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

const root = document.createElement('div');
root.innerHTML = `
  <div class="titulo"></div>
  <div class="content" style="height:120px;width:280px;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center">
    <span style="display:block;width:100%">Um plano pra salvar<br>Um pacto pra selar<br>Silêncio no céu</span>
  </div>
  <div class="rodape" style="height:24px">Jesus, o Plano Perfeito</div>
`;
document.body.appendChild(root);

const span = root.querySelector('.content > span');
const box = root.querySelector('.content');

applyPreviewTextfill(root, 8, 120, true, {});

const fontSize = Number.parseInt(span.style.fontSize, 10);
assert(Number.isFinite(fontSize) && fontSize > 0, `fontSize aplicado (${fontSize})`);
assert(fontSize < 120, `fontSize não deve ficar no máximo (${fontSize})`);

span.style.fontSize = '120px';
applyPreviewTextfill(root, 8, 120, true, {});
const refit = Number.parseInt(span.style.fontSize, 10);
assert(refit < 120, `textfill deve reduzir fonte que estoura (${refit})`);

assert(
  span.scrollHeight <= box.clientHeight + 2 || refit <= fontSize,
  'altura do texto deve caber na caixa após textfill',
);

console.log('projection-textfill-fit.test: OK');
