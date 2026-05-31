# Documento de Escopo — Backup e restore do ambiente

**Iniciativa:** CAD-238  
**Produto:** Live Praise (`1.0.0-alpha.1`)  
**Data:** 2026-05-28  
**Versão:** 1.2  
**Autor:** PM (Cadimos)  
**Status:** ENTREGUE — gates Compliance/UX/QA concluídos; smoke [CAD-242](/CAD/issues/CAD-242) PASS  
**Issue:** [CAD-238](/CAD/issues/CAD-238)

---

## 1. Objetivo (JTBD)

Quando a igreja **muda de computador**, reinstala o sistema ou precisa **recuperar** dados após falha de disco, o administrador precisa **exportar e importar** o ambiente Live Praise de forma **selectiva** — por exemplo só repertório e base de dados, sem sobrescrever vídeos já copiados no PC novo.

**Outcome:** tempo de recuperação previsível; menos perda de trabalho (louvor, filas, utilizadores, mídia); operação segura com confirmação explícita antes de sobrescrever dados existentes.

## 2. Contexto (as-is)

| Elemento | Estado actual |
|----------|----------------|
| Dados persistentes | `~/livepraise/` (ou `LIVEPRAISE_HOME/livepraise`) — ver `server/config/paths.ts` |
| Base de dados | `~/livepraise/dsw.bd` (SQLite) — louvor, Bíblia, utilizadores (`users`), sessões, aprovações, dispositivos externos, `schema_migrations` |
| Mídia | `~/livepraise/imagens/`, `~/livepraise/videos/` |
| Temas / locales | `~/livepraise/themes/`, `~/livepraise/locales/` (`core/themes/resolve.ts`, `core/locales/resolve.ts`) |
| Monitores | `~/livepraise/displays.json` (`electron/displays/persistence.ts`) |
| Fundo persistido | `~/livepraise/projection-background.json` (`core/live-state/persistence.ts`) |
| Bíblias | `~/livepraise/biblias/` (config + ficheiros SQLite de traduções) |
| Log de erros | `~/livepraise/error-log.jsonl` (`core/error-log/store.ts`) |
| Preferências operador | `localStorage` no processo Electron — chaves `livepraise.operator.prefs`, `.shortcuts`, alertas e timer de culto |
| Export/import louvor isolado | Inventário §12 — **não implementado**; distinto deste epic (pacote de catálogo vs ambiente completo) |
| Backup/restore | **Inexistente** — requisito em [INVENTARIO-FUNCOES.md](../../INVENTARIO-FUNCOES.md) §13 |
| Auth admin | Rotas sensíveis exigem papel `admin` ou operador em LAN; UI de settings já segmenta painéis por papel |

## 3. Escopo (to-be)

### 3.1 Formato do pacote

1. Ficheiro **`.zip`** com manifesto obrigatório na raiz: `backup-manifest.json`.
2. **Schema versionado** (`manifestVersion`, ex.: `1`) para evolução futura sem quebrar restores antigos.
3. Manifesto lista **grupos incluídos**, `createdAt`, `appVersion` (package.json), `livepraiseHome` relativo (informativo), checksum opcional por grupo (Should).
4. Conteúdo por grupo em pastas estáveis dentro do zip, ex.: `groups/database/dsw.bd`, `groups/media_images/...`.

### 3.2 Grupos de backup (checklist)

| ID grupo | Rótulo UI (pt-BR) | Origem | Notas |
|----------|-------------------|--------|-------|
| `database` | Base de dados (louvor, utilizadores, Bíblia, sistema) | `dsw.bd` | Inclui `password_hash` — gate Compliance |
| `media_images` | Imagens locais | `imagens/**` | Pode ser grande |
| `media_videos` | Vídeos locais | `videos/**` | Pode ser muito grande; progresso obrigatório |
| `themes` | Temas personalizados | `themes/**` | |
| `locales` | Traduções personalizadas | `locales/**` | |
| `displays` | Configuração de monitores | `displays.json` | |
| `projection_state` | Fundo de projeção guardado | `projection-background.json` | Opcional no backup; omitido se ficheiro ausente |
| `biblias` | Ficheiros de Bíblia | `biblias/**` | |
| `error_log` | Registo local de erros | `error-log.jsonl` | Should — pode conter detalhes sensíveis |
| `operator_ui` | Preferências do operador (filas, painéis, atalhos) | Export Electron → `groups/operator_ui/*.json` | Não está em `~/livepraise` hoje — ver §3.6 |

**Default no modal Backup:** todos os grupos **marcados** excepto `error_log` (desmarcado por defeito — minimização).

### 3.3 Fluxo Backup (admin)

1. Settings → novo painel ou secção **«Backup e restauro»** (só `admin`).
2. Modal **Backup**: checklist de grupos (§3.2) → botão **«Gerar backup»**.
3. Diálogo nativo **Guardar como…** (Electron `dialog.showSaveDialog`) — destino `.zip` escolhido pelo utilizador.
4. Durante geração: indicador de progresso; servidor em modo **só leitura** ou cópia consistente da BD (WAL checkpoint — ver §3.7).
5. Sucesso: mensagem com tamanho do ficheiro e grupos incluídos; falha: erro acionável (disco cheio, permissão).

### 3.4 Fluxo Restore (admin)

1. Modal **Restore**: escolher ficheiro `.zip` (diálogo abrir).
2. Servidor **lê manifesto** sem extrair tudo — lista grupos **presentes no zip**.
3. Segunda checklist:
   - Itens **no zip** → marcados por defeito.
   - Itens **ausentes no zip** → visíveis mas **desabilitados** (não seleccionáveis), com hint «Não incluído neste backup».
4. Se destino já tem dados nos grupos seleccionados → diálogo de **confirmação explícita** (sobrescrever).
5. Durante restore: **bloquear escrita** (API 503 ou flag global); operador e projetor informados (banner).
6. Aplicar por grupo na ordem: `database` por último entre grupos que dependem de paths, ou **primeiro** com validação de migrations — ver §3.7.
7. Reinício recomendado do servidor/Electron após restore de `database` ou `operator_ui`.

### 3.5 Scripts CLI (paridade API)

| Script | Entrega |
|--------|---------|
| `scripts/backup-livepraise.mjs` | `--groups database,media_images` `--out ./backup.zip` |
| `scripts/restore-livepraise.mjs` | `--in ./backup.zip` `--groups database` `--target-home /tmp/lp-test` `--yes` |

Mesma biblioteca core (`core/backup/` ou `server/backup/`) usada por rotas HTTP e CLI.

### 3.6 API HTTP (admin)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/backup/preview` | Body: grupos → estimativa de tamanho (Should) |
| `POST` | `/api/backup/create` | Body: grupos → stream zip ou path temporário + download |
| `POST` | `/api/restore/inspect` | Multipart ou path → manifesto + grupos disponíveis |
| `POST` | `/api/restore/apply` | Body: path zip + grupos + `confirmOverwrite` |

Todas com `requireAdminAccess` (novo middleware ou extensão de `requireOperatorAccess` restrita a `admin`).

**Electron:** preferências `operator_ui` exportadas/importadas via IPC (`backup:exportOperatorState` / `backup:importOperatorState`) chamado pela UI antes/depois do zip de servidor, ou ficheiro `operator_ui.json` embutido no zip pelo processo principal.

### 3.7 Consistência e migrations

| Regra | Detalhe |
|-------|---------|
| BD em backup | `PRAGMA wal_checkpoint(FULL)` ou parar escritas antes de copiar `dsw.bd` |
| Restore BD | Validar `schema_migrations` vs migrations embarcadas; recusar se backup **mais novo** que app (mensagem clara) |
| Restore parcial | Grupos não seleccionados **não são apagados** no destino |
| Servidor | Flag `backupMode` bloqueia rotas mutáveis excepto health durante restore |

### 3.8 Tratamento de dados (Compliance — gate obrigatório)

| Dado | Classificação | Risco |
|------|---------------|-------|
| Tabela `users` | Identificação + credencial (`password_hash`) | Alto — ficheiro zip = cópia de credenciais |
| `auth_sessions` | Sessões activas | Médio |
| `error-log.jsonl` | Pode conter URLs/detalhes colados | Médio |
| Mídia / louvor | Conteúdo litúrgico, geralmente não PII | Baixo |
| `operator_ui` | Estado de filas, preferências | Baixo-médio |

**Requisitos PM para Compliance (Must antes de implementação):**

- Copy no modal: zip contém dados da igreja; guardar em local seguro; não enviar por email não cifrado.
- **Proibido** incluir passwords em texto claro no zip (já é hash na BD).
- Avaliar se backup deve suportar **palavra-passe no zip** (Should) — decisão Compliance.
- Retenção e eliminação do ficheiro — responsabilidade do controlador (igreja).

**Parecer:** [parecer-compliance.md](./parecer-compliance.md) — **APROVADO** condicionado (C-1–C-6) · [CAD-239](/CAD/issues/CAD-239) `done` 2026-05-28.

### 3.9 Segurança técnica (Security — consulta Should)

- Validar path do zip (sem traversal na extração).
- Limite de tamanho upload restore (configurável; default alinhado 600MB+ para vídeos ou streaming).
- Rate limit: 1 restore / 5 min por sessão (Could).
- Smoke SSRF não aplicável; superfície local admin.

## 4. Fora de escopo

- Backup automático agendado / cloud sync (Could futuro).
- Criptografia forte do zip sem decisão Compliance (Could).
- Export/import **só catálogo de louvor** (inventário §12) — epic separado.
- Replicação multi-site ou alta disponibilidade.
- Restore de versão `v0.0.8` legado sem migração explícita.
- Telemetria de crashes (inventário §14).
- Sincronização remota entre PCs na LAN.

## 5. Critérios de aceite (testáveis)

| ID | Critério | Verificação |
|----|----------|-------------|
| CA-1 | Backup com grupos `database` + `media_images` gera zip com manifesto correcto | Script + inspecção zip |
| CA-2 | Restore parcial só desses grupos num `LIVEPRAISE_HOME` vazio → ficheiros e contagem BD igual à origem | Smoke `scripts/smoke-cad238.mjs` |
| CA-3 | Zip sem grupo `media_videos` → UI restore mostra `media_videos` **desabilitado** | Smoke UI |
| CA-4 | Restore com dados existentes sem `confirmOverwrite` → **409/400** sem alterar destino | Teste API |
| CA-5 | Com `confirmOverwrite` → grupos seleccionados substituídos; não seleccionados intactos | Smoke |
| CA-6 | Backup de BD durante actividade → ficheiro SQLite abre e `schema_migrations` consistente | Teste integração |
| CA-7 | Backup BD de app **mais nova** que destino → restore recusa com mensagem de versão | Teste migrations |
| CA-8 | Rotas backup/restore recusam utilizador não-`admin` | Teste auth |
| CA-9 | CLI `--groups` alinhado com mesmos IDs do manifesto | Teste script |
| CA-10 | Modal Backup/Restore acessível só a `admin` em settings | Smoke UI + roles |
| CA-11 | Copy de privacidade visível antes de gerar zip (Compliance) | Inspecção i18n |
| CA-12 | Extração zip rejeita paths com `..` (zip slip) | Teste segurança |

## 6. Métricas de sucesso

- Admin conclui migração **BD + louvor + imagens** para pasta de teste em **&lt; 15 min** (excl. vídeos grandes).
- **0** perda de integridade SQLite em smoke automatizado (CA-2, CA-6).
- **0** restores acidentais sem confirmação (CA-4).

## 7. MoSCoW

| Prioridade | Item |
|------------|------|
| **Must** | Formato zip + manifesto, grupos §3.2 (excepto `error_log`), modais Backup/Restore, CA-1–CA-8, CA-10–CA-12 |
| **Must** | Gate Compliance + copy privacidade (CA-11) |
| **Should** | Scripts CLI, progresso para zip grande, export `operator_ui`, `error_log` opcional |
| **Could** | Estimativa de tamanho, palavra-passe no zip, checksum por grupo |
| **Won't** | Cloud backup, sync contínuo, restore v0.0.8 |

## 8. Dependências e gates

| Gate | Dono | Estado |
|------|------|--------|
| Parecer LGPD / tratamento zip | [Compliance](/CAD/agents/compliance) | **Concluído** — [CAD-239](/CAD/issues/CAD-239) · [parecer-compliance.md](./parecer-compliance.md) |
| UX modais + estados + a11y | [UXDesigner](/CAD/agents/uxdesigner) | **Em curso** — [CAD-240](/CAD/issues/CAD-240) |
| Core backup + API + Electron | [CTO](/CAD/agents/cto) | **Aguarda UX** — [CAD-241](/CAD/issues/CAD-241) |
| Smoke CA | [QA](/CAD/agents/qa) | Após CTO — [CAD-242](/CAD/issues/CAD-242) |

**Security:** consulta Should em [SecurityEngineer](/CAD/agents/securityengineer) — zip slip e limites (CA-12).

## 9. RICE

- **Reach:** todas as instalações (mudança de PC, recuperação).
- **Impact:** alto — desbloqueia continuidade operacional da igreja.
- **Confidence:** média-alta — padrões conhecidos (zip, SQLite copy); risco em `operator_ui` + tamanho de vídeos.
- **Effort:** médio-alto — core + API + Electron + UI + smokes.

## 10. Desdobramento de entrega (issues filhas)

| Issue | Dono | Entrega | Estado |
|-------|------|---------|--------|
| [CAD-239](/CAD/issues/CAD-239) | Compliance | [parecer-compliance.md](./parecer-compliance.md) + CA-11 | **done** |
| [CAD-240](/CAD/issues/CAD-240) | UXDesigner | [ux-handoff.md](./ux-handoff.md) + mock | **done** |
| [CAD-241](/CAD/issues/CAD-241) | CTO | Orquestração / parent técnico ([CAD-243](/CAD/issues/CAD-243)) | **done** |
| [CAD-245](/CAD/issues/CAD-245) | Backend | `server/backup/`, API, CLI, `backupMode` | **done** |
| [CAD-246](/CAD/issues/CAD-246) | Frontend | Modais Settings admin, i18n, `useBackupRestore` | **done** |
| [CAD-242](/CAD/issues/CAD-242) | QA | Smoke CA-1–CA-12 — `npm run smoke:cad238` PASS | **done** |

## 11. Residual (Could — fora do fecho do epic)

- Palavra-passe no zip (Should Compliance) — não bloqueou MVP
- IPC Electron `operator_ui` export/import — Should
- `POST /api/backup/preview` estimativa de tamanho — Should

## 12. Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-28 | Escopo inicial (PM) — EM_APROVAÇÃO, aguarda Compliance |
| 1.1 | 2026-05-28 | Gate Compliance assinado ([CAD-239](/CAD/issues/CAD-239)); status APROVADO condicionado C-1–C-6; §8–§10 actualizados |
| 1.2 | 2026-05-28 | Epic entregue — filhas done, QA PASS; §10 slices IC; §11 residual Could |
