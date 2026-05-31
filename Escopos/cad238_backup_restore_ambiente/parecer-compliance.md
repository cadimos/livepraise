# Parecer Compliance (LGPD) — Backup e restore do ambiente

**Issue:** [CAD-239](/CAD/issues/CAD-239)  
**Escopo:** [CAD-238](/CAD/issues/CAD-238) · [escopo.md](./escopo.md) §3.8  
**Data:** 2026-05-28  
**Autor:** Compliance Officer (Cadimos)  
**Decisão:** **APROVADO** — condicionantes Must C-1–C-6 abaixo; palavra-passe no zip **Should** (não bloqueia MVP se copy de aviso unencrypted estiver presente)

---

## 1. Resumo executivo

O epic permite ao administrador exportar/importar um pacote `.zip` com grupos selectivos do ambiente Live Praise (`dsw.bd`, mídia, temas, preferências do operador, etc.). **O risco normativo concentra-se no grupo `database`**, que inclui identificadores de operadores, **hashes de palavra-passe** e **tokens de sessão activos** — ou seja, uma cópia portátil de credenciais de autenticação. Risco secundário no grupo `error_log` (URLs/detalhes colados) e, em menor grau, `operator_ui` (estado de filas).

Com as condicionantes Must (copy CA-11, defaults de minimização, invalidação de sessões pós-restore de BD, proibição de segredos em texto claro no manifesto), o desenho está **adequado para handoff UX/CTO**. Risco residual **médio** sem palavra-passe no zip; **baixo-médio** com zip protegido por palavra-passe (Should).

**Blast radius (zip não cifrado com `database`):** todos os operadores registados na instalação (tipicamente 1–10 titulares); categorias **identificação + credencial**; exposição por perda/roubo de USB, partilha por email/cloud não cifrado, ou cópia em PC partilhado.

---

## 2. Classificação de dados no zip

### 2.1 Grupo `database` (`dsw.bd`)

| Tabela / dado | Exemplo de conteúdo | Classificação | Categoria LGPD | Risco |
|---------------|---------------------|---------------|------------------|-------|
| `users.username` | Identificador de login local | Confidencial | Dado pessoal (identificação) | Médio |
| `users.password_hash` | Hash bcrypt/scrypt (nunca plaintext) | **Regulado** | Dado pessoal (credencial) | **Alto** — offline cracking se zip vazado |
| `users.role`, `active` | `admin`, `operator`, `remote` | Interno | Dado pessoal (atributo de acesso) | Baixo-médio |
| `auth_sessions.token` | Token de sessão activa | **Regulado** | Dado pessoal (autenticação) | **Alto** — reutilização se zip restaurado noutro host |
| `auth_sessions.user_id`, `expires_at` | Vínculo sessão↔utilizador | Confidencial | Dado pessoal | Médio |
| `approval_queue.user_name` | Nome de operador remoto | Interno | Dado pessoal (identificação) | Baixo |
| `chrome_tabs_remote.user_name` | Nome de operador | Interno | Dado pessoal (identificação) | Baixo |
| `external_devices.device_id`, `label` | ID browser + rótulo opcional | Interno | Pot. identificação de dispositivo | Baixo |
| Louvor / Bíblia / `system` | Conteúdo litúrgico, metadados | Público / Interno | Geralmente **não** PII | Baixo |

**Base legal indicativa (art. 7º, V):** execução do serviço Live Praise para a organização controladora (igreja), com finalidade de **continuidade operacional** e recuperação de ambiente — legítimo interesse documentado no escopo (JTBD §1).

### 2.2 Grupo `error_log` (`error-log.jsonl`)

| Dado | Classificação | Risco |
|------|---------------|-------|
| `message`, `detail`, `source` | Confidencial (URLs redigidas parcialmente; paths locais; possível PII incidental colada pelo operador) | Médio |
| Metadados (`ts`, `level`, `id`) | Interno | Baixo |

**Mitigação no escopo:** grupo **desmarcado por defeito** (§3.2) — alinhado a **minimização (art. 6º, III)**. Sanitização existente (`core/error-log/sanitize.ts`) reduz tokens/passwords em query, mas **não elimina** paths com identificadores ou URLs assinadas completas.

### 2.3 Grupo `operator_ui`

| Dado | Classificação | Risco |
|------|---------------|-------|
| Preferências painéis, atalhos, timer de culto | Interno | Baixo |
| Estado de filas (paths de mídia, ordem) | Interno | Baixo-médio (paths locais; URLs se `mode: reference` na fila) |

### 2.4 Demais grupos (`media_*`, `themes`, `locales`, `displays`, `biblias`, `projection_state`)

Conteúdo litúrgico e configuração técnica — **sem PII sistemática**. Classificação **Interno / Público**; risco **baixo**.

### 2.5 Manifesto (`backup-manifest.json`)

| Campo | Risco |
|-------|-------|
| `appVersion`, `createdAt`, grupos incluídos | Baixo |
| `livepraiseHome` (path informativo) | Baixo-médio — pode revelar username do SO no path |

**Proibição reforçada:** manifesto **nunca** inclui passwords, tokens ou segredos em texto claro (escopo §3.8 — já conforme).

---

## 3. Decisão — criptografia / palavra-passe no zip

| Opção | Decisão Compliance | Fundamento |
|-------|-------------------|------------|
| Zip **sem** protecção | Aceite **apenas** com copy CA-11 de aviso explícito (C-1) | Controlador (igreja) assume custódia; art. 6º, VII |
| **Palavra-passe no zip** (AES-256 via biblioteca zip standard) | **Should** — implementar no MVP se esforço ≤ 1 sprint; UX pede password quando `database` ∈ grupos seleccionados | Art. 46 — medida proporcional; zip = cópia portátil de credenciais |
| Criptografia forte com gestão de chaves separada (KMS, rotação) | **Could** — pós-MVP / cloud backup futuro | Fora do escopo Won't §4 |
| Proibir zip sem password quando `database` incluído | **Não** (não Must) — fricção operacional em igrejas com IT limitado; mitigar por copy + Should |

**Posição PM (MoSCoW Could) vs Compliance:** elevo palavra-passe no zip de **Could → Should** dado conteúdo de `password_hash` + `auth_sessions`. **Não bloqueia** gate se ficar para iteración imediata pós-MVP, desde que C-1 (aviso unencrypted) e C-6 (invalidação sessões) estejam implementados.

---

## 4. Copy obrigatório CA-11 (i18n)

Texto mínimo **Must** antes de «Gerar backup» (modal Backup, passo final ou painel persistente visível sem scroll). Chaves sugeridas em `locales/pt-BR.json`:

```json
{
  "settings": {
    "backup": {
      "privacyTitle": "Dados sensíveis no backup",
      "privacyBody": "Este ficheiro contém dados da sua igreja. Se incluir a base de dados, também leva nomes de utilizadores e credenciais (palavras-passe encriptadas). Guarde-o num local seguro, apenas em dispositivos de confiança, e elimine-o quando já não for necessário. Não envie por e-mail nem armazene em nuvem pública sem encriptação adicional.",
      "privacyUnencryptedWarning": "Este backup não está protegido por palavra-passe. Qualquer pessoa com acesso ao ficheiro pode tentar recuperar contas de operador.",
      "privacyPasswordHint": "Defina uma palavra-passe forte para o ficheiro .zip. Sem ela, ninguém consegue abrir o backup."
    }
  }
}
```

**Restore:** copy complementar (Should, não bloqueia CA-11):

- `settings.backup.restorePrivacyNote`: «Restaurar substitui os dados seleccionados neste computador. Confirme que o ficheiro veio de uma fonte de confiança.»

**Verificação CA-11:** QA inspecciona chaves i18n + presença visual no modal antes de gerar zip (CA-11).

---

## 5. Lentes LGPD aplicadas

| Lente | Achado | Severidade |
|-------|--------|------------|
| **Minimização (art. 6º, III)** | `error_log` desmarcado por defeito — **adequado** | — |
| **Segurança (art. 6º, VII; art. 46)** | Zip com `database` = credenciais portáteis sem cifra por defeito | **Alta** (exploitabilidade média — requer acesso físico ao ficheiro) |
| **Transparência (art. 6º, VI)** | Escopo prevê copy; falta texto CA-11 concreto — **corrigido neste parecer** | Média → resolvida com C-1 |
| **Responsabilização (art. 6º, X)** | Retenção/eliminação do zip = controlador (igreja) — **aceite** explícito no escopo §3.8 | Baixo (residual) |
| **Direitos do titular (art. 18)** | Operadores locais; direitos exercidos via controlador (igreja), não via feature | N/A no produto |
| **Privacy by default** | Defaults: todos grupos excepto `error_log`; restore só itens presentes no zip | **Adequado** |
| **Agentic / LLM** | Não aplicável — fluxo local admin, sem prompts | N/A |
| **Setorial SUSEP** | Não aplicável | N/A |

---

## 6. Achados e correções exigidas

### F1 — Zip com credenciais sem protecção (art. 6º, VII; art. 46)

- **Fluxo:** Backup grupo `database` → `dsw.bd` inteiro no zip.
- **Gap:** `password_hash` + `auth_sessions.token` exportáveis em ficheiro `.zip` legível por qualquer processo.
- **Blast radius:** todos os utilizadores na BD; multa/reputação **média** (ambiente LAN igreja, não SaaS multi-tenant).
- **Correcção Should:** palavra-passe no zip (AES-256). **Correcção Must (alternativa MVP):** copy `privacyUnencryptedWarning` visível quando password não implementada (C-1).

### F2 — Sessões activas após restore (art. 6º, VII)

- **Fluxo:** Restore `database` → tokens em `auth_sessions` válidos no destino.
- **Gap:** tokens do PC antigo podem funcionar no novo; zip comprometido permite hijack de sessão.
- **Correcção Must (C-6):** após restore com grupo `database`, executar `DELETE FROM auth_sessions` (ou equivalente) e forçar re-autenticação de todos os operadores. Copy no modal Restore: «Todos terão de iniciar sessão novamente.»

### F3 — `error_log` opcional (art. 6º, III)

- **Fluxo:** admin marca `error_log` manualmente.
- **Gap:** exportação de até 500 entradas com detalhes potencialmente sensíveis.
- **Correcção:** **aceite** com default desmarcado + hint na UI («Pode conter detalhes técnicos sensíveis»). Não bloqueia.

### F4 — Paths no manifesto (art. 6º, III)

- **Fluxo:** `livepraiseHome` informativo no manifesto.
- **Gap:** path pode incluir `/home/{user}/`.
- **Correcção Should:** gravar path **relativizado** ou só basename (`livepraise`) no manifesto.

### F5 — Retenção do ficheiro zip (art. 6º, V; art. 16)

- **Gap:** produto não controla ciclo de vida do `.zip` no disco do controlador.
- **Correcção:** copy CA-11 documenta responsabilidade do controlador — **aceite** (fora do perímetro LP).

---

## 7. Condições Must (bloqueiam handoff [CAD-241](/CAD/issues/CAD-241) se violadas)

| ID | Condição | Verificação |
|----|----------|-------------|
| C-1 | Copy CA-11 (`privacyTitle` + `privacyBody`) visível antes de gerar zip; se sem password no zip, também `privacyUnencryptedWarning` | QA CA-11 + inspecção i18n |
| C-2 | Grupo `error_log` **desmarcado por defeito** no modal Backup | Smoke UI |
| C-3 | Nenhum segredo em texto claro no manifesto ou grupos exportados | Code review |
| C-4 | Rotas backup/restore restritas a `admin` (CA-8) | Teste auth |
| C-5 | Restore parcial não apaga grupos não seleccionados (já no escopo CA-5) | Smoke |
| C-6 | Pós-restore de `database`: invalidar todas as sessões (`auth_sessions`) + copy de re-login | Teste integração + QA |

---

## 8. Risco residual (pós-condicionantes)

| Risco | Nível | Notas |
|-------|-------|-------|
| Zip sem palavra-passe perdido/roubado | Médio | Mitigar com Should password; controlador responsável |
| Operador inclui `error_log` com PII incidental | Baixo-médio | Default off + hint |
| `operator_ui` com URLs `reference` na fila | Baixo | Mesmo risco que operação normal |
| Retenção indefinida do zip pelo controlador | Baixo | Copy + prática organizacional |
| Ausência de audit_logs dedicados a backup/restore | Baixo | Should futuro: evento `backup_created` / `restore_applied` com `userId`, grupos (sem paths) |

---

## 9. Follow-ups

| Item | Owner | Prioridade |
|------|-------|------------|
| Palavra-passe no zip (AES-256) | CTO | Should |
| Eventos `audit_logs` backup/restore | CTO | Should (pós-MVP) |
| Path relativizado no manifesto | CTO | Should |
| Copy Restore (`restorePrivacyNote`) | UXDesigner / [CAD-240](/CAD/issues/CAD-240) | Should |

---

## 10. Gate de escopo

| Gate | Estado |
|------|--------|
| Mapa de dados §2 | **Completo** |
| Base legal por grupo | **Documentada** (art. 7º, V) |
| Decisão criptografia zip | **Should** password; Could KMS futuro |
| Copy CA-11 | **Especificado** §4 |
| Aprovação normativa | **APROVADO** com C-1–C-6 |

**Próximo passo:** [CAD-240](/CAD/issues/CAD-240) (UX handoff) e [CAD-241](/CAD/issues/CAD-241) (implementação) desbloqueiam com este parecer.

---

## 11. Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-28 | Parecer inicial — APROVADO condicionado (CAD-239) |
