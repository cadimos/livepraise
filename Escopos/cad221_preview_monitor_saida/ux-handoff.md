# UX Handoff — Coluna de prévias multi-saída (CAD-221)

> **Canónico (CAD-222):** ver [`handoff_ux_preview_monitors.md`](./handoff_ux_preview_monitors.md) — inclui i18n completo, critérios UX, screenshots e mock HTML.

**Issue UX:** [CAD-222](/CAD/issues/CAD-222) (canónica) · duplicata [CAD-225](/CAD/issues/CAD-225)  
**Implementação:** [CAD-223](/CAD/issues/CAD-223) · **QA:** [CAD-224](/CAD/issues/CAD-224)  
**Escopo:** [escopo.md](./escopo.md)

---

## 1. Decisão de layout (Gestalt + Fitts + Hick)

| Opção | Decisão | Lentes |
|-------|---------|--------|
| Grelha 2×N na coluna | **Rejeitada** — coluna estreita (~20rem); tiles ficam ilegíveis (Cognitive Load). | Proximity, Pragnanz |
| Carrossel horizontal | **Rejeitada** — esconde saídas simultâneas; operador precisa comparar projetor vs retorno em &lt;5s (JTBD). | Serial Position, Goal-Gradient |
| **Stack vertical com scroll** | **Aprovada** — ordem fixa CA-6; scan F-pattern na coluna direita; scroll só quando &gt;4 painéis (MoSCoW Could). | Chunking, Jakob's Law (lista vertical familiar) |

**Hierarquia:** fundos rápidos (terciário, 5 thumbs) → stack de prévias (primário operacional). Rótulo de cada tile no **topo** (Common Region), não sobreposto ao conteúdo — evita conflito com badge «Prévia local» actual.

---

## 2. Anatomia da coluna (`aside` direita)

```
┌─────────────────────────────┐  width: PREVIEW_COLUMN_WIDTH (20rem)
│ FUNDOS RÁPIDOS (existente)  │  QuickBackgroundsStrip — inalterado
├─────────────────────────────┤
│ ▼ scroll se overflow        │  MultiOutputPreviewColumn
│  ┌─ Projetor ─────────────┐ │  PreviewOutputTile × N
│  │ 16:9 live + draft hint │ │
│  └───────────────────────┘ │
│  ┌─ Retorno de palco ────┐ │  só se 2.ª saída activa
│  └───────────────────────┘ │
│  ┌─ Live / Vocal / … ────┐ │  um tile por perfil com ≥1 online
│  └───────────────────────┘ │
└─────────────────────────────┘
```

**Tokens (existentes — não inventar):**

| Uso | Token / classe |
|-----|----------------|
| Fundo coluna / app | `bg-lp-background`, `border-lp-surface` |
| Tile frame | `rounded-xl border border-lp-surface bg-black shadow-inner` |
| Rótulo grupo | `text-xs font-medium text-lp-muted` |
| Estado vazio | `text-sm text-lp-muted` centrado no 16:9 |
| Badge rascunho | `text-[10px] uppercase tracking-wider` + `border-lp-primary/60 text-lp-primary` |
| Gap stack | `gap-2` (0.5rem) |
| Padding coluna | herda `gap-2` do `aside` |

**Largura:** `PREVIEW_COLUMN_WIDTH = '20rem'` — alinha 5×`5rem` dos fundos rápidos + `gap-2`. Responsivo: em viewport &lt;1280px, coluna pode passar a `min(20rem, 28vw)` (CAD-223).

---

## 3. Grupos de prévia (ordem CA-6)

| Ordem | `PreviewGroupKind` | Rótulo i18n | Visibilidade |
|------:|--------------------|-------------|--------------|
| 1 | `projection` | `preview.groups.projection` | **Sempre** |
| 2 | `stage-return` | `preview.groups.stageReturn` | Monitor com papel `stage-return` **ou** 2.º monitor `projection` (nunca duplicar posição 2) |
| 3 | `live` | `preview.groups.live` | ≥1 dispositivo online `profile: live` |
| 4 | `vocal` | `preview.groups.vocal` | ≥1 online `vocal` |
| 5 | `stage` | `preview.groups.stage` | ≥1 online `stage` |
| 6 | `player` | `preview.groups.player` | ≥1 online `player` |

**Excluído:** `operator` — nunca gera tile (CA-7).

Implementação de visibilidade: `apps/operator/src/composables/usePreviewGroups.ts` (esqueleto entregue; CTO completa edge cases com `GET /displays/config`).

---

## 4. Comportamento rascunho vs ao vivo (escopo §3.2)

| Grupo | Ao editar louvor/bíblia/fundo no operador | Após «ir ao vivo» / state-sync |
|-------|-------------------------------------------|--------------------------------|
| **Projetor** | Mostra **rascunho** (HTML/fundo do operador) + badge `preview.draft` | Estado filtrado do hub (`projector`) |
| **Todos os outros** | **Sempre ao vivo** — último estado relevante para o grupo; **não** espelham rascunho | Idem |

**Lentes:** Recognition over Recall (badge «Rascunho» no projetor); Tesler's Law (complexidade no hub, não duplicada na UI).

**Highlight opcional (Could):** `ring-2 ring-lp-primary/40` no tile `projection` enquanto `previewHtml || previewBg` activos.

---

## 5. Estados por tile (`PreviewOutputTile`)

| Estado | UI | i18n |
|--------|-----|------|
| Conteúdo | `aspect-video` + fundo + HTML sanitizado + overlay footer se grupo recebe | — |
| Vazio (sem sync ainda) | Ícone/texto centrado, fundo `bg-lp-surface/20` | `preview.empty.waiting` |
| Perfil externo sem dispositivos | *Tile não renderizado* | — |
| Overlay `footerAlert` | Reutilizar marquee actual; só grupos que recebem overlay (CA-5) | — |

**Acessibilidade:** `aria-label` no tile = rótulo do grupo; `prefers-reduced-motion` mantido no marquee (já em `PreviewPanel`).

---

## 6. Componentes (handoff explícito)

| Componente | Ficheiro | Notas |
|------------|----------|-------|
| `PreviewOutputTile` | `apps/operator/src/components/PreviewOutputTile.vue` | Extraccão de `PreviewPanel`; props: `label`, `contentHtml`, `backgroundUrl`, `footerAlertPreview`, `showDraftBadge`, `empty` |
| `MultiOutputPreviewColumn` | `apps/operator/src/components/MultiOutputPreviewColumn.vue` | Lista `groups[]` + slots de conteúdo por `id` |
| `usePreviewGroups` | `apps/operator/src/composables/usePreviewGroups.ts` | `visibleGroups` computed |
| Constantes | `apps/operator/src/constants/layout.ts` | `PREVIEW_COLUMN_WIDTH` |

**Deprecar:** label `preview.local` no canto do vídeo — substituído por rótulo no header do tile.

---

## 7. Critérios de aceite UX (mapeamento CA)

| CA | Verificação UX |
|----|----------------|
| CA-1 | 1 tile «Projetor», estado vazio ou sync |
| CA-2 | 2 tiles físicos, rótulos distintos, conteúdos podem divergir |
| CA-3 | 1 tile «Vocal» com N dispositivos |
| CA-6 | Ordem visual = tabela §3 |
| CA-7 | Sem tile «Operador» |
| CA-8 | Fundos rápidos e largura coluna sem regressão visual |

---

## 8. Residual / CTO ([CAD-223](/CAD/issues/CAD-223))

- Composable `useOutputPreviewState` — aplicar `shouldDeliver` / `actionReceivableByRole` partilhado (extrair de `live-hub.ts`).
- `ajustarTela` por `displayId` no tile físico correspondente.
- Latência ≤500ms pós `state-sync` (Doherty Threshold).

---

## 9. Verificação visual (UXDesigner)

| Viewport | Superfície | Resultado |
|----------|------------|-----------|
| 1440×900 | Operador — coluna direita com mock 3 tiles | Stack vertical, rótulos legíveis, badge rascunho no projetor |
| 390×844 | N/A — operador desktop-only | — |

*Screenshots: anexar ao comentário Paperclip quando API disponível; build local `vite` porta 5173.*
