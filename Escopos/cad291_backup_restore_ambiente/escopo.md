# Documento de Escopo — Backup e restore do ambiente

**Iniciativa:** CAD-291  
**Produto:** Live Praise (`1.0.0-alpha.1`)  
**Data:** 2026-05-31  
**Versão:** 1.0  
**Autor:** PM (Cadimos)  
**Status:** EM_APROVAÇÃO — aguarda gates Compliance e UX antes de handoff CTO  
**Issue:** [CAD-291](/CAD/issues/CAD-291)

**Linhagem:** requisito de [INVENTARIO-FUNCOES.md](../../INVENTARIO-FUNCOES.md) §11. Escopo e artefactos de referência do epic anterior [CAD-238](/CAD/issues/CAD-238) em [`../cad238_backup_restore_ambiente/`](../cad238_backup_restore_ambiente/) (parecer, UX, plano QA). No branch actual existe implementação substancial (`server/backup/`, modais Settings, CLI, smoke) — **sujeita a revalidação** nos gates abaixo, não assumida como entregue.

---

## 1. Objetivo (JTBD)

Quando a igreja **muda de computador**, reinstala o sistema ou precisa **recuperar** dados após falha de disco, o administrador precisa **exportar e importar** o ambiente Live Praise de forma **selectiva** — por exemplo só repertório e base de dados, sem sobrescrever vídeos já copiados no PC novo.

**Outcome:** tempo de recuperação previsível; menos perda de trabalho (louvor, filas, utilizadores, mídia); operação segura com confirmação explícita antes de sobrescrever dados existentes.

## 2. Contexto (as-is)

| Elemento | Estado actual |
|----------|----------------|
| Dados persistentes | `~/livepraise/` (ou `LIVEPRAISE_HOME/livepraise`) — ver `server/config/paths.ts` |
| Base de dados | `~/livepraise/dsw.bd` (SQLite) — louvor, Bíblia, utilizadores, sessões, aprovações, dispositivos externos, `schema_migrations` |
| Mídia | `~/livepraise/imagens/`, `~/livepraise/videos/` |
| Temas / locales | `~/livepraise/themes/`, `~/livepraise/locales/` |
| Monitores | `~/livepraise/displays.json` |
| Fundo persistido | `~/livepraise/projection-background.json` |
| Bíblias | `~/livepraise/biblias/` |
| Log de erros | `~/livepraise/error-log.jsonl` |
| Preferências operador | `localStorage` no operador Electron — export via `collectOperatorUiFiles()` (Should; sem IPC dedicado) |
| Backup/restore no código | **Presente no branch** — `server/backup/*`, `server/routes/backup.ts`, `BackupModal`/`RestoreModal`, scripts CLI, `scripts/smoke-cad238.mjs` |
| Auth admin | Rotas sensíveis exigem papel `admin`; painel Settings segmentado por papel |

## 3. Escopo (to-be)

### 3.1 Formato do pacote

1. Ficheiro **`.zip`** com manifesto obrigatório na raiz: `backup-manifest.json`.
2. **Schema versionado** (`manifestVersion`, ex.: `1`).
3. Manifesto lista **grupos incluídos**, `createdAt`, `appVersion`, checksum opcional por grupo (Should).
4. Conteúdo por grupo em pastas estáveis, ex.: `groups/database/dsw.bd`, `groups/media_images/...`.

### 3.2 Grupos de backup (checklist)

| ID grupo | Rótulo UI (pt-BR) | Origem | Notas |
|----------|-------------------|--------|-------|
| `database` | Base de dados (louvor, utilizadores, Bíblia, sistema) | `dsw.bd` | Inclui `password_hash` — gate Compliance |
| `media_images` | Imagens locais | `imagens/**` | Pode ser grande |
| `media_videos` | Vídeos locais | `videos/**` | Progresso obrigatório para zip grande |
| `themes` | Temas personalizados | `themes/**` | |
| `locales` | Traduções personalizadas | `locales/**` | |
| `displays` | Configuração de monitores | `displays.json` | |
| `projection_state` | Fundo de projeção guardado | `projection-background.json` | Omitido se ausente |
| `biblias` | Ficheiros de Bíblia | `biblias/**` | |
| `error_log` | Registo local de erros | `error-log.jsonl` | Should — desmarcado por defeito |
| `operator_ui` | Preferências do operador | `groups/operator_ui/*.json` | Should — localStorage export |

**Default no modal Backup:** todos marcados excepto `error_log`.

### 3.3 Fluxo Backup (admin)

1. Settings → painel **«Backup e restauro»** (só `admin`).
2. Modal **Backup**: checklist §3.2 → **«Gerar backup»**.
3. Download `.zip` (browser/Electron).
4. Progresso durante geração; falha acionável (disco cheio, permissão).

### 3.4 Fluxo Restore (admin)

1. Modal **Restore**: escolher `.zip`.
2. Servidor lê manifesto — lista grupos **presentes no zip**.
3. Checklist: presentes marcados; ausentes **desabilitados** com hint «Não incluído neste backup».
4. Sobrescrever dados existentes → confirmação explícita (`confirmOverwrite`).
5. Durante restore: bloqueio de escrita (`backupMode`); banner operador/projetor (Should).
6. Reinício recomendado após `database` ou `operator_ui`.

### 3.5 Scripts CLI (paridade API)

| Script | Entrega |
|--------|---------|
| `scripts/backup-livepraise.mjs` | `--groups database,media_images` `--out ./backup.zip` |
| `scripts/restore-livepraise.mjs` | `--in ./backup.zip` `--groups database` `--target-home /tmp/lp-test` `--yes` |

### 3.6 API HTTP (admin)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/backup/preview` | Estimativa de tamanho (Should) |
| `POST` | `/api/backup/create` | Body: grupos → stream zip |
| `POST` | `/api/restore/inspect` | Multipart → manifesto + grupos |
| `POST` | `/api/restore/apply` | Body: path + grupos + `confirmOverwrite` |

Todas com `requireAdminAccess`.

### 3.7 Consistência e migrations

| Regra | Detalhe |
|-------|---------|
| BD em backup | WAL checkpoint ou parar escritas antes de copiar |
| Restore BD | Validar `schema_migrations`; recusar backup **mais novo** que app |
| Restore parcial | Grupos não seleccionados **não apagados** no destino |
| Servidor | Flag `backupMode` bloqueia rotas mutáveis excepto health |

### 3.8 Tratamento de dados (Compliance — gate obrigatório)

Ver classificação e condicionantes C-1–C-6 em [parecer-compliance.md](../cad238_backup_restore_ambiente/parecer-compliance.md) (referência CAD-238). **CAD-291 exige reconfirmação** no branch actual antes de handoff de implementação.

**Must PM:** copy de privacidade no modal (CA-11); zip contém credenciais hasheadas; `error_log` desmarcado por defeito.

## 4. Fora de escopo

- Backup automático agendado / cloud sync.
- Criptografia forte do zip sem decisão Compliance (Could).
- Export/import **só catálogo de louvor** (inventário §12) — epic separado.
- Restore de `v0.0.8` legado sem migração explícita.
- Telemetria de crashes (inventário §14).
- Sincronização remota multi-PC na LAN.

## 5. Critérios de aceite (testáveis)

| ID | Critério | Verificação |
|----|----------|-------------|
| CA-1 | Backup `database` + `media_images` gera zip com manifesto correcto | Script + inspecção zip |
| CA-2 | Restore parcial em `LIVEPRAISE_HOME` vazio → paridade BD/ficheiros | `npm run smoke:cad238` |
| CA-3 | Zip sem `media_videos` → UI restore mostra grupo **desabilitado** | Smoke UI / manual |
| CA-4 | Restore sem `confirmOverwrite` → **409/400**, destino intacto | Teste API |
| CA-5 | Com `confirmOverwrite` → só grupos seleccionados substituídos | Smoke |
| CA-6 | Backup BD durante actividade → SQLite consistente | Teste integração |
| CA-7 | Backup BD de app mais nova → restore recusa com mensagem | Teste migrations |
| CA-8 | Rotas backup/restore recusam não-`admin` | Teste auth |
| CA-9 | CLI `--groups` alinhado com IDs do manifesto | Teste script |
| CA-10 | Modais só a `admin` em Settings | Smoke UI + roles |
| CA-11 | Copy privacidade visível antes de gerar zip | Inspecção i18n |
| CA-12 | Extração rejeita paths com `..` (zip slip) | Teste segurança |

## 6. Métricas de sucesso

- Admin conclui migração **BD + louvor + imagens** para pasta de teste em **< 15 min** (excl. vídeos grandes).
- **0** perda de integridade SQLite em smoke (CA-2, CA-6).
- **0** restores acidentais sem confirmação (CA-4).

## 7. MoSCoW

| Prioridade | Item |
|------------|------|
| **Must** | Formato zip + manifesto, grupos §3.2 (excepto `error_log` default off), modais, CA-1–CA-8, CA-10–CA-12, gate Compliance |
| **Should** | Scripts CLI, progresso zip grande, `operator_ui`, `error_log` opcional, `/api/backup/preview` |
| **Could** | Palavra-passe no zip, checksum por grupo |
| **Won't** | Cloud backup, sync contínuo, restore v0.0.8 |

## 8. Dependências e gates

| Gate | Dono | Estado |
|------|------|--------|
| Parecer LGPD / reconfirmação branch | [Compliance](/CAD/agents/compliance) | **APROVADO** — [parecer reconfirmação](./parecer-compliance-reconfirmacao.md) ([CAD-292](/CAD/issues/CAD-292), 2026-05-31) |
| UX modais + a11y vs código actual | [UXDesigner](/CAD/agents/uxdesigner) | **Pendente** — issue filha |
| Orquestração técnica + slices IC | [CTO](/CAD/agents/cto) | **Aguarda gates** — [CAD-243](/CAD/issues/CAD-243) |
| Smoke CA | [QA](/CAD/agents/qa) | Após slices Backend/Frontend |

**Security (Should):** zip slip e limites — consulta [SecurityEngineer](/CAD/agents/securityengineer) se delta vs CAD-238.

## 9. RICE

- **Reach:** todas as instalações (mudança de PC, recuperação).
- **Impact:** alto — continuidade operacional da igreja.
- **Confidence:** média-alta — padrão zip/SQLite; código já presente reduz incerteza de desenho, não de QA.
- **Effort:** médio — revalidação + gaps Should vs greenfield completo.

## 10. Desdobramento de entrega (issues filhas)

| Issue | Dono | Entrega | Estado |
|-------|------|---------|--------|
| [CAD-292](/CAD/issues/CAD-292) | Compliance | Reconfirmar [parecer](../cad238_backup_restore_ambiente/parecer-compliance.md) + CA-11 no branch | **done** — [reconfirmação](./parecer-compliance-reconfirmacao.md) |
| [CAD-293](/CAD/issues/CAD-293) | UXDesigner | Validar [ux-handoff](../cad238_backup_restore_ambiente/ux-handoff.md) vs modais actuais | **todo** |
| [CAD-294](/CAD/issues/CAD-294) | CTO | Orquestração pós-gates; parent técnico slices IC | **blocked** (CAD-292, CAD-293) |
| [CAD-295](/CAD/issues/CAD-295) | Backend | `server/backup/`, API, CLI, `backupMode` — CA-1–CA-9, CA-12 | **blocked** (CAD-294) |
| [CAD-296](/CAD/issues/CAD-296) | Frontend | Settings admin, modais, i18n — CA-3, CA-10–CA-11 | **blocked** (CAD-294) |
| [CAD-297](/CAD/issues/CAD-297) | QA | Smoke CA-1–CA-12 — `npm run smoke:cad238` | **blocked** (CAD-295, CAD-296) |

## 11. Residual (Could — pós-MVP)

- Palavra-passe no zip (Should Compliance).
- IPC Electron dedicado `operator_ui` (actual: export localStorage).
- Estimativa de tamanho `/api/backup/preview` na UI.

## 12. Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-31 | Escopo inicial CAD-291 (PM) — EM_APROVAÇÃO; referência CAD-238; código branch assinalado para revalidação |
