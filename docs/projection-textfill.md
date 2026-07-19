# Textfill de projeção

Motor de redimensionamento de texto para caber na área útil da projeção (substituto do jQuery TextFill).  
Documento TF-001 … TF-004; auditoria de duplicação TF-005.

## Camadas

```text
shared/projection-textfill.ts              ← motor (algoritmo)
shared/projection-typography-timing.ts     ← debounces partilhados (resize / preview refresh)
shared/projection-typography-runtime.ts    ← createProjectionTypographyController()
shared/projection-typography.ts            ← perfis, prefs, estilos CSS
apps/operator (Vue)                        ← useProjectionTypographyPreview (prévias)
projector / external-display / live        ← saídas via controller
```

## Modos

| Modo | Função | Uso |
|------|--------|-----|
| `preview` | `applyPreviewTextfill` / `refreshPreviewTextfill` | Tiles do operador; `minPx` pode ir a 8px |
| `output` | `applyOutputTextfill` / `refreshOutputTextfill` | Projetor, live, ecrãs externos |
| `output` (batch) | `refreshOutputTextfillAll` | Retorno de palco — cada `.texto` ou acoplado `.atual`/`.proximo` |

## API pública do motor (TF-002)

| Export | Descrição |
|--------|-----------|
| `applyPreviewTextfill(el, min, max, enabled, opts?)` | Síncrono; prévia |
| `applyOutputTextfill(el, min, max, enabled, opts?)` | Síncrono; saída |
| `refreshPreviewTextfill(el, min, max, enabled, opts?)` | Async; aguarda fontes/layout |
| `refreshOutputTextfill(el, min, max, enabled, opts?)` | Async; saída real |
| `refreshOutputTextfillAll(root, min, max, enabled, opts?)` | Async; múltiplos `.texto` |
| `waitForProjectionTypographyLayout(opts?)` | Aguarda `@font-face` antes de medir |
| `PREVIEW_TEXTFILL_MIN_PX` | Constante 8 — piso na prévia (tiles operador) |
| `STAGE_RETURN_OUTPUT_FLOOR_PX` | Constante 10 — piso em saída real no retorno de palco (`.retorno-musica` / `.retorno-biblia`) e em `refreshOutputTextfillAll` |

### `ProjectionTextfillOptions` (principais)

| Opção | Descrição |
|-------|-----------|
| `spanSelector` | Selector do nó de texto (default `.content > span`) |
| `allTexto` | Via runtime — retorno de palco |
| `maxFontPxScale` | Escala para `.proximo` vs `.atual` |
| `fitSlackPx` | Margem extra (sombra de texto) |
| `suppressVisibilityToggle` | Evita flash em batch |
| `diagnosticSurface` | Label nos logs JSONL |
| `fontFamily`, `fontWeight`, `fontStyle` | Medição com fonte correcta |

## Quando usar o quê (TF-003)

| Contexto | Usar |
|----------|------|
| Projetor, live, external-display, stage (`/stage/`) | `createProjectionTypographyController()` |
| Testes unitários / smokes | Imports directos do motor |
| Prévia operador | `useProjectionTypographyPreview()` composable |
| Configurações → Tipografia | Idem composable |

**Regra alvo:** produção usa sempre o **controller** ou composable Vue que o encapsula; o motor directo fica restrito a testes.

## Fluxo operador → projetor (TF-004)

```mermaid
sequenceDiagram
  participant Op as Operador Vue
  participant API as PUT /projection-typography
  participant WS as WebSocket hub
  participant RT as projection-typography-runtime
  participant TF as projection-textfill
  participant DOM as #conteudo

  Op->>API: guardar prefs (min/max, textfill, fonte)
  API->>WS: broadcast typography-updated
  WS->>RT: setPrefs()
  RT->>TF: refreshOutputTextfill()
  TF->>DOM: font-size inline final
```

## Auditoria de duplicação — operador (TF-005)

Lógica **equivalente** entre `useProjectionTypographyPreview` e `createProjectionTypographyController` (dois caminhos de integração mantidos de propósito — TF-026).

| Comportamento | Runtime (controller) | Operador (composable) |
|---------------|----------------------|------------------------|
| Motor de fit | `runTextfill` → `projection-textfill.ts` | `refreshPreviewTextfill` → mesmo motor |
| Font / shadow / slack | partilhados em `@shared/projection-*` | Idem ✓ |
| Debounce resize | `PROJECTION_TYPOGRAPHY_RESIZE_DEBOUNCE_MS` (120) | Idem ✓ (`shared/projection-typography-timing.ts`) |
| Debounce refresh | `requestAnimationFrame` | `PROJECTION_TYPOGRAPHY_PREVIEW_REFRESH_DEBOUNCE_MS` (32) |
| WS sync prefs | `attachProjectionTypographyWs` | N/A (`usePreferences` local) |
| `@font-face` | `ensureFontFaceStyle` | `fontFaceCss` + `<style>` no tile |

**Onde alterar timings:** `shared/projection-typography-timing.ts`.  
**Onde alterar o algoritmo:** `shared/projection-textfill.ts`.  
TF-026 ADR: não criar `<ProjectionContent>` — ver [`TF-026-ADR-projection-content.md`](TF-026-ADR-projection-content.md).

## Diagnóstico (TF-021)

### Activar

1. Operador → **Configurações** → **Logs de erro**
2. Activar o toggle **diagnóstico textfill** (persiste em `localStorage` via `@shared/projection-textfill-diagnostics`)
3. Reproduzir o caso (louvor longo, Bíblia, troca de verso) com prévia e/ou projetor abertos

### Onde ficam os dados

| Destino | Caminho |
|---------|---------|
| Ficheiro no disco | `~/livepraise/textfill-diagnostics.jsonl` (JSONL, uma linha por medição) |
| API (operador autenticado) | `GET /api/system/textfill-diagnostics` |
| UI | Configurações → Logs de erro (últimas 80 entradas; exportar JSONL) |

### Suporte

1. Pedir export JSONL na UI ou copiar `~/livepraise/textfill-diagnostics.jsonl`
2. Campos úteis: `surface`, `mode`, `resultFontPx`, `heightOverflow`, `textSnippet`
3. Limpar: botão na UI ou `DELETE /api/system/textfill-diagnostics`

Módulos: `shared/projection-textfill-diagnostics.ts`, `core/textfill-diagnostics/`; tipo `TextfillDiagnosticEntry` em `@core/textfill-diagnostics/types`.

## CSS

Estilos de layout: `shared/projection-layout.css` — `.content > span` recebe `font-size` inline do textfill.

## Testes

- `tests/projection-textfill-fit.test.mjs`
- `tests/projection-textfill-two-pass.test.mjs`
- `tests/projection-textfill-visibility.test.mjs`

Integrados em `npm run smoke:textfill` e `npm run smoke:typography-qa` (SM-010/030).

## Validação estática (TF-013, TF-014)

| Superfície | Integração textfill | Estado |
|------------|---------------------|--------|
| Projetor | `createProjectionTypographyController` — sem import directo do motor | ✅ |
| Live / external-display | Idem via `projection-typography-runtime` | ✅ |
| Operador (prévia) | `useProjectionTypographyPreview` → `refreshPreviewTextfill` | ✅ |
| Retorno palco (`/stage`) | `textfillOptions: { allTexto: true }` em external-display | ✅ |
| `apps/stage-return/` (legado) | Compila mas **não** servido HTTP — Electron usa `/stage/` | ⚠️ ver ST-004 |
