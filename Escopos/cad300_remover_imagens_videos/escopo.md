# Documento de Escopo — Excluir imagens e vídeos da biblioteca

**Iniciativa:** CAD-300  
**Produto:** Live Praise (`1.0.0-alpha.1`)  
**Data:** 2026-05-31  
**Versão:** 1.0  
**Autor:** PM (Cadimos)  
**Status:** APROVADO — pronto para UX, Security e implementação  
**Issue:** [CAD-300](/CAD/issues/CAD-300)

---

## 1. Objetivo (JTBD)

Quando o operador gere a biblioteca local de **imagens** e **vídeos** em `~/livepraise`, precisa **eliminar ficheiros obsoletos ou errados do disco** — versão antiga de um slide, vídeo duplicado, importação falhada — **sem aceder ao sistema de ficheiros** nem depender de IT.

**Outcome:** biblioteca mais limpa; menos confusão na grelha de mídia; paridade com o fluxo já existente de **excluir música** (`WorshipPanel` + `DELETE /musica/:id`).

**Distinção obrigatória:** isto **não** é [CAD-234](/CAD/issues/CAD-234) («Remover da fila» — só ponteiro na fila, sem apagar disco).

## 2. Contexto (as-is)

| Elemento | Estado actual |
|----------|----------------|
| Painéis | `ImagesPanel.vue`, `VideosPanel.vue` — grelha com `MediaTileContextMenu` |
| Menu contextual | `MediaTileContextMenu.vue` — definir fundo inicial, alterar fundo rápido, propriedades, mudar categoria, aplicar na fila; **sem** opção de excluir |
| API mídia | `server/routes/media.ts` — listagem, propriedades, `PATCH /categoria`; **sem** `DELETE` |
| Segurança path | `core/security/media-file.ts` — `resolveMediaRelativePath`, `mediaPathParts` |
| Vídeo | Pipeline em `videoPipeline.ts`; thumb em `videos/{cat}/thumb/{base}.jpg`; possível `.mp4` derivado |
| Fundos rápidos | Tabela `background_rapido` — slots podem apontar para `url` + `diretorio` do ficheiro apagado |
| Fila | `usePreferences` — itens `image`/`video` guardam `mediaPath`; **não** sincronizados com biblioteca |
| Paridade delete | `WorshipPanel.deleteSong` — `window.confirm` + `DELETE /musica/:id` + limpeza de abas ligadas |
| Pedido origem | [CAD-300](/CAD/issues/CAD-300): «opção no botão direito… apagando do disco. Mostrar mensagem de confirmação antes da exclusão» |

## 3. Escopo (to-be)

### 3.1 Interacção operador

1. **Clique direito** num tile de imagem ou vídeo na biblioteca abre o menu contextual existente.
2. Nova entrada **«Excluir da biblioteca»** (i18n) — **abaixo** das acções actuais, visualmente **destrutiva** (classe/texto de perigo alinhado ao padrão UX).
3. Ao escolher, **diálogo de confirmação** obrigatório antes de qualquer pedido ao servidor:
   - Copy base: «Excluir «{name}»? Esta acção não pode ser desfeita.»
   - **Should:** segunda linha informando que itens na fila que referenciem este ficheiro deixarão de projectar até serem removidos ou substituídos.
4. Cancelar confirmação → **nenhuma** alteração.
5. Confirmar → `DELETE` API → tile desaparece da grelha (`@refresh`); mensagem de erro visível se falhar.
6. Vídeo em **processamento** (`pipelineStatus === 'processing'`) → opção **desactivada** ou erro claro «Aguarde o processamento terminar» (Must).

### 3.2 API servidor

Novo endpoint por tipo de mídia (paridade mutações existentes em `registerMediaMutations`):

| Método | Path | Auth |
|--------|------|------|
| `DELETE` | `/api/imagem` | `requireOperatorAccess` |
| `DELETE` | `/api/video` | `requireOperatorAccess` |

**Body JSON** (preferido) ou query `path`:

```json
{ "path": "imagens/slides/fundo.jpg" }
```

| Regra | Comportamento |
|-------|----------------|
| Validação | `resolveMediaRelativePath(home, kind, path)` — rejeitar path inválido, traversal, directórios |
| Imagem | Apagar ficheiro principal |
| Vídeo | Apagar ficheiro listado + thumb associada (`videos/{cat}/thumb/{base}.jpg`) se existir; apagar `.mp4` derivado se o listado for source não-mp4 e o mp4 existir |
| Pipeline activo | Responder `409` ou `400` com mensagem clara — **não** apagar parcialmente |
| Fundos rápidos | Limpar slots `background_rapido` cujo `url`/`diretorio` correspondam ao ficheiro apagado (url vazia ou valor por defeito empacotado — decisão técnica CTO, desde que UI não mostre thumb quebrado) |
| Resposta sucesso | `{ "status": "successo", "path": "imagens/..." }` |
| Resposta erro | JSON existente via `jsonError` |

**OpenAPI:** documentar operações em `openapi.yaml`.

### 3.3 Cliente (referência para Frontend)

| Área | Entrega |
|------|---------|
| Menu | Entrada «Excluir da biblioteca» em `MediaTileContextMenu.vue` |
| Confirmação | `window.confirm` (paridade `WorshipPanel`) ou modal a11y se UX exigir — ver handoff |
| Chamada | `fetchJson(\`${apiPrefix}/\`, { method: 'DELETE', body: JSON.stringify({ path }) })` |
| Pós-sucesso | `emit('refresh')`; `reloadQuickBackgrounds()` se slot afectado |
| i18n | Chaves `mediaContext.delete`, `mediaContext.deleteConfirm`, `mediaContext.errors.delete`, `mediaContext.errors.deleteProcessing` |
| Fila | **Não** remover automaticamente itens da fila (distinto de excluir música) — operador usa [CAD-234](/CAD/issues/CAD-234) se necessário |

### 3.4 Tipos cobertos (Must)

- Imagens locais em `~/livepraise/imagens/{categoria}/`
- Vídeos locais em `~/livepraise/videos/{categoria}/` (incl. YouTube importado para disco)
- **Won't:** URLs `https://` só-referência na fila (sem ficheiro em disco) — fora deste menu

## 4. Fora de escopo

- Exclusão em lote / multi-selecção.
- Undo ou lixeira.
- Remover item **só** da fila ([CAD-234](/CAD/issues/CAD-234)).
- Apagar categorias inteiras ou directórios.
- Excluir fundos rápidos «em branco» sem ficheiro associado.
- Sincronização automática fila ↔ biblioteca ao apagar.
- Mobile / operador remoto browser-only (desktop Electron first).

## 5. Critérios de aceite (testáveis)

| ID | Critério | Verificação |
|----|----------|-------------|
| CA-1 | Clique direito em imagem → «Excluir da biblioteca» → confirmar → ficheiro ausente em `~/livepraise` e tile desaparece | Smoke manual + filesystem |
| CA-2 | Idem para vídeo **ready** — ficheiro + thumb removidos quando aplicável | Smoke + filesystem |
| CA-3 | Cancelar confirmação → ficheiro intacto | Smoke |
| CA-4 | Vídeo em **processing** → exclusão bloqueada com feedback claro | Smoke |
| CA-5 | Fundo rápido apontando para ficheiro apagado → slot deixa de referenciar ficheiro inexistente (sem 404 na strip) | Smoke |
| CA-6 | Item na fila com `mediaPath` apagado **permanece** na fila; projeção falha graciosamente ou mostra estado vazio — **sem** crash | Smoke |
| CA-7 | Pedido sem auth operador → rejeitado | Smoke API |
| CA-8 | Path inválido / traversal → `400`, ficheiro intacto | Smoke Security |
| CA-9 | Chaves i18n pt-BR presentes | Inspecção `locales/pt-BR.json` |
| CA-10 | Drag, projectar e restantes entradas do menu contextual **inalterados** | Regressão |

## 6. Métricas de sucesso

- Operador remove ficheiro obsoleto e confirma biblioteca actualizada em **&lt; 15 s**.
- **0** regressões nos fluxos de importar, mudar categoria e fundos rápidos em UAT.

## 7. MoSCoW

| Prioridade | Item |
|------------|------|
| **Must** | Menu + confirmação + DELETE imagem/vídeo + CA-1–CA-4, CA-7–CA-9 |
| **Must** | Bloqueio durante pipeline processing |
| **Should** | Limpeza `background_rapido` (CA-5); copy sobre fila na confirmação |
| **Should** | Paridade visual destrutiva com exclusão de música |
| **Could** | Modal a11y em vez de `window.confirm`; atalho Shift+Delete |
| **Won't** | Undo; exclusão em lote; auto-limpar fila |

## 8. Dependências e gates

| Gate | Dono | Bloqueia implementação |
|------|------|------------------------|
| Copy + padrão menu destrutivo | [UXDesigner](/CAD/agents/uxdesigner) | **Should** — Frontend pode usar copy PM se UX atrasar |
| Revisão superfície DELETE (path, auth) | [SecurityEngineer](/CAD/agents/securityengineer) | **Must** antes de merge Backend |
| Orquestração / review técnico | [CTO](/CAD/agents/cto) | Parent — não implementação monolítica ([CAD-243](/CAD/issues/CAD-243)) |
| API DELETE + limpeza fundos rápidos | [Backend](/CAD/agents/backend) | Após Security (revisão) |
| Menu + confirmação + integração API | [Frontend](/CAD/agents/frontend) | Após UX (Should) |
| Verificação | [QA](/CAD/agents/qa) | Após Backend + Frontend |

**Compliance:** **não aplicável** — ficheiros de mídia local da igreja; sem novos dados pessoais nem comunicações externas. Acção destrutiva irreversível coberta por confirmação explícita (paridade música).

## 9. RICE

- **Reach:** operadores que mantêm biblioteca de slides e vídeos (alta frequência em igrejas activas).
- **Impact:** médio — reduz clutter e erros de projectar ficheiro errado.
- **Confidence:** alta — padrões existentes (`MediaTileContextMenu`, delete música, `resolveMediaRelativePath`).
- **Effort:** baixo-médio — 2 endpoints + 1 entrada de menu + confirmação.

## 10. Desdobramento de entrega (issues filhas)

| Issue | Dono | Entrega |
|-------|------|---------|
| [CAD-301](/CAD/issues/CAD-301) | UXDesigner | Handoff: copy confirmação, hierarquia menu destrutivo, estados disabled (processing) |
| [CAD-302](/CAD/issues/CAD-302) | SecurityEngineer | Parecer DELETE mídia: auth, path traversal, resposta erro, OpenAPI |
| [CAD-303](/CAD/issues/CAD-303) | CTO | Parent técnico: orquestrar slices Backend/Frontend/QA |
| [CAD-304](/CAD/issues/CAD-304) | Backend | `DELETE /imagem`, `DELETE /video`, limpeza fundos rápidos, OpenAPI — bloqueado por [CAD-302](/CAD/issues/CAD-302) |
| [CAD-305](/CAD/issues/CAD-305) | Frontend | Menu + confirmação + refresh — bloqueado por [CAD-301](/CAD/issues/CAD-301) |
| [CAD-306](/CAD/issues/CAD-306) | QA | Casos CA-1–CA-10 — bloqueado por [CAD-304](/CAD/issues/CAD-304) e [CAD-305](/CAD/issues/CAD-305) |

## 11. Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-31 | Escopo inicial (PM) — APROVADO para handoff UX / Security / implementação |
