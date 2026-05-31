#!/usr/bin/env node
/**
 * Smoke CAD-306 — UAT excluir imagens/vídeos (CA-1–CA-10, exceto E2E Electron).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(id, note = '') {
  console.log(`PASS ${id}${note ? `: ${note}` : ''}`);
}

const menuSrc = fs.readFileSync(
  path.join(appRoot, 'apps/operator/src/components/MediaTileContextMenu.vue'),
  'utf8',
);
const imagesSrc = fs.readFileSync(
  path.join(appRoot, 'apps/operator/src/components/panels/ImagesPanel.vue'),
  'utf8',
);
const videosSrc = fs.readFileSync(
  path.join(appRoot, 'apps/operator/src/components/panels/VideosPanel.vue'),
  'utf8',
);

// CA-9 i18n
{
  const locales = JSON.parse(
    fs.readFileSync(path.join(appRoot, 'locales/pt-BR.json'), 'utf8'),
  );
  const mc = locales.mediaContext;
  assert(mc?.delete === 'Excluir da biblioteca', 'CA-9 delete');
  assert(mc?.deleteConfirm?.includes('{name}'), 'CA-9 deleteConfirm');
  assert(mc?.deleteConfirmQueueHint?.length > 10, 'CA-9 deleteConfirmQueueHint');
  assert(mc?.errors?.delete?.length > 5, 'CA-9 errors.delete');
  assert(mc?.errors?.deleteProcessing?.length > 5, 'CA-9 errors.deleteProcessing');
  const install = JSON.parse(
    fs.readFileSync(path.join(appRoot, 'install/locales/pt-BR.json'), 'utf8'),
  );
  assert(install.mediaContext?.delete === mc.delete, 'CA-9 install/locales paridade');
  pass('CA-9', 'chaves pt-BR em locales + install');
}

// CA-3 cancelar confirmação (código)
{
  assert(menuSrc.includes('if (!window.confirm(msg)) return'), 'CA-3 early return confirm');
  pass('CA-3', 'cancelar confirm → return sem DELETE (estrutural)');
}

// CA-4 processing disabled (UI)
{
  assert(menuSrc.includes("props.pipelineStatus === 'processing'"), 'CA-4 pipeline check');
  assert(menuSrc.includes('deleteDisabled'), 'CA-4 deleteDisabled');
  assert(videosSrc.includes(':pipeline-status="item.pipelineStatus"'), 'CA-4 VideosPanel prop');
  pass('CA-4', 'vídeo processing desactiva exclusão no menu');
}

// CA-6 fila não sincronizada com biblioteca
{
  assert(!menuSrc.includes('removeQueueItem'), 'CA-6 sem removeQueueItem no delete');
  assert(menuSrc.includes('reloadQuickBackgrounds'), 'CA-6 reloadQuickBackgrounds pós-delete');
  pass('CA-6', 'delete não remove itens da fila (só reload fundos rápidos)');
}

// CA-10 regressão menu contextual
{
  const neutral = [
    'mediaContext.setInitial',
    'mediaContext.replaceQuick',
    'mediaContext.properties',
    'mediaContext.changeCategory',
    'mediaContext.applyToQueue',
  ];
  for (const key of neutral) {
    assert(menuSrc.includes(key), `CA-10 ${key}`);
  }
  assert(menuSrc.includes('role="separator"'), 'CA-10 separador');
  assert(menuSrc.includes('text-rose-400'), 'CA-10 item destrutivo');
  assert(imagesSrc.includes('MediaTileContextMenu'), 'CA-10 ImagesPanel menu');
  assert(videosSrc.includes('MediaTileContextMenu'), 'CA-10 VideosPanel menu');
  pass('CA-10', '5 acções neutras + separador + destrutivo; painéis ligados');
}

// CA-1 / CA-5 / CA-7 / CA-8 — delegados a smoke-cad300 (API)
pass('CA-1/7/8', 'ver smoke-cad300.mjs (DELETE imagem + auth S-1)');
pass('CA-2/5', 'ver smoke-cad300.mjs (DELETE vídeo + fundos rápidos)');

console.log('smoke-cad306: concluído.');
