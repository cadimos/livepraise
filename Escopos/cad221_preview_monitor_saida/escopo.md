# Documento de Escopo — Pré-visualização por monitor de saída

**Iniciativa:** CAD-221  
**Produto:** Live Praise (`1.0.0-alpha.1`)  
**Data:** 2026-05-28  
**Versão:** 1.0  
**Autor:** PM (Cadimos)  
**Status:** APROVADO — pronto para implementação  
**Issue:** [CAD-221](/CAD/issues/CAD-221)

---

## 1. Objetivo (JTBD)

Quando o operador de mídia conduz o culto, precisa **confirmar o que cada destino de projeção está a mostrar** (projetor público, retorno de palco, transmissão `/live`, vocais, etc.) **sem olhar para os monitores físicos** nem depender de uma única «prévia local» que não reflecte filtros por perfil.

**Outcome:** menos erros de conteúdo no palco/público; operador confiante antes de «ir ao ar» e ao alternar saídas.

## 2. Contexto (as-is)

| Elemento | Estado actual |
|----------|----------------|
| UI operador | Um único `PreviewPanel` com label `preview.local` — reflecte HTML/fundo escolhidos no operador, **não** o estado filtrado por saída |
| Filtragem WS | `server/websocket/live-hub.ts` + `shared/types/live.ts` — acções entregues por `ClientRole` / `ExternalDisplayProfile` |
| Monitores | `GET /displays/config`, papéis `operator` \| `projection` \| `stage-return` \| `off` |
| Dispositivos externos | `device-presence` no hub; perfis `live`, `vocal`, `stage`, `player` |
| Inventário | `INVENTARIO-FUNCOES.md` §1 (fonte de requisitos de negócio) |

## 3. Escopo (to-be)

### 3.1 Modelo de grupos de prévia (ordem fixa)

Cada **grupo** corresponde a **um painel de prévia**, na ordem:

1. **Projetor** (`projection`) — **sempre presente**, mesmo sem segundo monitor nem janela Electron de projetor (fallback/simulação da saída pública).
2. **Segunda saída física** — só se activa: `stage-return` **ou** segundo monitor com papel `projection` (nunca ambos em duplicado na mesma posição).
3. **Endpoints externos activos** — **um painel por perfil** com ≥1 cliente ligado: `live`, `vocal`, `stage`, `player` (não um painel por dispositivo).

**Excluído das prévias:** monitor com papel `operator` (é controlo, não saída).

### 3.2 Comportamento por painel

- Reflectir o **último estado relevante** para aquele grupo após aplicar a mesma regra de entrega que `shouldDeliver` / `actionReceivableByRole` no hub (reutilizar lógica partilhada, não duplicar tabela de acções).
- Incluir **overlays** (`serviceTimer`, `footerAlert`) quando o grupo os recebe.
- Respeitar **`ajustarTela`** por `displayId` quando a saída física tiver `screenSize` distinto.
- Ao seleccionar item nos painéis (louvor, bíblia, fundo), a **prévia de edição** no operador pode continuar a mostrar o rascunho no painel do projetor (grupo 1); os restantes painéis mostram **estado ao vivo** da respectiva saída, não o rascunho — salvo decisão UX documentada em handoff.

### 3.3 UI operador

- Substituir o preview único actual por **grelha vertical ou carrossel** na coluna direita (`PREVIEW_COLUMN_WIDTH` evolui ou torna-se responsivo).
- Cada tile: rótulo legível (ex.: «Projetor», «Retorno», «Live», «Vocal»), aspect-ratio 16:9, estado vazio explícito.
- Fontes de dados: `GET /displays/config`, presença WS (`device-presence`), `GET /api/devices` (agrupar por `profile`).

### 3.4 i18n e documentação

- Chaves novas em `locales/pt-BR.json` (rótulos de grupo, estado vazio).
- Actualizar README do operador / secção relevante do inventário quando entregue.

## 4. Fora de escopo

- Prévia do monitor do operador como saída de projeção.
- Streaming público, gravação, ou SaaS.
- Alterar regras de filtragem do hub (excepto extracção para módulo partilhado se necessário para DRY).
- Textfill / auto-fonte no projetor (CAD separado).
- Compliance LGPD adicional — não há novos dados pessoais; apenas visualização local de estado já existente.

## 5. Critérios de aceite (testáveis)

| ID | Critério | Verificação |
|----|----------|-------------|
| CA-1 | Arranque só com monitor operador → **1** prévia visível (Projetor), com estado coerente (fundo/texto por defeito ou último `state-sync`) | Smoke manual / script |
| CA-2 | Operador + projetor + retorno configurados → **2** prévias físicas; conteúdos podem divergir após `viewMusica` vs `viewMusicaRetorno` | Smoke |
| CA-3 | Mesmo cenário + perfil `vocal` com 5 dispositivos → **+1** prévia «Vocal», não 5 | Smoke + presença WS simulada |
| CA-4 | Perfil `live` activo não mostra `background` na prévia live; `limparFundo` reflectido | Caso CA-R21 |
| CA-5 | `footerAlert` activo aparece nas prévias dos grupos que recebem overlay | Smoke CAD-188 |
| CA-6 | Ordem dos painéis: projetor → 2.ª física → externos na ordem `live`, `vocal`, `stage`, `player` | Inspecção UI |
| CA-7 | Papel `operator` nunca gera painel de prévia | Config displays |
| CA-8 | Sem regressão: atalhos, fila, fundos rápidos e envio ao vivo continuam funcionais | Regressão operador |

## 6. Métricas de sucesso

- **Confiança operacional:** em UAT, operador identifica conteúdo errado na saída correcta em &lt;5 s (3 cenários: só projetor; projetor+retorno; projetor+live+vocal).
- **Latência percebida:** actualização da prévia após `state-sync` / acção relevante ≤500 ms em LAN local (mesma ordem de grandeza que projetor actual).

## 7. MoSCoW

| Prioridade | Item |
|------------|------|
| **Must** | Grupos CA-1–CA-3, filtragem alinhada ao hub, prévia projetor sempre visível |
| **Must** | Rótulos i18n pt-BR |
| **Should** | Overlays CA-5, `ajustarTela` por monitor |
| **Could** | Scroll na coluna quando &gt;4 painéis; highlight do painel «em edição» |
| **Won't** | Prévia por dispositivo individual; prévia do monitor operador |

## 8. Dependências e gates

| Dependência | Tipo | Notas |
|-------------|------|-------|
| Hub / tipos live | Código existente | Extrair helper partilhado se UI e servidor divergirem |
| CAD-187 / CAD-188 | Funcional | Overlays já no protocolo |
| Compliance | **Não aplicável** | Sem PII novo |
| Security | Informacional | Sem alteração de auth; reutilizar sessão WS existente |

## 9. RICE (priorização backlog)

- **Reach:** todos os operadores multi-monitor e endpoints externos.
- **Impact:** alto — reduz erro visível ao público.
- **Confidence:** alta — requisitos derivados do inventário e código existente.
- **Effort:** médio-alto (UI + composable + sync multi-estado).

## 10. Desdobramento de entrega (issues filhas)

| Issue | Dono | Entrega | Bloqueia |
|-------|------|---------|----------|
| [CAD-222](/CAD/issues/CAD-222) | UXDesigner | Layout coluna prévia, rótulos, estados vazios, comportamento rascunho vs ao vivo | — |
| Handoff UX | `ux-handoff.md` | Spec + shell (`MultiOutputPreviewColumn`, `usePreviewGroups`) | Entregue 2026-05-28 |
| [CAD-223](/CAD/issues/CAD-223) | CTO | Modelo de grupos, composable, UI, i18n, extracção filtro partilhado | CAD-222 |
| [CAD-224](/CAD/issues/CAD-224) | QA | Casos CA-1–CA-8, actualização smoke | CAD-223 |

**Nota:** issues duplicadas [CAD-225](/CAD/issues/CAD-225)–[CAD-227](/CAD/issues/CAD-227) criadas por engano no mesmo heartbeat devem ser canceladas; usar apenas CAD-222–224.

## 11. Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-28 | Escopo inicial aprovado para implementação (PM) |
