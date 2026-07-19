#!/usr/bin/env node
/**
 * QA tipografia de projeção e textfill (CA-1–CA-14) — ex smoke-cad314 (SM-030).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-typography-qa-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(id, note = '') {
  console.log(`PASS ${id}${note ? `: ${note}` : ''}`);
}

function skip(id, note = '') {
  console.log(`SKIP ${id}${note ? `: ${note}` : ''}`);
}

function readSrc(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

const { applyPreviewTextfill, applyOutputTextfill } = await import(
  '../dist/shared/projection-textfill.js'
);
const {
  DEFAULT_TEXT_SHADOW_LAYERS,
  defaultProjectionTypographyPrefs,
} = await import('../dist/shared/projection-typography.js');
const {
  layersToTextShadowCss,
  resolveProjectionTextShadowCss,
} = await import('../dist/shared/projection-text-shadow.js');

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

const { port } = await startLivepraiseServer(0);
const base = `http://127.0.0.1:${port}`;

function buildLongWorshipHtml(lineCount = 14) {
  const lines = Array.from({ length: lineCount }, (_, i) => `Linha ${i + 1} do louvor longo`);
  return `<div class="content"><span>${lines.join('<br>')}</span></div>`;
}

function mockTextfillDom(html, boxHeight, boxWidth = 640) {
  const dom = new JSDOM(`<!DOCTYPE html><body>${html}</body>`);
  const { document } = dom.window;
  const root = document.body.firstElementChild;
  const content = root.querySelector('.content') ?? root;
  const span = content.querySelector('span') ?? content;

  Object.defineProperty(content, 'clientHeight', {
    configurable: true,
    get: () => boxHeight,
  });
  Object.defineProperty(content, 'clientWidth', {
    configurable: true,
    get: () => boxWidth,
  });
  Object.defineProperty(content, 'scrollHeight', {
    configurable: true,
    get() {
      const size = Number.parseInt(span.style.fontSize || '120', 10);
      const lines = (span.innerHTML.match(/<br>|\n/g) ?? []).length + 1;
      return size * lines * 0.9;
    },
  });
  Object.defineProperty(content, 'scrollWidth', {
    configurable: true,
    get: () => boxWidth,
  });

  return { root, content, span };
}

try {
  // CA-1 — verso longo na prévia cabe sem overflow (simulado)
  {
    const { root, content, span } = mockTextfillDom(buildLongWorshipHtml(14), 320);
    applyPreviewTextfill(root, 24, 120, true);
    const fontPx = Number.parseInt(span.style.fontSize, 10);
    assert(fontPx >= 24 && fontPx <= 120, `CA-1 fontPx ${fontPx}`);
    assert(content.scrollHeight <= content.clientHeight, 'CA-1 overflow');
    pass('CA-1', 'louvor longo (14 linhas) cabe na prévia simulada');
  }

  // CA-2 — output maximiza ≥ prévia no mesmo conteúdo
  {
    const html = buildLongWorshipHtml(14);
    const preview = mockTextfillDom(html, 240);
    applyPreviewTextfill(preview.root, 24, 120, true);
    const previewPx = Number.parseInt(preview.span.style.fontSize, 10);

    const output = mockTextfillDom(html, 720);
    applyOutputTextfill(output.root, 24, 120, true);
    const outputPx = Number.parseInt(output.span.style.fontSize, 10);

    assert(outputPx >= previewPx, `CA-2 output ${outputPx} >= preview ${previewPx}`);
    assert(output.content.scrollHeight <= output.content.clientHeight, 'CA-2 output overflow');
    pass('CA-2', `output ${outputPx}px ≥ prévia ${previewPx}px`);
  }

  // CA-3 — textfill desligado usa max fixo
  {
    const { root, span } = mockTextfillDom(buildLongWorshipHtml(14), 120);
    applyPreviewTextfill(root, 24, 120, false);
    assert(span.style.fontSize === '120px', `CA-3 size ${span.style.fontSize}`);
    pass('CA-3', 'textfillEnabled:false → maxFontPx fixo');
  }

  // CA-4 — perfis independentes via API
  {
    const getRes = await fetch(`${base}/api/projection-typography`);
    const body = await getRes.json();
    const prefs = body.projectionTypography;
    const next = {
      ...prefs,
      vocal: {
        ...prefs.vocal,
        fontFamily: 'lato',
        fontWeight: 700,
        fontStyle: 'normal',
      },
    };
    const putRes = await fetch(`${base}/api/projection-typography`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectionTypography: next }),
    });
    assert(putRes.ok, `CA-4 PUT ${putRes.status}`);
    const after = await (await fetch(`${base}/api/projection-typography`)).json();
    assert(after.projectionTypography.vocal.fontFamily === 'lato', 'CA-4 vocal lato');
    assert(after.projectionTypography.vocal.fontWeight === 700, 'CA-4 vocal bold');
    assert(after.projectionTypography.projector.fontFamily === 'roboto', 'CA-4 projector intacto');
    pass('CA-4', 'vocal Lato Bold ≠ projector Roboto');
  }

  // CA-5 — sombra padrão 4 camadas
  {
    assert(DEFAULT_TEXT_SHADOW_LAYERS.length === 4, 'CA-5 layer count');
    const css = layersToTextShadowCss(DEFAULT_TEXT_SHADOW_LAYERS);
    assert(css.split(',').length === 4, 'CA-5 css layers');
    pass('CA-5', 'Restaurar padrão → 4 camadas CSS');
  }

  // CA-6 — sombra desligada
  {
    const css = resolveProjectionTextShadowCss(DEFAULT_TEXT_SHADOW_LAYERS, false);
    assert(css === 'none', `CA-6 css ${css}`);
    pass('CA-6', 'textShadowEnabled:false → none');
  }

  // CA-7 — fonte bundled Roboto nas 3 superfícies (estrutural + HTTP)
  {
    const manifest = await (await fetch(`${base}/fonts/manifest.json`)).json();
    assert(manifest.families?.some((f) => f.id === 'roboto'), 'CA-7 manifest roboto');
    const fontRes = await fetch(`${base}/fonts/roboto/Roboto-Regular.woff2`);
    assert(fontRes.ok, `CA-7 font ${fontRes.status}`);
    for (const file of [
      'apps/projector/src/projector.ts',
      'web/live/src/live.ts',
      'apps/stage-return/src/stage-return.ts',
    ]) {
      const src = readSrc(file);
      assert(src.includes('createProjectionTextfill'), `CA-7 textfill ${file}`);
      assert(src.includes('createProjectionTypographySession'), `CA-7 typography ${file}`);
    }
    pass('CA-7', 'Roboto bundled + textfill + tipografia em projetor/live/stage-return');
  }

  // CA-8 — aviso fontes sistema (copy + UI)
  {
    const locales = JSON.parse(readSrc('locales/pt-BR.json'));
    const warning = locales.settings?.projectionTypography?.fontSourceSystemWarning;
    assert(typeof warning === 'string' && warning.length > 20, 'CA-8 i18n warning');
    const panel = readSrc('apps/operator/src/components/panels/ProjectionTypographyPanel.vue');
    assert(panel.includes('fontSourceSystemWarning'), 'CA-8 panel binding');
    pass('CA-8', 'banner system fonts presente (copy + painel)');
  }

  // CA-9 — ajustarTela dispara refresh textfill
  {
    const projector = readSrc('apps/projector/src/projector.ts');
    assert(projector.includes("case 'ajustarTela'"), 'CA-9 ajustarTela case');
    assert(
      /case 'ajustarTela'[\s\S]*textfill\.scheduleRefresh\(\)/.test(projector),
      'CA-9 scheduleRefresh após ajustarTela',
    );
    pass('CA-9', 'ajustarTela → textfill.scheduleRefresh() no projetor');
  }

  // CA-10 — high-contrast presente; contraste de projeção intacto
  {
    const theme = JSON.parse(readSrc('themes/high-contrast/theme.json'));
    assert(theme.name === 'high-contrast', 'CA-10 theme id');
    const projector = readSrc('apps/projector/src/projector.ts');
    assert(projector.includes('attachProjectionContrast'), 'CA-10 contrast hook');
    pass('CA-10', 'tema high-contrast + attachProjectionContrast sem regressão estrutural');
  }

  // CA-11 — retorno palco usa textfill em `.texto`
  {
    const src = readSrc('apps/stage-return/src/stage-return.ts');
    assert(src.includes('textfillOptions: { allTexto: true }'), 'CA-11 allTexto');
    assert(src.includes("role: 'stage-return'"), 'CA-11 role');
    pass('CA-11', 'stage-return allTexto + perfil stageReturn');
  }

  // CA-12 — persistência ≤1s (loopback)
  {
    const t0 = performance.now();
    const putRes = await fetch(`${base}/api/projection-typography`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectionTypography: defaultProjectionTypographyPrefs(),
      }),
    });
    assert(putRes.ok, `CA-12 PUT ${putRes.status}`);
    const getRes = await fetch(`${base}/api/projection-typography`);
    assert(getRes.ok, `CA-12 GET ${getRes.status}`);
    const elapsed = performance.now() - t0;
    assert(elapsed < 1000, `CA-12 elapsed ${elapsed.toFixed(0)}ms`);
    pass('CA-12', `PUT+GET em ${elapsed.toFixed(0)}ms (<1s)`);
  }

  // CA-13 — path traversal em /fonts
  {
    const res = await fetch(`${base}/fonts/roboto/..%2F..%2Fmusica.db`);
    assert(res.status === 404, `CA-13 status ${res.status}`);
    pass('CA-13', 'traversal ../ → 404');
  }

  // CA-14 — chaves i18n pt-BR
  {
    const locales = JSON.parse(readSrc('locales/pt-BR.json'));
    const pt = locales.settings?.projectionTypography ?? {};
    const required = [
      'title',
      'menuLabel',
      'intro',
      'textfillEnabled',
      'textfillHint',
      'textShadowEnabled',
      'shadowRestoreDefault',
      'saved',
    ];
    for (const key of required) {
      assert(typeof pt[key] === 'string' && pt[key].length > 0, `CA-14 ${key}`);
    }
    assert(typeof pt.profiles?.projector === 'string', 'CA-14 profiles.projector');
    assert(typeof pt.preview?.sample?.worshipBody === 'string', 'CA-14 preview sample');
    pass('CA-14', 'chaves pt-BR presentes em locales/pt-BR.json');
  }

  skip('CA-2-visual', 'side-by-side físico — fora do smoke; validado algoritmo CA-2');
  skip('CA-5-visual', 'sombra sobre foto — validação visual manual/Electron');

  console.log('smoke-typography-qa: OK');
} finally {
  await stopLivepraiseServer();
  fs.rmSync(testHome, { recursive: true, force: true });
}
