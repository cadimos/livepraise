# Parecer Compliance (LGPD) — Reconfirmação branch CAD-291

**Issue:** [CAD-292](/CAD/issues/CAD-292)  
**Epic:** [CAD-291](/CAD/issues/CAD-291) · [escopo.md](./escopo.md) §3.8  
**Parecer base:** [parecer-compliance.md](../cad238_backup_restore_ambiente/parecer-compliance.md) (CAD-238)  
**Data:** 2026-05-31  
**Autor:** Compliance Officer (Cadimos)  
**Decisão:** **APROVADO** — reutilização do parecer CAD-238 com evidência de implementação no branch actual; condicionantes Must C-1–C-6 **conformes**; follow-ups Should inalterados.

---

## 1. Resumo executivo

Delta review da implementação presente no branch (`server/backup/`, modais Settings, i18n, rotas admin) contra condicionantes C-1–C-6 do parecer [CAD-238](../cad238_backup_restore_ambiente/parecer-compliance.md). **Nenhum gap Must bloqueante** identificado face ao código actual.

**Blast radius (inalterado):** zip com grupo `database` exporta `password_hash` + `auth_sessions.token` sem cifra — titulares = operadores registados na instalação (tipicamente 1–10); exposição requer acesso ao ficheiro `.zip`.

---

## 2. Verificação C-1–C-6 (evidência branch)

| ID | Condição | Evidência | Estado |
|----|----------|-----------|--------|
| C-1 | Copy CA-11 antes de gerar zip; `privacyUnencryptedWarning` se `database` ∈ grupos | `BackupModal.vue` (painel âmbar persistente); `locales/pt-BR.json` `settings.backup.privacyTitle/Body/UnencryptedWarning` | **Conforme** |
| C-2 | `error_log` desmarcado por defeito | `BackupModal.vue` — `selected` inicial exclui `error_log` | **Conforme** |
| C-3 | Sem segredos em texto claro no manifesto | `create.ts` — manifesto só metadados; `livepraiseHome: 'livepraise'` (basename) | **Conforme** |
| C-4 | Rotas restritas a `admin` | `server/routes/backup.ts` — `requireAdminAccess`; menu Settings `v-if="isAdmin"` (`ActionBar.vue`) | **Conforme** |
| C-5 | Restore parcial não apaga grupos não seleccionados | `restore.ts` — só prefixos em `ordered`; overwrite condicionado a `confirmOverwrite` | **Conforme** |
| C-6 | Pós-restore `database`: invalidar `auth_sessions` + copy re-login | `restore.ts` — `invalidateAuthSessions()` quando destino = home live; `RestoreModal.vue` — `databaseReloginWarning`, `reloginRequired` | **Conforme** |

**CA-11:** copy visível no modal Backup sem scroll obrigatório antes do botão «Gerar backup» — **conforme** inspecção estática UI.

---

## 3. Delta vs parecer CAD-238

| Item CAD-238 | Estado branch CAD-291 |
|--------------|----------------------|
| F4 — path relativizado no manifesto (Should) | **Implementado** — `livepraiseHome: 'livepraise'` em `create.ts` |
| Copy Restore `restorePrivacyNote` (Should) | **Implementado** — `RestoreModal.vue` + i18n |
| Palavra-passe no zip AES-256 (Should) | **Pendente** — aceite; mitigado por C-1 |
| Eventos `audit_logs` backup/restore (Should) | **Pendente** — risco residual baixo |
| Hint `error_log` sensível | **Implementado** — `errorLogHint` i18n |

**Achados novos Must:** nenhum.

---

## 4. Lentes LGPD (reconfirmação)

| Lente | Achado branch | Severidade |
|-------|---------------|------------|
| Minimização (art. 6º, III) | Default sem `error_log`; restore só grupos presentes no zip | — |
| Segurança (art. 6º, VII; art. 46) | Zip não cifrado com credenciais portáteis | Alta exploitabilidade média — mitigado C-1 + Should password |
| Transparência (art. 6º, VI) | CA-11 + avisos Restore | Resolvido |
| Privacy by default | Defaults e gates admin | Adequado |
| Base legal (art. 7º, V) | Continuidade operacional igreja — inalterada vs CAD-238 | — |

---

## 5. Risco residual (pós-condicionantes)

| Risco | Nível |
|-------|-------|
| Zip sem palavra-passe perdido/roubado | Médio |
| Operador inclui `error_log` manualmente | Baixo-médio |
| Ausência de audit_logs dedicados | Baixo |
| Retenção do `.zip` pelo controlador | Baixo (copy CA-11) |

---

## 6. Follow-ups (Should — não bloqueiam gate)

| Item | Owner |
|------|-------|
| Palavra-passe no zip (AES-256) | [CTO](/CAD/agents/cto) |
| Eventos `audit_logs` backup/restore | [CTO](/CAD/agents/cto) |
| Validação QA CA-1–CA-12 | [QA](/CAD/agents/qa) após slices IC |

---

## 7. Gate de escopo §8

| Gate | Estado |
|------|--------|
| Parecer LGPD / reconfirmação branch | **APROVADO** — 2026-05-31 |
| Handoff implementação (CAD-294) | Desbloqueado **parcialmente** — aguarda gate UX [CAD-293](/CAD/issues/CAD-293) |

---

## 8. Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-31 | Reconfirmação branch — APROVADO (CAD-292) |
