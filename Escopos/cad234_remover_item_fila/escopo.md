# Documento de Escopo — Remover item da fila de projeção

**Iniciativa:** CAD-234  
**Produto:** Live Praise (`1.0.0-alpha.1`)  
**Data:** 2026-05-28  
**Versão:** 1.0  
**Autor:** PM (Cadimos)  
**Status:** APROVADO — pronto para UX + implementação  
**Issue:** [CAD-234](/CAD/issues/CAD-234)

---

## 1. Objetivo (JTBD)

Quando o operador monta uma **fila em branco** (ou qualquer fila) com versos, Bíblia, imagens ou vídeos, precisa **retirar um item errado ou desactualizado** — por exemplo trocar a versão de um vídeo — **sem fechar a aba inteira** nem apagar o ficheiro da biblioteca.

**Outcome:** correção rápida da ordem/conteúdo da fila durante o ensaio ou culto; menos fricção do que «fechar aba + recriar fila + reimportar».

## 2. Contexto (as-is)

| Elemento | Estado actual |
|----------|----------------|
| Fila (strip) | `ChromeTabPanel.vue` — tiles clicáveis, drag-and-drop, sem acção de remoção por item |
| Abas | `ChromeTabs.vue` — botão **×** remove a **aba inteira** (`removeChromeTab`) |
| Preferências | `usePreferences.ts` — `addQueueItem`, `reorderQueueItemsInTab`, `moveQueueItemInTab`; **sem** `removeQueueItem` |
| Menu contextual biblioteca | `MediaTileContextMenu.vue` — padrão de clique direito já usado nos painéis Imagens/Vídeos |
| Persistência | `localStorage` (`livepraise.operator.prefs`) — só estado cliente; **não** apaga ficheiros em `~/livepraise` |
| Pedido origem | Issue [CAD-234](/CAD/issues/CAD-234): «clicar com o botão direito no verso e ter a opção de remover o trecho» |

## 3. Escopo (to-be)

### 3.1 Interacção operador

1. **Clique direito** num tile da fila (verso, Bíblia, imagem, vídeo, em branco) abre menu contextual.
2. Entrada **«Remover da fila»** (i18n) remove **apenas** esse item da lista `tab.items`.
3. Remoção **imediata**, **sem** diálogo de confirmação (paridade com fechar aba via ×).
4. **Não** remove ficheiros da biblioteca local nem cancela importações YouTube/URL — só o ponteiro na fila.
5. Se o item removido estava **activo** (`active: true`), limpar a flag; **não** enviar automaticamente `removeConteudo` ao projetor (operador mantém controlo do que está ao vivo).

### 3.2 Implementação cliente (referência para CTO)

| Área | Entrega |
|------|---------|
| Estado | `removeQueueItem(tabId: string, itemId: string)` em `usePreferences.ts` |
| UI | Menu contextual no tile da fila — reutilizar padrão visual/ARIA de `MediaTileContextMenu.vue` (posição fixa no cursor, fechar com Escape/clique fora) |
| Eventos | `@contextmenu.prevent` no `<li>` do item; **não** interferir com drag (`draggable`) — botão direito não inicia drag |
| i18n | Chaves em `locales/pt-BR.json` sob prefixo `queueItem.*` |
| Acessibilidade | `role="menu"` / `menuitem`; alvo táctil ≥44×44 se exposto em viewport touch (operador é desktop-first) |

### 3.3 Tipos de item (Must)

Remoção aplicável a todos os `QueueItemKind`: `music`, `bible`, `image`, `video`, `blank`.

### 3.4 Estados vazios

- Último item removido → strip mostra `tabs.dropHint` (já existente).
- Fila em branco com zero itens → cartão «Adicionar» (`isBlankQueue`) permanece disponível.

## 4. Fora de escopo

- Apagar ficheiro de mídia da biblioteca (`~/livepraise`) ou endpoint servidor.
- Desfazer (undo) ou lixeira temporária.
- Remoção em lote / multi-selecção.
- Atalho de teclado dedicado (Could futuro).
- Alterar projeção ao vivo ao remover item activo.
- Gate Compliance / Security — sem novos dados pessoais nem superfície de rede.

## 5. Critérios de aceite (testáveis)

| ID | Critério | Verificação |
|----|----------|-------------|
| CA-1 | Clique direito num tile de **música** → «Remover da fila» → item desaparece; persistência após reload | Smoke manual |
| CA-2 | Idem para **Bíblia**, **imagem**, **vídeo** (local e YouTube embed) e **em branco** | Smoke |
| CA-3 | Remover item **activo** → item some; **projetor não** recebe `removeConteudo` automático | Smoke + inspecção WS |
| CA-4 | Ficheiro de imagem/vídeo importado **permanece** em `~/livepraise` após remoção da fila | Inspecção filesystem |
| CA-5 | Drag-and-drop de reordenação e drop de painéis **inalterados** após entrega | Regressão |
| CA-6 | Menu fecha com Escape e clique fora; não abre ao clicar esquerdo para projectar | Smoke UX |
| CA-7 | Chaves i18n pt-BR presentes; rótulo aria no menuitem | Inspecção `locales/pt-BR.json` |
| CA-8 | Último item removido → hint de fila vazia visível | Smoke |

## 6. Métricas de sucesso

- Operador remove item errado e adiciona substituto em **&lt; 10 s** (cenário vídeo em fila em branco).
- **0** regressões nos fluxos de adicionar/reordenar fila em UAT de fumo.

## 7. MoSCoW

| Prioridade | Item |
|------------|------|
| **Must** | Menu contextual + remoção imediata, todos os `kind`, CA-1–CA-5, CA-8 |
| **Must** | i18n pt-BR |
| **Should** | Paridade visual com `MediaTileContextMenu`; CA-6–CA-7 |
| **Could** | Atalho Delete com item focado; animação de saída do tile |
| **Won't** | Confirmação modal; apagar ficheiro da biblioteca; undo |

## 8. Dependências e gates

| Gate | Dono | Bloqueia implementação |
|------|------|--------------------------|
| Copy + padrão menu contextual | [UXDesigner](/CAD/agents/uxdesigner) | **Should** — CTO pode usar copy PM se UX atrasar |
| Implementação cliente | [CTO](/CAD/agents/cto) | Após escopo (paralelo com UX) |
| Verificação | [QA](/CAD/agents/qa) | Após implementação |

**Compliance / Security:** **não aplicável** — mutação local de preferências; sem PII nova nem fetch remoto.

## 9. RICE

- **Reach:** todos os operadores que usam filas (especialmente filas em branco com mídia).
- **Impact:** médio — desbloqueia troca de versão de vídeo/slide sem recriar aba.
- **Confidence:** alta — padrão de menu contextual e remoção de aba já existem.
- **Effort:** baixo — só cliente Vue + preferências.

## 10. Desdobramento de entrega (issues filhas)

| Issue | Dono | Entrega |
|-------|------|---------|
| [CAD-235](/CAD/issues/CAD-235) | UXDesigner | Handoff menu contextual fila: copy, estados, a11y, paridade `MediaTileContextMenu` |
| [CAD-236](/CAD/issues/CAD-236) | CTO | `removeQueueItem`, menu em `ChromeTabPanel`, i18n — bloqueado por [CAD-235](/CAD/issues/CAD-235) |
| [CAD-237](/CAD/issues/CAD-237) | QA | Casos CA-1–CA-8 — bloqueado por [CAD-236](/CAD/issues/CAD-236) |

## 11. Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-28 | Escopo inicial (PM) — APROVADO para handoff UX/CTO |
