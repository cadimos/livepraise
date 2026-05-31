# Spec UX — Layout 3 zonas (projeção e prévia)

**Issue:** [CAD-287](/CAD/issues/CAD-287)  
**Parente:** [CAD-286](/CAD/issues/CAD-286)  
**Escopo:** [escopo.md](./escopo.md) v1.0  
**Autor:** UXDesigner  
**Data:** 2026-05-31  
**Status:** APROVADO para implementação ([CAD-288](/CAD/issues/CAD-288))

---

## 1. Resumo

Substituir o flex **centrado único** de `#conteudo` por **grid de 3 faixas** (`auto | 1fr | auto`), reutilizando o HTML existente (`.titulo` / `.content` / `.rodape`). Modo Bíblia vs louvor é **inferido por `:empty`** — sem mudança em `projection.ts` (Must do escopo).

**Referência de implementação:** `shared/projection-layout.css` (importar em projetor, live, external-display; espelhar utilitários na prévia).

**Mock interactivo:** `mock-projection-layout.html` (abrir em browser 16:9).

---

## 2. Lentes de design (rastreável)

| Lente | Decisão |
|-------|---------|
| **Chunking / Miller** | Três zonas fixas reduzem carga — referência, corpo e créditos não competem no mesmo bloco. |
| **Gestalt — Proximity** | Referência bíblica colada semanticamente ao corpo (topo→centro), créditos separados no rodapé. |
| **Recognition over Recall** | Posição fixa: referência sempre topo-esquerda; música sempre rodapé-esquerdo. |
| **Fitts's Law** | Zonas grandes; texto principal ocupa faixa central máxima (`minmax(0,1fr)`). |
| **Jakob's Law** | Projeção de culto segue padrão “título + slide + rodapé” (ProPresenter, Holyrics). |
| **Progressive Disclosure** | `.titulo` / `.rodape` **ocultos quando vazios** (`:empty { display: none }`) — louvor não reserva faixa de título. |
| **WCAG POUR — Perceivable** | Contraste herdado de `#conteudo` + `data-bg-tone` (CAD-136); sem novas cores hard-coded fora do par existente. |
| **Reduced motion** | Sem animação de layout; marquee `footerAlert` mantém regra `prefers-reduced-motion` existente. |
| **Norman — Signifiers** | Hierarquia tipográfica por zona (título &lt; corpo &gt; rodapé em escala relativa). |

---

## 3. Anatomia e tokens

### 3.1 Estrutura (sem wrapper novo)

```html
<!-- Louvor (buildMusicHtml) -->
<div class="titulo"></div>
<div class="content"><span>…verso…</span></div>
<div class="rodape">Nome (Artista)</div>

<!-- Bíblia (buildBibleHtml) -->
<div class="titulo">Mateus 5:1</div>
<div class="content"><span>…texto…</span></div>
<div class="rodape"></div>
```

### 3.2 Tokens de projeção (CSS custom properties)

Definidos em `#conteudo` dentro de `shared/projection-layout.css`:

| Token | Valor | Uso |
|-------|-------|-----|
| `--projection-zone-gap` | `clamp(0.5rem, 1.2vw, 1.25rem)` | Espaço entre faixas |
| `--projection-title-size` | `clamp(1rem, 2.2vw, 1.75rem)` | `.titulo` |
| `--projection-body-size` | `clamp(1.5rem, 4vw, 3rem)` | `#conteudo` / `.content` |
| `--projection-footer-size` | `clamp(0.85rem, 1.65vw, 1.35rem)` | `.rodape` metadados |
| `--projection-footer-alert-reserve` | `clamp(3.25rem, 8vh, 5rem)` | Reserva quando `body.footer-alert-active` |

**Nota sistema:** tokens `--lp-*` são **só operador**; projeção usa estes `--projection-*` para não acoplar ao tema do painel.

### 3.3 Tipografia e peso

| Zona | Tamanho | Peso | Alinhamento |
|------|---------|------|-------------|
| `.titulo` | `--projection-title-size` | 600 | Esquerda (quando visível) |
| `.content` | `--projection-body-size` | 400 (herdado) | Bíblia: esquerda, **centrado verticalmente** na faixa `1fr`. Louvor: **centro H+V** |
| `.rodape` | `--projection-footer-size` | 500 | Esquerda, faixa inferior |

Remover nas prévias o “pill” `bg-black/60` do `.rodape` — metadados legíveis por **tamanho + sombra do `#conteudo`**, paridade com projetor (mock louvor).

---

## 4. Comportamento por modo

### 4.1 Bíblia (CA-1, CA-4)

- `.titulo` visível, topo-esquerda.
- `.content` alinhado à esquerda, **justify-content: center** na faixa central (versículo centrado verticalmente na área útil).
- `.rodape:empty` → **sem faixa** (display none).

### 4.2 Louvor (CA-2, CA-3)

- `.titulo:empty` → oculto, **sem espaço reservado**.
- `.content` → `align-items/justify-content: center`, `text-align: center`.
- `.rodape` → inferior esquerdo da grid row 3; sem centralizar na largura total.

### 4.3 Detecção de modo

Preferir **apenas CSS**:

```css
#conteudo:has(.titulo:empty) .content { /* louvor */ }
#conteudo:has(.titulo:not(:empty)) .content { /* implícito bíblia — defaults */ }
```

**Fallback Should (se `:has` for bloqueador em alvo antigo):** classe `data-projection-mode="biblia|louvor"` no `#conteudo` via JS mínimo — só se QA exigir; não é Must na v1.

---

## 5. `footerAlert` vs `.rodape` (CA-7)

| Camada | Elemento | Comportamento |
|--------|----------|---------------|
| Metadados música | `.rodape` dentro de `#conteudo` | Faixa 3 da grid, canto inferior esquerdo |
| Alerta marquee | `#last-action` + `body.footer-alert-active` | Overlay **full-width** no fundo do `#stage` (CAD-188, inalterado) |

**Coexistência (Must):**

1. Com alerta activo, `#conteudo` ganha `padding-bottom` extra via `--projection-footer-alert-reserve` (ver CSS).
2. `.rodape` permanece **acima** da faixa do marquee (não dentro do overlay).
3. Prévia operador: manter `footer-alert-preview` absoluto no tile; aplicar a mesma reserva de padding no `.conteudo` quando `footerAlertPreview?.active`.

**Não fundir** alerta em `.rodape` — são canais distintos (metadados vs mensagem operador).

---

## 6. Superfícies e handoff [CAD-288](/CAD/issues/CAD-288)

| Superfície | Acção |
|------------|--------|
| `apps/projector/projector.css` | `@import` ou concat build de `shared/projection-layout.css`; **remover** flex center antigo de `#conteudo` que conflita |
| `web/live/live.css` | Idem + remover `align-items: flex-end` |
| `web/external-display/external-display.css` | Idem |
| `PreviewPanel.vue`, `PreviewOutputTile.vue` | Remover utilitários Tailwind conflitantes (`[&_.content]:justify-center` global, pill rodapé); importar CSS partilhado ou classe `projection-layout` |
| Build | Garantir cópia de `shared/projection-layout.css` para `/shared/` nos bundles web (padrão existente) |

### 6.1 `ajustarTela` (CA-8)

Grid preenche `#conteudo` dentro de `#stage` já dimensionado — **sem alteração de markup**. Validar que `min-height: 0` na row `1fr` evita overflow ao reduzir área útil.

### 6.2 Textfill (futuro)

`.content` com `overflow: hidden` e faixa `1fr` mensurável — algoritmo futuro mede só `.content`.

---

## 7. Acessibilidade (Could → implementação opcional)

- `#conteudo`: `role="region"` `aria-label="Conteúdo projetado"` (uma vez por superfície).
- `.titulo`: `aria-label="Referência bíblica"` quando não vazio.
- `.rodape`: `aria-label="Informação da música"` quando não vazio.
- Ordem de leitura DOM já correcta (titulo → content → rodape).

---

## 8. Critérios de aceite UX (mapeamento)

| CA | Verificação UX |
|----|----------------|
| CA-1 | Side-by-side `mock-projection-layout.html?mode=biblia` vs mock board |
| CA-2–3 | `?mode=louvor` |
| CA-4 | DevTools: `.rodape` display none |
| CA-5 | Prévia tile 16:9 com **mesmo** CSS importado |
| CA-6 | `/live` + external após import |
| CA-7 | Toggle `body.footer-alert-active` no mock |
| CA-8 | Redimensionar janela / preset DisplaysPanel |
| CA-9 | Regressão visual fundos/scrim — fora desta spec, checklist QA |

---

## 9. Fora desta spec (confirmado)

- `stage-return` (`.retorno-musica` / `.retorno-biblia`)
- Textfill / auto-fonte
- Novos tokens `--lp-*` ou componentes operador

---

## 10. Riscos residuais

| Risco | Mitigação |
|-------|-----------|
| `:has()` em browser antigo do projetor Electron | Verificar versão Chromium empacotado; fallback `data-projection-mode` |
| Prévia Tailwind vs CSS partilhado | Uma fonte: import `projection-layout.css` no tile |
| Dupla contagem padding com `footerAlert` | QA CA-7 com texto longo no marquee |

---

## 11. Histórico

| Versão | Data | Notas |
|--------|------|-------|
| 1.0 | 2026-05-31 | Spec inicial + CSS referência + mock HTML |
