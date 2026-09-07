#!/usr/bin/env node
import {
  createProjectionContentDeduper,
  projectionContentFingerprint,
} from '../dist/shared/projection-content-dedupe.js';
import {
  applyLiveActionToPreviewFrame,
  EMPTY_OUTPUT_PREVIEW_FRAME,
} from '../dist/shared/output-preview.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const deduper = createProjectionContentDeduper();
assert(deduper.shouldApply('<p>Verso</p>'), 'primeiro conteúdo deve ser aplicado');
const firstFingerprint = deduper.currentFingerprint();
assert(firstFingerprint, 'primeiro conteúdo deve gerar fingerprint');
assert(
  !deduper.shouldApply('<p>Verso</p>'),
  'conteúdo idêntico não deve ser reaplicado',
);
assert(
  deduper.shouldApply('<p>Verso alterado</p>'),
  'conteúdo diferente deve ser aplicado',
);
assert(
  projectionContentFingerprint('A') !== projectionContentFingerprint('B'),
  'conteúdos diferentes devem produzir fingerprints diferentes no caso básico',
);
deduper.reset();
assert(deduper.shouldApply('<p>Verso</p>'), 'reset deve permitir reaplicação');

const action = { acao: 'viewMusica', valor: '<div class="content">Verso</div>' };
const firstFrame = applyLiveActionToPreviewFrame(EMPTY_OUTPUT_PREVIEW_FRAME, action);
const duplicateFrame = applyLiveActionToPreviewFrame(firstFrame, action);
assert(
  duplicateFrame === firstFrame,
  'prévia deve preservar a referência quando o conteúdo não mudou',
);

console.log('PASS projection-content-dedupe');
