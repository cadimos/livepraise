# Documento de Escopo — Layout em 3 zonas (projeção e prévia)

**Iniciativa:** CAD-286  
**Produto:** Live Praise (`1.0.0-alpha.1`)  
**Data:** 2026-05-31  
**Versão:** 1.0  
**Autor:** PM (Cadimos)  
**Status:** APROVADO — pronto para UX + implementação  
**Issue:** [CAD-286](/CAD/issues/CAD-286)

---

## 1. Objetivo (JTBD)

Quando o operador projeta **louvor** ou **Bíblia**, o público e o operador (prévia) precisam ver o conteúdo num **layout legível em três zonas fixas** — referência no topo, texto principal no centro, metadados/alerta no rodapé — em vez de um bloco único centrado que mistura hierarquia visual.

**Outcome:** leitura mais rápida da referência bíblica e dos créditos da música; paridade visual entre prévia do operador, projetor físico (Electron) e endpoints (`/live`, dispositivos externos).

## 2. Contexto (as-is)

| Elemento | Estado actual |
|----------|----------------|
| HTML emitido | `apps/operator/src/utils/projection.ts` — `buildMusicHtml` / `buildBibleHtml` já produzem `.titulo`, `.content`, `.rodape` |
| CSS projetor | `apps/projector/projector.css` — `#conteudo` em flex **centrado**; `.titulo` **sem regras dedicadas**; `.rodape` com `margin-top` inline no fluxo |
| Prévia operador | `PreviewPanel.vue`, `PreviewOutputTile.vue` — utilitários Tailwind `[&_.titulo]` / `[&_.rodape]` no mesmo fluxo flex centrado |
| `/live` | `web/live/live.css` — flex `align-items: flex-end`, sem grid de zonas |
| Dispositivos externos | `web/external-display/external-display.css` — idem |
| Alerta rodapé | `footerAlert` — overlay absoluto no fundo do `#stage` (CAD-188); **independente** de `.rodape` de metadados |
| Retorno de palco | `buildMusicStageHtml` / `buildBibleStageHtml` — markup distinto (`.retorno-musica`, `.retorno-biblia`); **não afectado** |
| Referência visual | [`ux-handoff.md`](./ux-handoff.md) · [`mock-projection-3-zonas.html`](./mock-projection-3-zonas.html) · screenshots `mock-screenshot-*.png` |

### 2.1 Referência visual (board)

**Bíblia** (`mock-biblia-3-zonas.png`):

- **Topo:** referência «Mateus 5:1» alinhada à esquerda, tipografia menor que o corpo.
- **Centro:** texto do versículo, corpo principal, alinhado à esquerda abaixo da referência (não centrado na tela inteira).

**Louvor** (`mock-louvor-3-zonas.png`):

- **Topo:** vazio (sem `.titulo` visível).
- **Centro:** letra do verso centrada horizontal e verticalmente na área útil.
- **Rodapé:** «Nome da música (Artista)» no canto inferior esquerdo, tipografia menor.

## 3. Escopo (to-be)

### 3.1 Modelo de layout (3 zonas)

Dentro de `#conteudo` (ou equivalente na prévia), adoptar **grid ou flex de 3 faixas** com área útil descontando `padding` e `ajustarTela`:

| Zona | Selector | Conteúdo | Visibilidade |
|------|----------|----------|--------------|
| **Topo** | `.titulo` | Referência bíblica (`Livro cap:vers`) | Visível quando preenchido; **oculto** quando vazio (louvor, notas) |
| **Centro** | `.content` | Texto principal (verso, versículo, nota) | Sempre que há conteúdo; ocupa espaço **restante** entre topo e rodapé |
| **Rodapé** | `.rodape` | Metadados da música (`nome (artista)`) | Visível quando preenchido; **oculto** quando vazio (Bíblia pura) |

**Regras de alinhamento (Must — paridade mock):**

- **Bíblia:** `.titulo` e `.content` alinhados à **esquerda**; `.content` centrado **verticalmente** na faixa central disponível.
- **Louvor:** `.content` **centrado** H+V na faixa central; `.rodape` **inferior esquerdo** da faixa de rodapé (não centrado).
- **Contraste/scrim:** manter `#text-scrim` e `data-bg-tone` existentes (CAD-136); zonas herdam cor/sombra do `#conteudo`.

### 3.2 Superfícies a actualizar (Must)

| Superfície | Ficheiro(s) | Notas |
|------------|-------------|-------|
| Projetor Electron | `apps/projector/projector.css` (+ build espelho se aplicável) | Fonte de verdade visual full-screen |
| Prévia operador | `PreviewPanel.vue`, `PreviewOutputTile.vue` | Paridade 16:9 com projetor; reutilizar CSS partilhado quando possível |
| Endpoint `/live` | `web/live/live.css` | Perfil `live` |
| Dispositivo externo | `web/external-display/external-display.css` | Perfis `live`, `vocal`, `player`, `stage` que recebem `viewMusica` / `viewBiblia` |
| CSS partilhado (Should) | novo módulo ex. `shared/projection-layout.css` importado pelos clientes | DRY — evitar 4 cópias divergentes |

**Não alterar** o contrato WS (`viewMusica`, `viewBiblia`, `valor` HTML) salvo ajuste mínimo de markup se UX exigir wrapper semântico — preferir **só CSS** sobre HTML existente.

### 3.3 Interacção com `footerAlert` (Must)

- `footerAlert` permanece **overlay absoluto** no fundo do `#stage` (marquee CAD-188).
- Quando activo, reservar **altura mínima** no rodapé do `#conteudo` para `.rodape` não ficar por baixo do overlay (padding-bottom dinâmico ou `body.footer-alert-active`).
- Metadados da música (`.rodape`) e alerta (`footerAlert`) **coexistem**: metadados à esquerda na faixa de conteúdo; alerta em faixa full-width ab abaixo.

### 3.4 `ajustarTela` e textfill (Should / dependência)

- Layout deve recalcular faixas no resize e após `ajustarTela` (área útil `#stage`).
- **Textfill** (inventário §1, issue futura) medirá `.content` — garantir que a faixa central tem `min-height: 0` / overflow controlado para algoritmo futuro.

### 3.5 i18n

- Sem chaves novas obrigatórias (textos vêm do HTML existente).
- UX pode propor rótulos ARIA para zonas (`aria-label` opcional — Could).

## 4. Fora de escopo

- Retorno de palco (`stage-return`) — layout `.retorno-musica` / `.retorno-biblia` mantém-se.
- Textfill / auto-fonte (inventário §1) — issue separada; apenas garantir faixa `.content` mensurável.
- Temas/cores novas, fontes custom, animações de transição entre versos.
- Alterar regras de filtragem WS ou perfis de entrega.
- Compliance LGPD adicional — sem novos dados pessoais.

## 5. Critérios de aceite (testáveis)

| ID | Critério | Verificação |
|----|----------|-------------|
| CA-1 | Projectar versículo → referência visível no **topo esquerdo**; corpo abaixo, alinhado à esquerda | Comparar com `mock-biblia-3-zonas.png` |
| CA-2 | Projectar verso de louvor → letra **centrada** na faixa central; `.titulo` não ocupa espaço | Comparar com `mock-louvor-3-zonas.png` |
| CA-3 | Louvor → rodapé mostra `nome (artista)` **inferior esquerdo**, legível em 16:9 e full HD | Smoke manual |
| CA-4 | Bíblia → `.rodape` vazio não reserva faixa visível | Inspecção DOM |
| CA-5 | Prévia operador (tile Projetor) **paridade visual** com projetor para os mesmos HTML | Side-by-side |
| CA-6 | `/live` e dispositivo externo `live`/`vocal` reflectem o mesmo layout após `viewMusica`/`viewBiblia` | Smoke multi-cliente |
| CA-7 | `footerAlert` activo + louvor com rodapé → metadados e alerta **ambos visíveis**, sem sobreposição ilegível | Smoke CAD-188 |
| CA-8 | Após `ajustarTela` (preset ≠ ecrã completo), zonas permanecem dentro da área útil | DisplaysPanel + projetor |
| CA-9 | Sem regressão: fundos, vídeo, YouTube, `removeConteudo`, contraste/scrim | Regressão operador |

## 6. Métricas de sucesso

- **Legibilidade:** em UAT, 3 operadores identificam referência bíblica e créditos da música em &lt;3 s sem olhar para o monitor físico (só prévia).
- **Paridade:** diferença visual prévia vs projetor imperceptível em tipografia/alinhamento (mesmo HTML, mesmas regras CSS).

## 7. MoSCoW

| Prioridade | Item |
|------------|------|
| **Must** | Grid 3 zonas, CA-1–CA-6, CSS partilhado ou paridade explícita |
| **Must** | Ocultar `.titulo`/`.rodape` vazios |
| **Should** | CA-7 (`footerAlert`), CA-8 (`ajustarTela`), módulo CSS partilhado |
| **Could** | ARIA por zona; highlight suave na zona activa na prévia |
| **Won't** | Retorno de palco; textfill nesta entrega |

## 8. Dependências e gates

| Dependência | Tipo | Notas |
|-------------|------|-------|
| HTML `projection.ts` | Existente | Sem mudança Must |
| CAD-188 (`footerAlert`) | Funcional | CA-7 |
| CAD-136 (contraste/scrim) | Visual | Manter |
| CAD-221 (multi-prévia) | UI | Prévia usa `PreviewOutputTile` |
| Compliance | **Não aplicável** | Sem PII novo |
| Security | **Informacional** | Sem alteração de auth/superfície |

## 9. RICE

- **Reach:** todos os operadores e destinos de projeção de texto (projetor, live, externos).
- **Impact:** alto — legibilidade directa no culto.
- **Confidence:** alta — mocks do board + HTML já estruturado.
- **Effort:** médio — sobretudo CSS transversal + paridade prévia.

## 10. Desdobramento de entrega (issues filhas)

| Issue | Dono | Entrega | Bloqueia |
|-------|------|---------|----------|
| [CAD-287](/CAD/issues/CAD-287) | UXDesigner | Spec layout 3 zonas, tokens, mock HTML/CSS, decisões footerAlert vs rodapé | — |
| [CAD-289](/CAD/issues/CAD-289) | CTO | Orquestração/review implementação | CAD-287 |
| [CAD-288](/CAD/issues/CAD-288) | Frontend | CSS partilhado + paridade projetor/prévia/live/external | CAD-287 |
| [CAD-290](/CAD/issues/CAD-290) | QA | Casos CA-1–CA-9, smoke regressão | CAD-288 |

**Política de atribuição:** [CAD-243](/CAD/issues/CAD-243) — parent técnico CTO; slice IC Frontend.

## 11. Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-31 | Escopo inicial aprovado a partir da issue e mockups do board (PM) |
