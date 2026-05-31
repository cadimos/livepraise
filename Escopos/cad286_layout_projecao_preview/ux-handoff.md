# UX Handoff — Layout 3 zonas (projeção e prévia)

**Issue UX:** [CAD-287](/CAD/issues/CAD-287)  
**Escopo:** [escopo.md](./escopo.md) · **Iniciativa:** [CAD-286](/CAD/issues/CAD-286)  
**Implementação:** [CAD-288](/CAD/issues/CAD-288) · **Orquestração:** [CAD-289](/CAD/issues/CAD-289) · **QA:** [CAD-290](/CAD/issues/CAD-290)

**Artefactos desta entrega:**

| Artefacto | Caminho |
|-----------|---------|
| CSS partilhado (spec) | `shared/projection-layout.css` |
| Mock HTML interactivo | [`mock-projection-3-zonas.html`](./mock-projection-3-zonas.html) |
| Screenshots UX | `mock-screenshot-desktop.png`, `mock-screenshot-preview-tile.png` (nesta pasta) |

---

## 1. Decisão de layout (Gestalt + Cognitive Load + Progressive Disclosure)

| Opção | Decisão | Lentes |
|-------|---------|--------|
| Flex centrado único (as-is) | **Rejeitada** — referência bíblica e créditos competem com o corpo; hierarquia invisível (Miller's Law, Proximity). | Gestalt Similarity |
| Grid 3 faixas fixas | **Aprovada** — `.titulo` / `.content` / `.rodape` mapeiam para header / main / footer; faixas vazias colapsam (`:empty`). | Common Region, Chunking |
| Wrapper HTML novo | **Rejeitada** — contrato WS inalterado; só CSS sobre markup existente (`projection.ts`). | Occam's Razor, Tesler's Law |
| Alinhamento por `data-*` no HTML | **Rejeitada** — detecção via `:has(.titulo:not(:empty))` distingue Bíblia vs louvor sem mudar emitters. | Postel's Law |

**Outcome (JTBD):** operador identifica referência e créditos em &lt;3 s só pela prévia; público lê versículo/letra sem scan vertical caótico.

---

## 2. Anatomia das 3 zonas

```
┌──────────────────────────────────────────────┐  #conteudo (grid rows: auto 1fr auto)
│ .titulo          Mateus 5:1                  │  grid-area: header — oculto se :empty
├──────────────────────────────────────────────┤
│                                              │
│         .content  (faixa flexível)           │  grid-area: main — min-height: 0
│                                              │
├──────────────────────────────────────────────┤
│ .rodape  Salmos 92 (Artista)                 │  grid-area: footer — oculto se :empty
└──────────────────────────────────────────────┘
     ↑ overlay footerAlert (CAD-188) — fora do grid, absoluto no #stage
```

### 2.1 Regras de alinhamento (Must — paridade mock)

| Modo | Detecção | `.titulo` | `.content` | `.rodape` |
|------|----------|-----------|------------|-----------|
| **Bíblia** | `.titulo:not(:empty)` | Topo-esquerda, `font-size: var(--proj-font-size-title)` | Esquerda; **centrado verticalmente** na faixa `main` | Oculto (`:empty`) |
| **Louvor** | `.titulo:empty` | Oculto (sem reservar faixa) | **Centrado H+V** na faixa `main` | Inferior-esquerdo da faixa `footer` |
| **Notas** | `.titulo:empty`, `.rodape` variável | Oculto | Centrado (como louvor) | Inferior-esquerdo se preenchido |

**Lentes:** F-pattern na Bíblia (referência → corpo); simetria central no louvor (Flow, Aesthetic-Usability).

---

## 3. Tokens de projeção (proposta de sistema)

Reutilizar cores já presentes em `projector.css`; consolidar em custom properties **no módulo partilhado** — não inline por superfície.

| Token | Valor | Uso |
|-------|-------|-----|
| `--proj-color-text` | `#f8fafc` | Corpo sobre fundo escuro |
| `--proj-color-text-on-light` | `#0f172a` | Corpo com `data-bg-tone="light"` |
| `--proj-color-title` | `#cbd5e1` | `.titulo` |
| `--proj-color-title-on-light` | `#475569` | `.titulo` em fundo claro |
| `--proj-color-footer` | `#e2e8f0` | `.rodape` |
| `--proj-color-footer-on-light` | `#334155` | `.rodape` em fundo claro |
| `--proj-padding` | `2rem` (projetor) / `5%` (prévia) | Padding do `#conteudo` |
| `--proj-font-size-base` | `clamp(1.5rem, 4vw, 3rem)` | Corpo |
| `--proj-font-size-title` | `clamp(1rem, 2.2vw, 1.75rem)` | Referência bíblica |
| `--proj-font-size-footer` | `clamp(0.875rem, 1.6vw, 1.25rem)` | Créditos música |
| `--proj-line-height` | `1.3` | Corpo |
| `--proj-zone-gap` | `0.75rem` | Reservado — gap implícito via grid |
| `--proj-footer-alert-reserve` | `clamp(2.75rem, 7vh, 4.5rem)` | Padding extra quando alerta activo |
| `--proj-text-shadow` | `0 1px 2px rgba(0,0,0,0.65)` | Legibilidade sobre imagem (CAD-136) |

**Prévia operador:** wrapper `.projection-preview-frame { container-type: size; }` redefines `--proj-font-size-*` com unidades `cqw`/`cqh` — paridade de **proporção**, não de px absolutos (Fitts irrelevante; legibilidade em tile 20rem).

**Tokens operador (`lp-*`):** não aplicar na projeção pública — superfícies distintas (Jakob's Law intra-app vs paridade cross-surface).

---

## 4. Decisão `footerAlert` vs `.rodape` (CAD-188)

| Aspecto | Decisão | Racional |
|---------|---------|----------|
| Camada | `footerAlert` permanece **overlay absoluto** no fundo do `#stage` / tile de prévia | Comportamento CAD-188 inalterado |
| Metadados música | `.rodape` permanece **dentro do grid** `#conteudo`, canto inferior-esquerdo | CA-3 — créditos persistentes, não marquee |
| Coexistência (CA-7) | Com alerta activo: `#conteudo` ganha `padding-bottom: calc(var(--proj-padding) + var(--proj-footer-alert-reserve))` via `body.footer-alert-active` (projetor) ou classe `.footer-alert-active` na prévia | Von Restorff — alerta destacado; `.rodape` não fica por baixo do marquee |
| Preview operador | Manter `<footer class="footer-alert-preview">` absoluto; adicionar `.footer-alert-active` no `.conteudo` quando `footerAlertPreview?.active` | Paridade com `body.footer-alert-active` |
| i18n | Sem chaves novas | Textos vêm do HTML / modal existente |

**Não fazer:** fundir `.rodape` e `footerAlert` numa única faixa — papéis distintos (metadados estáticos vs alerta temporário).

---

## 5. Superfícies e integração (handoff [CAD-288](/CAD/issues/CAD-288))

| Superfície | Ficheiro | Acção |
|------------|----------|-------|
| Projetor | `apps/projector/projector.css` | `@import` ou `<link>` de `shared/projection-layout.css`; **remover** regras conflituosas de `#conteudo` flex centrado e `.rodape { margin-top }` |
| `/live` | `web/live/live.css` | Idem; remover `align-items: flex-end` legacy |
| External display | `web/external-display/external-display.css` | Idem |
| Prévia | `PreviewOutputTile.vue`, `PreviewPanel.vue` | Remover utilitários Tailwind `[&_.titulo]` / `[&_.rodape]`; importar CSS partilhado; envolver frame em `.projection-preview-frame`; toggle `.footer-alert-active` |
| Build | Garantir cópia/servir de `shared/projection-layout.css` nos bundles web e estático do operador | CTO valida pipeline |

**Inalterado:** `apps/operator/src/utils/projection.ts`, retorno de palco (`stage-return`), contrato WS.

**Contraste/scrim:** manter `#text-scrim` e `data-bg-tone` existentes (CAD-136); zonas herdam cor do `#conteudo`.

**`ajustarTela` (CA-8):** grid preenche 100% da área útil `#stage`; `min-height: 0` em `.content` para textfill futuro.

---

## 6. Acessibilidade (Could — não bloqueia MVP)

| Item | Proposta | Prioridade |
|------|----------|------------|
| `aria-label` por zona | Opcional em wrapper futuro; MVP CSS-only | Could |
| Contraste | Herda WCAG via scrim + sombra; validar com fundos claros (`data-bg-tone="light"`) | Must (regressão CAD-136) |
| `prefers-reduced-motion` | Marquee footerAlert já coberto; sem animação nas zonas | Must |
| Alvo motor | Sem novos controlos | — |

---

## 7. Critérios de aceite UX (mapeamento CA)

| CA | Verificação UX |
|----|----------------|
| CA-1 | Mock painel «Bíblia» — referência topo-esquerda, corpo abaixo à esquerda |
| CA-2 | Mock «Louvor» — `.titulo` sem faixa; letra centrada |
| CA-3 | `.rodape` inferior-esquerdo, legível 16:9 e 1080p |
| CA-4 | `.rodape:empty { display: none }` — inspecção DOM |
| CA-5 | Tile prévia 20rem — mesma hierarquia que projetor (mock coluna preview) |
| CA-6 | Mesmo ficheiro CSS em live/external |
| CA-7 | Mock «Louvor + footerAlert» — ambos visíveis |
| CA-8 | Resize/`ajustarTela` — zonas dentro da área útil (QA manual) |
| CA-9 | Regressão fundos/vídeo/YouTube — QA [CAD-290](/CAD/issues/CAD-290) |

---

## 8. Verificação visual (CAD-287)

Mock aberto localmente:

```bash
# Servir estático a partir da raiz do repo
python3 -m http.server 8765
# Abrir http://localhost:8765/Escopos/cad286_layout_projecao_preview/mock-projection-3-zonas.html
```

| Viewport | Superfície verificada |
|----------|----------------------|
| 1440×900 | Painéis projetor (Bíblia, Louvor, footerAlert) |
| 390×844 (mobile scroll) | Grid responsivo do mock; tile prévia legível |

Screenshots capturados nesta entrega UX (evidência visual-truth gate).

---

## 9. Riscos residuais

| Risco | Mitigação |
|-------|-----------|
| `:has()` em browsers antigos | Electron ≥22 / Chromium moderno — aceite; documentar |
| `4vw` na prévia full-viewport se CSS não importado com container | Obrigatório `.projection-preview-frame` nos tiles |
| Divergência se Frontend copiar CSS em vez de importar | Code review [CAD-289](/CAD/issues/CAD-289) — single source `shared/projection-layout.css` |

---

## 10. Resumo para implementação

1. Importar `shared/projection-layout.css` em todas as superfícies listadas §5.
2. Remover estilos duplicados/conflituantes de `#conteudo` / `.conteudo`.
3. Adicionar `.projection-preview-frame` + `.footer-alert-active` na prévia.
4. Não alterar HTML emitido por `buildMusicHtml` / `buildBibleHtml`.
5. QA side-by-side prévia Projetor vs monitor físico (CA-5).

**Status UX:** spec completa — pronta para [CAD-288](/CAD/issues/CAD-288).
