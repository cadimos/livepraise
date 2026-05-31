# Handoff UX — Coluna de pré-visualizações multi-saída

**Issues:** [CAD-221](/CAD/issues/CAD-221) · [CAD-222](/CAD/issues/CAD-222) → implementação [CAD-223](/CAD/issues/CAD-223)  
**Versão:** 1.0 · 2026-05-28  
**Autor:** UXDesigner (Cadimos)  
**Escopo de produto:** `escopo.md` (v1.0 aprovado)

---

## 1. Decisão de layout (CAD-222)

### 1.1 Grelha vertical — não carrossel

| Opção | Decisão | Lentes |
|-------|---------|--------|
| **Stack vertical** na coluna direita | **Adotar** | JTBD: comparar saídas em &lt;5 s (UAT escopo §6); **Selective Attention** + **Chunking** por destino; **Goal-Gradient** — ordem fixa reduz procura |
| Carrossel / tabs por saída | **Rejeitar** | **Hick's Law** + custo de memória: esconde saídas (falha CA-2/CA-3); contradiz «confirmar o que **cada** destino está a mostrar» |

### 1.2 Anatomia da coluna (de cima para baixo)

```
┌─────────────────────────────┐
│ Fundos rápidos (inalterado) │  ← QuickBackgroundsStrip, largura = coluna
├─────────────────────────────┤
│ ▼ scroll se necessário      │
│ ┌─ Projetor ─────────────┐  │
│ │ [rótulo] [badge?]      │  │
│ │ ┌──── 16:9 preview ──┐ │  │
│ │ └────────────────────┘ │  │
│ ├─ Retorno ──────────────┤  │  ← só se 2.ª saída física activa
│ ├─ Live ─────────────────┤  │  ← só se perfil com ≥1 cliente WS
│ ├─ Vocal ────────────────┤  │
│ └─ … stage, player ──────┘  │
└─────────────────────────────┘
```

- **Proximidade (Gestalt):** rótulo colado ao tile (`gap-1` entre header e vídeo); `gap-2` entre tiles.
- **Similarity:** todos os tiles usam o mesmo componente base (`PreviewPanel` evoluído); só mudam rótulo, badge e fonte de estado.

### 1.3 Largura da coluna

| Token / constante | Valor | Notas |
|-------------------|-------|-------|
| `PREVIEW_COLUMN_WIDTH` (actual) | `calc(5 * 5rem + 4 * 0.5rem)` ≈ 27.5rem | Mantém alinhamento com grelha de 5 fundos rápidos |
| **Proposta** `PREVIEW_COLUMN_MIN_WIDTH` | `27.5rem` | `min-width` da coluna `<aside>` |
| **Proposta** `PREVIEW_COLUMN_MAX_WIDTH` | `min(32rem, 28vw)` | Em viewports largos, tiles 16:9 não ultrapassam ~512px úteis |

Implementação sugerida em `constants/layout.ts`:

```ts
export const PREVIEW_COLUMN_MIN_WIDTH = 'calc(5 * 5rem + 4 * 0.5rem)';
export const PREVIEW_COLUMN_WIDTH = `clamp(${PREVIEW_COLUMN_MIN_WIDTH}, 28vw, 32rem)`;
```

**Densidade:** coluna permanece **densa** (contexto operador); painel principal à esquerda continua a respirar — **Pareto**: 80% da atenção nos painéis de conteúdo, 20% na coluna de confirmação.

### 1.4 Scroll

- Container: `flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto` envolvendo **apenas** a stack de tiles (fundos rápidos **fixos** no topo).
- **Could (MoSCoW):** quando altura útil &lt; soma dos tiles visíveis, sombra/fade no topo do scroll (`mask-image` ou `border-t` subtil em `lp-surface`) — sinal de **Information Scent**.
- **Doherty Threshold:** scroll nativo instantâneo; sem animação de snap.

### 1.5 Ordem dos painéis (CA-6)

1. `projection` — **sempre** (CA-1)  
2. `stage-return` **ou** 2.º `projection` — máximo **um** tile na posição 2 (nunca duplicar dois projetores na UI; prioridade documentada no eng: primeiro `stage-return` activo, senão 2.º monitor `projection` que não seja o primário)  
3. Externos, só com presença: `live` → `vocal` → `stage` → `player` (CA-3)

Painel `operator` **nunca** aparece (CA-7).

---

## 2. Rótulos e i18n

Reutilizar vocabulário de `displays.roles` onde existir; rótulos de prévia **mais curtos** (coluna estreita).

| Grupo (`PreviewGroupId`) | Chave i18n | Copy pt-BR | Origem |
|--------------------------|------------|------------|--------|
| `projector` | `preview.group.projector` | Projetor | Público / projeção principal |
| `stage-return` | `preview.group.stageReturn` | Retorno | `displays.roles.stage-return` abreviado |
| `projection-secondary` | `preview.group.projectorSecondary` | Projetor 2 | 2.º monitor `projection` |
| `live` | `preview.group.live` | Live | Perfil externo |
| `vocal` | `preview.group.vocal` | Vocal | Perfil externo |
| `stage` | `preview.group.stage` | Palco | Perfil `stage` (endpoint externo) |
| `player` | `preview.group.player` | Player | Perfil externo |

**Remover** overlay `preview.local` no canto do vídeo — substituído por rótulo no header (evita redundância e liberta canto para `footerAlert`).

### 2.1 Badges de estado

| Chave | Copy | Quando |
|-------|------|--------|
| `preview.badge.draft` | Rascunho | Tile projetor mostra rascunho ≠ ao vivo |
| `preview.badge.live` | Ao vivo | Opcional nos **outros** tiles se quiserem reforço (default: omitir — rótulo já identifica saída) |
| `preview.badge.devices` | `{count} ligados` | **Opcional Should** no header de perfis externos com N&gt;1 dispositivos (CA-3); não listar nomes de dispositivos |

### 2.2 Estados vazios (dentro do tile 16:9)

| Chave | Copy | Quando |
|-------|------|--------|
| `preview.empty.content` | Sem conteúdo | Fundo preto + sem HTML/texto para aquele grupo |
| `preview.empty.offline` | Sem ligação | Reservado se implementação expuser perfil configurado mas WS offline (Should; não bloqueia Must) |

Fundo do empty: `bg-lp-surface` centralizado, ícone opcional Lucide `Monitor` muted, texto `text-sm text-lp-muted` — **Recognition over Recall**.

### 2.3 Secção da coluna (opcional)

| Chave | Copy |
|-------|------|
| `preview.column.title` | Saídas |
| `preview.column.hint` | O que cada destino está a mostrar agora |

`hint` como `text-[10px] text-lp-muted` sob o título, uma linha — **Progressive Disclosure**; pode omitir no Must se apertar altura.

---

## 3. Rascunho de edição vs estado ao vivo

Decisão explícita para §3.2 do escopo (desbloqueia CAD-223).

### 3.1 Regra

| Tile | Fonte de pixels | Badge |
|------|-----------------|-------|
| **Projetor (grupo 1)** | Se operador está a **pré-visualizar** nos painéis (eventos `preview` / `preview-bg` / fundo rápido local) **e** o rascunho difere do estado ao vivo do projetor → mostrar **rascunho** | `Rascunho` |
| **Projetor** | Caso contrário → estado **ao vivo** filtrado para `projector` / `projection` | — |
| **Todos os outros** | Sempre estado **ao vivo** do grupo (nunca `previewHtml` do operador) | — |

### 3.2 Detecção de «rascunho activo»

- `hasDraft = (draftHtml !== liveHtml) || (draftBg !== liveBg)` para o grupo projetor.
- Limpar rascunho: `clearPreview`, envio ao vivo (`sendAction` relevante), ou match com `state-sync` do projetor.
- **Paradox of the Active User:** não exigir acção extra para «voltar ao ao vivo» — ao projectar, rascunho colapsa para live automaticamente.

### 3.3 Affordance visual (Must)

- Badge `Rascunho`: `rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-900` no header (contraste WCAG AA sobre âmbar).
- **Could:** `ring-2 ring-lp-primary ring-offset-2 ring-offset-lp-background` no tile projetor com rascunho (**Von Restorff**).

### 3.4 Fundos rápidos

- Clicar fundo rápido continua a actualizar rascunho do **projetor** e envia acção ao vivo — outros tiles reflectem apenas o que o hub entrega a cada perfil (ex.: live sem `background` — CA-4).

---

## 4. Componentes e tokens (handoff eng)

| Peça | Acção |
|------|--------|
| `PreviewPanel.vue` | Adicionar slot/header: `groupLabel`, `badge?: 'draft' \| 'devices'`, `deviceCount?`; remover pill `preview.local` do canto do vídeo |
| `PreviewOutputStack.vue` *(novo)* | Lista ordenada de tiles; scroll; map `PreviewGroupId` → props |
| `App.vue` `<aside>` | `flex flex-col`: strip fixo + stack `flex-1 min-h-0 overflow-y-auto` |
| `constants/layout.ts` | `clamp` como acima |
| `locales/pt-BR.json` | Secção `preview.group`, `preview.badge`, `preview.empty` |

**Tokens existentes (não inventar):** `border-lp-surface`, `bg-lp-surface/40`, `text-lp-muted`, `text-lp-text`, `rounded-xl`, `aspect-video`, sombra `shadow-inner` no tile (paridade `PreviewPanel` actual).

---

## 5. Acessibilidade (Must)

| Critério | Especificação |
|----------|----------------|
| Contraste | Rótulos `text-lp-text` sobre `bg-lp-background`; badges com par mínimo 4.5:1 |
| Tamanho | Rótulo header mín. `text-xs` (12px efectivos com `--lp-ui-scale`) |
| Alvo | Área de scroll não intercepta cliques nos fundos rápidos; tiles não são botões (informativos) — `role="img"` ou `aria-label="{rótulo}: {resumo}"` |
| Movimento | Manter `prefers-reduced-motion` no marquee de `footerAlert` (já em `PreviewPanel`) |
| Cor independente | Badge rascunho não só cor: inclui texto «Rascunho» |
| Zoom | Coluna com `clamp` + scroll: usable a 200% zoom no viewport 1440px |

---

## 6. Critérios de aceite UX (mapeamento)

| ID escopo | Verificação UX |
|-----------|----------------|
| CA-1 | 1 tile «Projetor» sempre visível; empty state se vazio |
| CA-2 | 2 tiles empilhados; labels distintos; conteúdos podem divergir visualmente |
| CA-3 | 1 tile «Vocal» com badge opcional «5 ligados» |
| CA-4 | Tile Live sem fundo quando filtro o excluir |
| CA-5 | `footerAlert` visível em tiles que recebem overlay |
| CA-6 | Ordem na stack conforme §1.5 |
| CA-7 | Sem tile para monitor operador |
| CA-8 | Fundos rápidos e fila inalterados na posição |

---

## 7. Evidência visual (visual-truth gate)

| Artefacto | Viewport | Descrição |
|-----------|----------|-----------|
| `screenshots/as-is-operator-1440x900.png` | 1440×900 | Baseline: uma «Prévia local», fundos rápidos, status «2 monitor(es)» |
| `screenshots/to-be-multi-preview-1440x900.png` | 1440×900 | Mock estático HTML (`mock-to-be-multi-preview.html`) — 4 tiles + badge Rascunho |
| `screenshots/to-be-multi-preview-390x844.png` | 390×844 | Mesmo mock — scroll e `clamp` de coluna |

Servidor: `http://127.0.0.1:3000/operator/` (build actual, 2026-05-28).

---

## 8. Riscos residuais

| Risco | Mitigação |
|-------|-----------|
| Coluna alta com 4+ tiles corta área útil | Scroll + fundos fixos; monitor QA em 1366×768 |
| Confusão «Projetor 2» vs «Retorno» | Copy distinta; alinhar com `DisplaysPanel` |
| Latência &gt;500 ms | Eng: debounce mínimo; skeleton não necessário no Must (fundo preto aceitável) |

---

## 9. Fora deste handoff

- Lógica `shouldDeliver` / composable (`CAD-223`)
- Smoke CA-1–CA-8 (`CAD-224`)
