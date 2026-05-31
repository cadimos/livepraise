# Spec UX — Tipografia de projeção e textfill

**Issue:** [CAD-308](/CAD/issues/CAD-308)  
**Iniciativa:** [CAD-307](/CAD/issues/CAD-307) · **Escopo PM:** [escopo.md](./escopo.md)  
**Implementação settings:** [CAD-312](/CAD/issues/CAD-312) · **Runtime:** [CAD-313](/CAD/issues/CAD-313) · **QA:** [CAD-314](/CAD/issues/CAD-314)

**Autor:** UXDesigner  
**Data:** 2026-05-31  
**Status:** APROVADO para implementação

**Artefactos:** [ux-handoff.md](./ux-handoff.md) · [mock-projection-typography-panel.html](./mock-projection-typography-panel.html)

---

## 1. Resumo

Novo painel **«Tipografia de projeção»** nas Configurações do operador: seis perfis independentes (projetor, retorno palco, live, vocal, stage, player), cada um com família tipográfica, estilo, limites min/max, textfill on/off, sombra em camadas e **prévia ao vivo** espelhando o tile de saída correspondente.

**Distinção crítica (escopo §3.1):** prévia no painel **cabe** no frame; saída real **maximiza** área útil — mesma família/peso/sombra, algoritmo de sizing distinto.

---

## 2. Lentes de design (rastreável)

| Lente | Decisão |
|-------|---------|
| **Mental Models / Chunking** | Separar «interface do operador» ([AppearancePanel](/CAD/issues/CAD-286)) de «texto projectado» — painel dedicado, não sub-secção de Tema e idioma. |
| **Miller's Law** | Máx. ~7 controlos visíveis por perfil; sombra avançada e CSS recolhidos (Progressive Disclosure). |
| **Jakob's Law** | Entrada no menu Configurações como Louvor/Bíblia; modal `SettingsModal` existente. |
| **Recognition over Recall** | Prévia ao vivo com texto exemplo + fundo sintético; operador vê resultado antes de projectar. |
| **Hick's Law** | Estilo tipográfico em **segmented control** de 4 opções (não dois selects separados de peso+estilo). |
| **Defaults** | Perfil sem config → Roboto Regular bundled; sombra padrão 4 camadas legado; textfill **activo**. |
| **Loss Aversion / Forgiveness** | «Restaurar padrão» por secção (sombra, limites px) — não reset global do perfil. |
| **WCAG POUR** | Alvos ≥44×44px nos segmentos; labels explícitos; contraste preview sobre scrim; `prefers-reduced-motion` sem animar resize de fonte. |
| **Norman — Feedback** | Prévia actualiza em ≤100ms após alteração (Doherty Threshold); persistência ≤1 s nos clientes (CA-12). |
| **Tesler's Law** | Complexidade de binary search fica em runtime ([CAD-313](/CAD/issues/CAD-313)); settings só expõe min/max e toggle. |
| **Information Scent** | Tabs nomeiam destino real («Projetor», «Retorno palco», «Live», …) — alinhado a tiles de prévia [CAD-221](/CAD/issues/CAD-221). |
| **Ethics** | Aviso copy sobre fontes do sistema — sem dark patterns; sem CDN externo. |

---

## 3. IA — entrada e navegação

### 3.1 Decisão: painel dedicado (não dentro de Aparência)

| Opção | Decisão | Racional |
|-------|---------|----------|
| Sub-secção em `AppearancePanel` | **Rejeitada** | Mistura escala UI operador (`fontScalePercent`) com tipografia de culto — Cognitive Load, modelo mental distinto. |
| Entrada própria no menu Configurações | **Aprovada** | Paridade `worship` / `bible`; título claro «Tipografia de projeção». |

**Implementação [CAD-312](/CAD/issues/CAD-312):**

- `SettingsPanel` + `'projectionTypography'`
- Menu Configurações → item após «Aparência» (Serial Position — settings visuais agrupados)
- `SettingsModal` com `:wide="true"` (layout duas colunas)
- Componente `ProjectionTypographyPanel.vue`

### 3.2 Tabs por perfil (Must)

Ordem fixa (esquerda → direita):

| Tab | Chave config | Label i18n |
|-----|--------------|------------|
| 1 | `projector` | Projetor |
| 2 | `stageReturn` | Retorno palco |
| 3 | `live` | Live |
| 4 | `vocal` | Vocal |
| 5 | `stage` | Palco |
| 6 | `player` | Player |

**Padrão visual:** reutilizar classes de tab do operador (`border-b-2 border-lp-primary` activo) — paridade `App.vue` painéis principais.

**Mobile (390px):** `overflow-x-auto` no tab strip; tabs `shrink-0`; preview abaixo dos controlos (coluna única).

---

## 4. Anatomia do painel (desktop 1440×900, modal wide)

```
┌─ SettingsModal max-w-4xl ─────────────────────────────────────────────┐
│ Tipografia de projeção                                          [×] │
├───────────────────────────────────────────────────────────────────────┤
│ [Projetor] [Retorno palco] [Live] [Vocal] [Palco] [Player]  ← tabs │
├──────────────────────────────┬────────────────────────────────────────┤
│ COLUNA CONTROLos (~55%)      │ COLUNA PRÉVIA (~45%)                   │
│ gap-4 text-sm                │ sticky top-0                           │
│                              │                                        │
│ intro (1 parágrafo muted)    │ ┌ projection-preview-frame 16:9 ──┐  │
│                              │ │ fundo + scrim + sample HTML      │  │
│ § Fonte                      │ │ textfill preview + shadow        │  │
│ § Tamanho                    │ └──────────────────────────────────┘  │
│ § Textfill                   │ selector: Louvor longo | Bíblia       │
│ § Sombra (accordion)         │ legenda muted                         │
└──────────────────────────────┴────────────────────────────────────────┘
```

**Gestalt — Common Region:** preview isolada com `border border-lp-surface rounded-xl`; controlos agrupados por `<fieldset>` semântico.

---

## 5. Controlos por perfil (tokens `lp-*`)

Reutilizar padrão `AppearancePanel.vue`: `label.flex.flex-col.gap-1.5`, `font-medium text-lp-text`, inputs `rounded border border-lp-surface bg-lp-background px-2 py-1.5`.

### 5.1 Secção Fonte

| Control | Componente | Notas |
|---------|------------|-------|
| Origem | `<select>` | Valores: `bundled` / `system`. Ao mudar para system, mostrar banner aviso (§7). |
| Família | `<select>` | `<optgroup label="…bundled">` + `<optgroup label="…system">`. Lista system via `GET /api/system/fonts` ([CAD-311](/CAD/issues/CAD-311)). |
| Estilo | Segmented `<div role="group">` 4 botões | `normal` · `bold` · `italic` · `boldItalic` → mapeia `fontWeight` + `fontStyle`. Activo: `bg-lp-primary text-white`; inactivo: `border border-lp-surface hover:bg-lp-surface/50`. |

### 5.2 Secção Tamanho

| Control | Tipo | Default | Validação |
|---------|------|---------|-----------|
| Mínimo (px) | `number` min=8 max=400 | 24 | `minFontPx ≤ maxFontPx` |
| Máximo (px) | `number` min=8 max=400 | 120 | inline erro se invertido |

Helper muted: «Na saída real o texto cresce até ao máximo que couber na área útil.»

### 5.3 Secção Textfill

| Control | Tipo | Default |
|---------|------|---------|
| Auto-ajustar texto | `checkbox` ou toggle | `true` |

Copy hint: «Reduz ou aumenta a fonte para caber sem scroll. Desligado usa o tamanho máximo fixo.»

### 5.4 Secção Sombra (Progressive Disclosure)

**Nível 1 — toggle principal**

| Control | Default |
|---------|---------|
| «Usar sombra no texto» | `true` |

**Nível 2 — accordion «Camadas de sombra»** (visível só se toggle on)

Cabeçalho accordion: `button.w-full.flex.justify-between` + chevron; `aria-expanded`.

**Lista de camadas** — cada item em `rounded border border-lp-surface p-3 gap-3`:

| Campo | Control | Unidade |
|-------|---------|---------|
| Deslocamento X | range + number | px (−20…20) |
| Deslocamento Y | range + number | px (−20…20) |
| Desfoque | range + number | px (0…20) |
| Cor | `<input type="color">` + hex readonly | `#000000` default |

**Acções da lista (barra inferior):**

| Botão | Variante | Acção |
|-------|----------|-------|
| Adicionar camada | secundário `border border-lp-surface` | push layer `{0,0,0,#000}` |
| Remover última | secundário, disabled se ≤1 | pop |
| Restaurar padrão | secundário | 4 camadas legado §3.5 escopo |

**Padrão legado (Must — CA-5):**

| # | offsetX | offsetY | blur | color |
|---|---------|---------|------|-------|
| 1 | 2 | 2 | 0 | `#000000` |
| 2 | 3 | 3 | 0 | `#000000` |
| 3 | 5 | 5 | 0 | `#000000` |
| 4 | 6 | 6 | 0 | `#000000` |

**Nível 3 — Could:** `<details>` «Modo avançado (CSS)» recolhido; textarea monospace; erro inline se sanitização falhar; não bloqueia MVP.

**Von Restorff:** «Restaurar padrão» não usa vermelho — acção reversível, não destrutiva.

---

## 6. Prévia ao vivo (Must — CA-1, CA-5, CA-6)

### 6.1 Frame

- Wrapper: `.projection-preview-frame` (existente) + import `shared/projection-layout.css`
- Dimensão: `aspect-video w-full` dentro da coluna preview
- Fundo: gradiente escuro sintético + opcional `img` placeholder (sem PII)
- Scrim: paridade CAD-136 (`linear-gradient` sobre fundo)

### 6.2 Conteúdo exemplo (selector acima do frame)

| Modo | HTML inject | Objectivo |
|------|-------------|-----------|
| **Louvor longo** (default) | `buildMusicHtml` equivalente ≥12 linhas | CA-1 overflow |
| **Bíblia** | `.titulo` + `.content` referência | hierarquia 3 zonas |
| **Notas curtas** | `.content` centrado, `.rodape` vazio | densidade baixa |

Texto sintético pt-BR — ver chaves `settings.projectionTypography.preview.sample.*` em [ux-handoff.md](./ux-handoff.md).

### 6.3 Runtime da prévia (handoff [CAD-312](/CAD/issues/CAD-312))

1. Aplicar CSS font-family/weight/style/shadow do perfil activo na `.content` (helper `projection-text-shadow.ts`).
2. Se `textfillEnabled`: invocar `projection-textfill` modo **preview** (cap inferior vs output — escopo §3.1).
3. `ResizeObserver` no frame — recalcular ao redimensionar modal.
4. Debounce 50ms em sliders de sombra — equilíbrio Doherty vs CPU.

**Legenda abaixo:** «Prévia: texto cabe nesta área. No {destino} a fonte pode ser maior.» — `{destino}` = label da tab activa.

---

## 7. Copy e i18n (Must — CA-14)

Chaves completas em [ux-handoff.md §4](./ux-handoff.md). Resumo:

| Contexto | Tom |
|----------|-----|
| Intro painel | Explicar 6 destinos independentes; guardar reflecte em ≤1 s |
| Fonte sistema | **Aviso:** «Fontes do sistema dependem do equipamento que projecta. Tablets ou PCs remotos podem não ter a mesma fonte.» |
| Textfill off | «Tamanho fixo no máximo configurado.» |
| Erro min>max | «O mínimo não pode ser maior que o máximo.» |
| Sombra off | «Texto plano, sem contorno.» |

---

## 8. Mapeamento CA → UX

| CA | Verificação UX |
|----|----------------|
| CA-1 | Prévia Louvor longo — sem scroll/overflow no frame |
| CA-2 | Copy preview vs output (§6.3 legenda) + side-by-side QA |
| CA-3 | Toggle textfill off — fonte estável no mock |
| CA-4 | Tab Vocal ≠ Projetor — configs isoladas |
| CA-5 | Restaurar padrão sombra — 4 camadas visíveis na prévia sobre fundo |
| CA-6 | Toggle sombra off — sem artefacto |
| CA-7 | Roboto bundled — preview match (QA 3 superfícies) |
| CA-8 | Banner system fonts presente |
| CA-9 | QA DisplaysPanel + output (fora settings) |
| CA-12 | Guardar → feedback «Guardado» ou sync silencioso ≤1 s |
| CA-14 | Inspecção `locales/pt-BR.json` |

---

## 9. Fora desta spec (Won't)

- Alterar layout 3 zonas ou `projection.ts` markup
- Upload de fontes custom
- Animação de transição entre tamanhos de fonte na prévia
- Presets «Bíblia serif / louvor sans» (Could futuro)

---

## 10. Handoff implementação [CAD-312](/CAD/issues/CAD-312)

1. Criar `ProjectionTypographyPanel.vue` conforme §4–§6.
2. Extender `usePreferences` com `projectionTypography` (schema escopo §3.2).
3. Registar painel em `ActionBar`, `App.vue`, `settingsTitle`.
4. Implementar segmented control reutilizável inline ou extrair se já existir padrão.
5. Accordion sombra: estado local + persistência em `textShadowLayers`.
6. Prévia: componente `ProjectionTypographyPreview.vue` partilhável com runtime [CAD-313](/CAD/issues/CAD-313).
7. i18n: todas as chaves §7 / ux-handoff §4.

**Status UX:** spec completa — desbloqueia [CAD-312](/CAD/issues/CAD-312).
