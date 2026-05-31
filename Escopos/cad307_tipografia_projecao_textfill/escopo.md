# Documento de Escopo — Tipografia de projeção e textfill

**Iniciativa:** CAD-307  
**Produto:** Live Praise (`1.0.0-alpha.1`)  
**Data:** 2026-05-31  
**Versão:** 1.0  
**Autor:** PM (Cadimos)  
**Status:** APROVADO — pronto para UX, Security (informacional) e implementação  
**Issue:** [CAD-307](/CAD/issues/CAD-307)

---

## 1. Objetivo (JTBD)

Quando o operador projeta **louvor**, **Bíblia** ou **notas**, o público precisa ler o texto **sem scroll, corte ou overflow** — com tamanho optimizado para a distância e o ecrã. O operador precisa **configurar fonte, estilo, sombra e auto-ajuste por destino** (projetor, live, vocal, etc.) e **ver o mesmo aspecto na prévia** antes de ir ao ar.

**Outcome:** legibilidade à distância no projetor; prévias fiéis no operador; paridade com o comportamento `textfill` do legado v0.0.8; zero dependência de Google Fonts na LAN.

**Distinção:** complementa [CAD-286](/CAD/issues/CAD-286) (layout 3 zonas — **done**). O textfill mede sobretudo `.content`; topo/rodapé mantêm tamanhos relativos do layout existente.

## 2. Contexto (as-is)

| Elemento | Estado actual |
|----------|----------------|
| Layout projeção | [CAD-288](/CAD/issues/CAD-288) **done** — `shared/projection-layout.css`, faixa `.content` com `min-height: 0` e `overflow: hidden` (preparado para textfill) |
| Tamanhos CSS | `projection-layout.css` usa `clamp()` fixo (`--projection-body-size`, etc.) — **sem** auto-ajuste por conteúdo |
| Prévia operador | `PreviewOutputTile.vue`, `MultiOutputPreviewColumn.vue` — HTML inject; **sem** textfill |
| Projetor | `apps/projector/projector.ts` + `projector.css` — **sem** textfill |
| Clientes web | `web/live/`, `web/external-display/` — idem |
| Retorno palco | `apps/stage-return/` — markup `.retorno-musica` / `.retorno-biblia`; **sem** tipografia configurável |
| Settings | `AppearancePanel.vue` — tema, escala UI operador (100–125%), locale; **sem** tipografia de projeção |
| Preferências | `usePreferences.ts` — `localStorage`; **sem** `projectionTypography` |
| Fontes | **Inexistentes** em `resources/fonts/`; legado v0.0.8 referenciado no inventário mas tree `v0.0.8/` removida do repo activo |
| Legado | jQuery TextFill no projetor v0.0.8 — auto `font-size` no contentor (referência comportamental) |
| Inventário | `INVENTARIO-FUNCOES.md` §1 — fonte de requisitos desta issue |

### 2.1 Perfis de configuração (Must)

| Chave config | `ClientRole` / destino | Superfície |
|--------------|------------------------|------------|
| `projector` | `projection` | Electron projetor + `/projector/` |
| `stageReturn` | `stage-return` | `apps/stage-return/` |
| `live` | externo `live` | `/live/` |
| `vocal` | externo `vocal` | `/vocal/` |
| `stage` | externo `stage` | `/stage/` |
| `player` | externo `player` | `/player/` |

Prévia operador: tile que simula perfil X usa config `projectionTypography[X]`.

## 3. Escopo (to-be)

### 3.1 Dois modos de textfill (Must)

Partilham schema de fonte/sombra; diferem no **objectivo de sizing**:

| Modo | Onde | Objectivo |
|------|------|-----------|
| **Preview** | Tiles de prévia no operador | Texto **cabe** na área visível do tile (miniatura); sem scroll/corte |
| **Output** | Projetor, live, external, stage-return | Texto ocupa **maior área útil** em `.content` (ou equivalente retorno), respeitando `minFontPx`/`maxFontPx`, margens, scrim e `ajustarTela` |

Interruptor `textfillEnabled` por perfil desactiva auto-ajuste (usa tamanho fixo `maxFontPx` ou CSS base).

**Algoritmo (referência — CTO detalha implementação):**

- Utilitário `shared/projection-textfill.ts`: medir contentor (`.content` ou selector configurável por superfície), binary search de `font-size`, tolerância de overflow zero.
- Reexecutar em: `resize`/`ResizeObserver`, mudança de HTML (`texto`, `viewMusica`, `viewBiblia`, retorno), `ajustarTela`, mudança de config tipografia.
- Preview e output podem usar **limites distintos** derivados do mesmo perfil (ex.: preview cap inferior para caber no tile).

### 3.2 Configuração por perfil (Must)

Persistência em preferências do operador (`~/livepraise` ou extensão de `usePreferences` — decisão técnica CTO desde que **todos** os clientes de projeção recebam updates ≤1 s após guardar).

Schema mínimo por chave em `projectionTypography`:

```ts
interface ProjectionTypographyProfile {
  fontSource: 'bundled' | 'system';
  fontFamily: string;       // id manifesto ou family name SO
  fontWeight: 400 | 700;
  fontStyle: 'normal' | 'italic';
  minFontPx: number;
  maxFontPx: number;
  textfillEnabled: boolean;
  textShadowEnabled: boolean;
  textShadowLayers: Array<{
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;        // hex sanitizado
  }>;
  textShadowCssAdvanced?: string; // modo avançado opcional
}
```

**Fallback global:** Roboto Regular (`bundled`, `roboto`) para perfis sem config.

### 3.3 Fontes embutidas (Must)

| Família | ID manifesto | Pesos mínimos |
|---------|--------------|---------------|
| Roboto | `roboto` | Regular, Bold, Italic, BoldItalic (+ Light, Medium se disponível no legado) |
| Source Sans 3 | `source-sans-3` | R, B, I, BI |
| Lato | `lato` | R, B, I, BI |
| Open Sans | `open-sans` | R, B, I, BI |
| Noto Sans | `noto-sans` | R, B, I, BI |
| Literata | `literata` | R, B, I, BI |
| Merriweather | `merriweather` | R, B, I, BI |

**Entrega infra:**

- Ficheiros em `resources/fonts/{familia}/` + `resources/fonts/manifest.json` (id, label, cssFamily, ficheiros por peso/estilo).
- Licenças OFL/Apache documentadas em `resources/fonts/README.md`.
- Incluir no `electron-builder`; sincronizar para `~/livepraise/fonts/` no arranque (novas + existentes).
- `@font-face` central + `GET /fonts/{familia}/{ficheiro}` (sanitização de path — gate Security).
- **Sem** requests a CDNs externos em runtime.

### 3.4 Fontes do sistema (Must)

- UI: `<select>` com `<optgroup label="Fontes do Live Praise">` + `<optgroup label="Fontes do sistema">`.
- Electron operador: enumeração de fontes instaladas (API Chromium/Electron), deduplicar, ordenar locale.
- Endpoint `GET /api/system/fonts` (auth operador) para clientes na mesma máquina.
- **Aviso copy (Must):** «Fontes do sistema dependem do equipamento que projecta» — relevante para tablets em `/vocal`, etc.

### 3.5 Sombra no texto (Must)

Configuração **visual** — operador **não** escreve CSS no fluxo principal.

1. Interruptor «Usar sombra no texto» por perfil.
2. Editor de camadas: offset X/Y (px ou sliders), blur (px), cor (picker); botões Adicionar / Remover / Restaurar padrão.
3. **Restaurar padrão:** 4 camadas pretas `#000`, blur 0, offsets (2,2), (3,3), (5,5), (6,6) px — paridade legado v0.0.8.
4. Prévia ao vivo no painel de settings (texto exemplo + sombra + textfill).
5. Helper `shared/projection-text-shadow.ts`: camadas → CSS sanitizado; aplicar em previews e saídas.
6. **Modo avançado (Could):** campo CSS recolhido, validação + aviso de erro — não bloqueia MVP.

### 3.6 UI operador (Must)

Novo painel **«Tipografia de projeção»** (settings — sub-painel de Aparência ou entrada dedicada; UX decide):

- Tabs ou accordion por perfil (`projector`, `stageReturn`, `live`, `vocal`, `stage`, `player`).
- Por perfil: família, estilo (normal / negrito / itálico / negrito itálico), min/max px, textfill on/off, sombra (§3.5).
- Prévia em tempo real por perfil.
- i18n pt-BR (chaves `settings.projectionTypography.*`).

### 3.7 Superfícies a actualizar (Must)

| Superfície | Integração |
|------------|------------|
| `PreviewOutputTile.vue`, `MultiOutputPreviewColumn.vue` | textfill preview + fonte/sombra do perfil simulado |
| `apps/projector/` | textfill output + tipografia `projector` |
| `web/live/`, `web/external-display/` | idem por `ExternalDisplayProfile` |
| `apps/stage-return/` | tipografia `stageReturn` + textfill nos contentores `.texto` |
| WS / state | Propagação de config aos clientes após save (mecanismo CTO) |

### 3.8 Sincronização prévia ↔ perfil (Must)

- Tile «Projetor» → config `projector`.
- Tile retorno palco → `stageReturn`.
- Tiles live/vocal/stage/player → perfil correspondente.
- Alterar config `vocal` **não** afecta projetor.

## 4. Fora de escopo

- Alterar layout 3 zonas ([CAD-286](/CAD/issues/CAD-286)) ou markup `projection.ts` salvo wrapper mínimo para medição.
- Tipografia da **UI do operador** (já existe `fontScalePercent` em Appearance).
- Importar fontes custom do utilizador / upload de `.ttf`.
- Animações de transição entre tamanhos de fonte.
- Sincronização cloud de preferências tipográficas.
- Mobile nativo.
- Compliance LGPD adicional — sem novos dados pessoais.

## 5. Critérios de aceite (testáveis)

| ID | Critério | Verificação |
|----|----------|-------------|
| CA-1 | Verso longo (≥12 linhas) no tile prévia Projetor → **sem** scroll/overflow/corte | Smoke manual |
| CA-2 | Mesmo conteúdo no projetor físico → fonte **≥** prévia (output maximiza área); sem overflow | Side-by-side |
| CA-3 | `textfillEnabled: false` → tamanho estável; sem binary search activo | Smoke |
| CA-4 | Perfil `vocal` com Lato Bold ≠ projetor com Source Sans 3 Regular | Smoke multi-perfil |
| CA-5 | Sombra «Restaurar padrão» → 4 camadas visíveis em prévia e projetor sobre foto de fundo | Visual |
| CA-6 | Sombra desligada → texto plano, sem artefacto residual | Smoke |
| CA-7 | Fonte embutida Roboto renderiza igual operador + projetor + `/live` na LAN | Smoke 3 superfícies |
| CA-8 | Fonte sistema «Arial» no operador → aviso copy presente; em tablet sem Arial → fallback legível | Smoke |
| CA-9 | Após `ajustarTela` (preset ≠ fullscreen), textfill recalcula dentro da área útil | DisplaysPanel |
| CA-10 | Tema `high-contrast` + scrim existente — sem regressão legibilidade | Regressão |
| CA-11 | Retorno palco: `.texto` actual e próximo respeitam config `stageReturn` | Smoke stage-return |
| CA-12 | Guardar settings → clientes de projeção reflectem alteração em **≤1 s** | Smoke + cronómetro |
| CA-13 | `GET /fonts/` rejeita path traversal (`../`) | Smoke Security |
| CA-14 | Chaves i18n pt-BR presentes | Inspecção `locales/pt-BR.json` |

## 6. Métricas de sucesso

- Operador projecta verso longo **sem ajuste manual** de zoom/fonte em UAT (3/3 operadores).
- Diferença preview vs projetor limitada ao **modo sizing** (preview cabe; output maximiza) — mesma família/peso/sombra.

## 7. MoSCoW

| Prioridade | Item |
|------------|------|
| **Must** | textfill preview + output, 6 perfis, fontes embutidas (7 famílias), selector bundled/system, sombra camadas + padrão, CA-1–CA-7, CA-9–CA-12, CA-14 |
| **Must** | Propagação config a todos os clientes |
| **Should** | `GET /api/system/fonts`, CA-8, CA-10, CA-11 |
| **Should** | Modo avançado CSS recolhido |
| **Could** | Presets por tipo conteúdo (Bíblia serif / louvor sans) |
| **Won't** | Upload fontes; Google Fonts CDN; alterar layout 3 zonas |

## 8. Dependências e gates

| Dependência | Tipo | Notas |
|-------------|------|-------|
| [CAD-286](/CAD/issues/CAD-286) / [CAD-288](/CAD/issues/CAD-288) | **Resolvida** | `.content` mensurável |
| [CAD-136](/CAD/issues/CAD-136) (scrim/contraste) | Visual | CA-10 |
| [CAD-221](/CAD/issues/CAD-221) (multi-prévia) | UI | Tiles de prévia |
| UX spec painel tipografia | Gate **Should** | Frontend settings pode usar copy PM se UX atrasar |
| Security revisão `GET /fonts` | Gate **Must** merge Backend | Paridade `resolveMediaRelativePath` |
| Compliance | **Não aplicável** | Sem PII novo |
| CTO orquestração | Parent | [CAD-243](/CAD/issues/CAD-243) |

## 9. RICE

- **Reach:** todos os operadores e destinos de texto (projetor, live, vocal, stage, player, retorno).
- **Impact:** alto — legibilidade directa no culto; item #1 do CHANGELOG pós-layout.
- **Confidence:** média-alta — legado comprovado; layout preparado; esforço distribuído (fontes + UI + runtime).
- **Effort:** alto — 3 slices (infra fontes, settings UI, runtime textfill×N superfícies).

## 10. Desdobramento de entrega (issues filhas)

| Issue | Dono | Entrega | Bloqueia |
|-------|------|---------|----------|
| [CAD-308](/CAD/issues/CAD-308) | UXDesigner | Spec painel tipografia, copy, prévia ao vivo, hierarquia sombra | — |
| [CAD-309](/CAD/issues/CAD-309) | SecurityEngineer | Parecer `GET /fonts`, auth `GET /api/system/fonts`, sanitização | — |
| [CAD-310](/CAD/issues/CAD-310) | CTO | Parent técnico: schema sync, ordem slices, review merge | — |
| [CAD-311](/CAD/issues/CAD-311) | Backend | Fontes embutidas, manifest, sync `~/livepraise/fonts`, rotas estáticas + system fonts API | [CAD-309](/CAD/issues/CAD-309) |
| [CAD-312](/CAD/issues/CAD-312) | Frontend | Painel settings + persistência + prévia settings | [CAD-308](/CAD/issues/CAD-308) |
| [CAD-313](/CAD/issues/CAD-313) | Frontend | `projection-textfill`, `projection-text-shadow`, integração previews + saídas + WS sync | [CAD-311](/CAD/issues/CAD-311), [CAD-312](/CAD/issues/CAD-312) |
| [CAD-314](/CAD/issues/CAD-314) | QA | Casos CA-1–CA-14 | [CAD-313](/CAD/issues/CAD-313) |

**Política:** [CAD-243](/CAD/issues/CAD-243) — parent CTO; slices IC Backend + Frontend.

## 11. Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-31 | Escopo inicial APROVADO — inventário §1 + dependência CAD-286 satisfeita (PM) |
