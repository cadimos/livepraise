# Parecer Compliance (LGPD) — Importar mídia na fila por URL

**Issue:** [CAD-230](/CAD/issues/CAD-230)  
**Escopo:** [CAD-228](/CAD/issues/CAD-228) · [escopo.md](./escopo.md)  
**Data:** 2026-05-28  
**Autor:** Compliance Officer (Cadimos)  
**Decisão:** **APROVADO** — condicionantes Must C-1–C-4 verificadas pós-[CAD-232](/CAD/issues/CAD-232) (2026-05-28)

---

## 1. Resumo executivo

O epic permite ao operador autenticado importar ficheiros de mídia via URL HTTP(S) para a fila de projeção. **Não há coleta obrigatória de dados pessoais**; o risco normativo concentra-se em **URLs que o operador pode colar inadvertidamente** (tokens, identificadores em query/path) e na **persistência/propagação** dessas URLs em fila, logs e clientes de projeção na LAN.

Com as condicionantes Must abaixo (redacção centralizada, proibição de URL integral em logs, copy de privacidade no operador), o desenho está **adequado para implementação**. Risco residual **baixo** em deploy típico (igreja/LAN, operadores internos).

---

## 2. Mapa de dados (coleta → eliminação)

| Etapa | Dado | Categoria | Onde persiste | Base legal (indicativa) |
|-------|------|-----------|---------------|-------------------------|
| Entrada | URL colada pelo operador | Interno / pot. confidencial (tokens, paths com identificadores) | Memória do pedido; corpo JSON | Art. 7º, V — execução do serviço Live Praise para a organização controladora |
| Processamento `download` | Bytes do ficheiro | Conteúdo não-PII (mídia litúrgica) | `~/livepraise/{imagens\|videos}/{category}/` | Idem |
| Processamento `download` | URL (transitória) | Confidencial se com query sensível | Não deve persistir em logs | Minimização (art. 6º, III) |
| Saída fila `download` | `mediaPath` relativo | Interno | Playlist/fila (persistência existente) | Idem |
| Saída fila `reference` | URL absoluta `https://…` | Confidencial | Item da fila + WS projeção + browsers projetor | Idem; aviso UX obrigatório |
| Erro | Host + código erro (redigido) | Interno | `error-log.jsonl` (máx. 500 entradas / 512 KB) | Art. 7º, V + segurança (art. 6º, VII) |
| Terceiro | IP da igreja no CDN de origem | Não tratado pelo LP como cadastro | Logs do CDN externo | Fora do perímetro LP |

**Eliminação:** item removido da fila → deixa de propagar URL; ficheiro `download` segue política de mídia local (igual upload); entradas `error-log` expiram por trim — **sem URL integral nas novas entradas** (condicionante).

**Fora do epic (aceite):** auditoria global e retenção regulada — [INVENTARIO-FUNCOES.md](../../INVENTARIO-FUNCOES.md) §4.

---

## 3. Lentes LGPD aplicadas

| Lente | Achado | Severidade |
|-------|--------|------------|
| **Minimização (art. 6º, III)** | `mode: reference` persiste URL completa (incl. query) em `mediaPath` → visível em projetores LAN | Média (exploitabilidade baixa em LAN confiável) |
| **Segurança (art. 6º, VII)** | §3.7 exige redacção; `sanitizeErrorLogText` actual não cobre todos os parâmetros de URL assinada | **Alta** se implementação logar URL crua |
| **Transparência (art. 6º, VI)** | Handoff UX prevê `mediaUrlPrivacyNote` — falta garantir merge em `locales` antes de go-live | Média |
| **Responsabilização (art. 6º, X)** | Sem evento de auditoria dedicado a import-url (epic adia inventário §4) | Baixa (residual) |
| **Direitos do titular (art. 18)** | Feature não cria relação directa com titular; PII incidental em URL é responsabilidade do operador/controlador | N/A no produto |
| **Privacy by default** | MVP default `download` (path relativo) — **adequado** | — |

**Setorial SUSEP:** não aplicável (produto de projeção litúrgica, não seguros).

---

## 4. Achados e correções exigidas

### F1 — Logs: URL integral (art. 6º, III e VII; art. 46)

- **Fluxo:** falha em `fetchRemoteMedia` → `appendErrorLog({ source: 'media-url-import', detail: … })`.
- **Gap:** `core/error-log/sanitize.ts` redige `token`, `api_key`, `password`, etc., mas **não** cobre padrões comuns de URL assinada (`sig`, `signature`, `X-Amz-Signature`, `access_token`, `auth`, `jwt`, `session`, `credential`).
- **Blast radius:** todos os operadores com acesso a «Registo de erros» na mesma instalação; até 500 entradas retidas.
- **Correcção Must ([CAD-232](/CAD/issues/CAD-232)):**
  1. `core/error-log/redact-url.ts` — `redactMediaImportUrl(url: string): string` (host + path sem query; query redigida por chave sensível).
  2. Usar **sempre** em `media-url-import` (nunca `url` integral em `message`/`detail`).
  3. Extender `sanitizeErrorLogText` com lista alinhada a §3.8.1 do escopo.
  4. Teste `tests/error-log/redact-url.test.ts` (CA-10).

### F2 — Persistência `mode: reference` (art. 6º, III)

- **Fluxo:** `mediaPath` = URL absoluta → `resolveProjectionMediaUrl` → clientes de projeção.
- **Gap:** query com token permanece no item até remoção manual.
- **Correcção:** **aceite para MVP** com mitigações já no escopo: default `download`; copy `mediaUrlResultReference` + hint privacidade; operador instruído a não colar links autenticados. **Não** remover query em URLs assinadas de CDN (quebraria acesso) — mitigar por modo default e UX, não stripping automático.

### F3 — Transparência operador (art. 6º, VI)

- **Evidência:** [ux-handoff.md](./ux-handoff.md) §4 — `mediaUrlHint` + `mediaUrlPrivacyNote`.
- **Correcção Must ([CAD-231](/CAD/issues/CAD-231) / [CAD-232](/CAD/issues/CAD-232)):** chaves em `locales/pt-BR.json` antes de merge; hint visível no passo URL.

### F4 — Auditoria (art. 6º, X) — residual

- **Gap:** sem `audit_logs` para import-url.
- **Correcção Should (não bloqueia MVP):** evento `media_url_import` com `userId`, `mode`, `host` (sem path/query) — alinhar com inventário §4 em issue futura.

---

## 5. Condições Must (bloqueiam merge CAD-232)

| ID | Condição | Verificação |
|----|----------|-------------|
| C-1 | `redactMediaImportUrl` + uso obrigatório em logs `media-url-import` | Code review + CA-10 |
| C-2 | Extensão `sanitizeErrorLogText` conforme §3.8.1 escopo | Teste unitário |
| C-3 | Copy privacidade no passo URL (`mediaUrlPrivacyNote` / hint) | QA visual + chave i18n |
| C-4 | Nenhum log de URL com `userinfo` (`user:pass@`) — alinhado Security §3.4 | Teste + CA-10 |

---

## 6. Risco residual (pós-condicionantes)

| Risco | Nível | Notas |
|-------|-------|-------|
| Operador cola URL com PII de terceiro no path | Baixo | Controlador (igreja); hint + treino |
| `reference` expõe URL interna na LAN | Baixo | Aceite alinhado a Security §3.4.1 |
| CDN regista IP da igreja | Baixo | Fora do perímetro LP |
| Ausência de audit_logs dedicado | Baixo | Inventário §4 |

---

## 7. Follow-ups

| Item | Owner | Issue |
|------|-------|-------|
| Evento `audit_logs` para import-url | CTO | Inventário §4 (futuro) |
| Revisão retenção global mídia/logs | Compliance | Inventário §4 |

---

## 8. Verificação pós-implementação (CAD-232)

| Condição | Evidência | Resultado |
|----------|-----------|-----------|
| C-1 `redactMediaImportUrl` em `media-url-import` | `server/routes/queue-import.ts` L267–271; `tests/error-log/redact-url.test.mjs` | **PASS** |
| C-2 Sanitização em camada de persistência | `core/error-log/store.ts` → `sanitizeErrorLogText` no `detail` (defesa em profundidade; redacção primária em C-1) | **PASS** |
| C-3 Copy privacidade no passo URL | `locales/pt-BR.json` `queueAdd.mediaUrlHint` (frase tokens na query); `QueueAddMediaModal.vue` | **PASS** |
| C-4 Sem `userinfo` em logs | `validateMediaImportUrl` rejeita credenciais na URL; nunca chega ao log | **PASS** |

**Risco residual inalterado** (§6): `mode: reference`, PII incidental em path, ausência de `audit_logs` dedicado — aceite MVP.

---

## 9. Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-28 | Parecer inicial — aprovação condicionada (CAD-230) |
| 1.1 | 2026-05-28 | Verificação pós-implementação — C-1–C-4 satisfeitas; gate fechado |
