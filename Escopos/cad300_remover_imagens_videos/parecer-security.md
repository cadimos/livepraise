# Parecer Security — DELETE mídia (imagens e vídeos)

**Issue:** [CAD-302](/CAD/issues/CAD-302)  
**Escopo:** [CAD-300](/CAD/issues/CAD-300) · [escopo.md](./escopo.md) §3.2  
**Data:** 2026-05-31  
**Autor:** Security Engineer (Cadimos)  
**Decisão:** **APROVADO** (gate Security satisfeito; implementação em [CAD-304](/CAD/issues/CAD-304))

---

## 1. Resumo executivo

O epic adiciona `DELETE /imagem` e `DELETE /video` com body `{ "path": "imagens/…" | "videos/…" }`, apagamento irreversível no disco e limpeza opcional de `background_rapido`. A superfície é **Broken Function-Level Authorization** + **path traversal** + **integridade parcial** (pipeline de vídeo, ficheiros derivados).

**Veredito:** desenho do escopo é adequado para implementação desde que o Backend siga os requisitos normativos abaixo. **Condição de merge obrigatória:** smoke/regressão Security (S-1–S-5) em `scripts/smoke-cad300.mjs` (ou equivalente) que falhe no código antigo e passe após o fix.

**Correcção de rota:** o servidor monta `/imagem` e `/video` (não `/api/imagem`). OpenAPI e cliente devem usar os mesmos prefixos que `PATCH /imagem/categoria` hoje.

---

## 2. Superfície e ameaça (STRIDE)

| Classe | Vetor | Blast radius | Exploitabilidade |
|--------|--------|----------------|------------------|
| **Elevation of privilege** | DELETE sem `requireOperatorAccess` | Apagar biblioteca local da igreja (`~/livepraise`) | Alta em LAN se exposto sem auth |
| **Tampering** | Path traversal (`..`, symlink, kind errado) | Apagar ficheiros fora de `imagens/` ou `videos/` | Média — mitigado por `resolveMediaRelativePath` se usado como única porta |
| **Denial of service** | DELETE em massa / durante backup | Perda de mídia; conflito com backup | Baixa — `backupModeGuard` já bloqueia DELETE mutante |
| **Information disclosure** | Erro com `home` absoluto ou stack | Revelar layout do host | Baixa — usar mensagens genéricas como PATCH existente |

**Ataques demonstráveis (pós-implementação):**

```http
DELETE /imagem/categoria
Content-Type: application/json

{"path":"imagens/slides/../../musica.db"}
```

**Esperado:** HTTP 400, `{ "error": "Ficheiro inválido" }` (ou mensagem equivalente), ficheiro intacto.

```http
DELETE /video/categoria
Host: <ip-lan-operador>
Content-Type: application/json

{"path":"videos/clip/cat/video.mp4"}
```

**Sem** `Authorization: Bearer …` **Esperado:** HTTP 401 (socket remoto ≠ loopback).

---

## 3. Lentes aplicadas

| Lente | Avaliação |
|-------|-----------|
| **OWASP API #5 Broken Function-Level Authorization** | `requireOperatorAccess` em ambos DELETE — paridade `PATCH /categoria` e `DELETE /musica/:id` |
| **OWASP API #1 BOLA / path** | Path não é ID opaco — é referência de ficheiro; **Complete Mediation** via `resolveMediaRelativePath` |
| **Least Privilege** | Papel `remote` não apaga (só `operator`/`admin` via `isStaffRole`) |
| **Fail Securely** | Inválido/inexistente → 400 genérico; pipeline `processing` → 409 sem unlink parcial |
| **Secure Defaults** | Confirmação UI obrigatória (escopo §3.1) — não substitui auth servidor |
| **Defense in Depth** | Validação path + kind fixo por router + `backupModeGuard` |

---

## 4. Requisitos normativos para [CAD-304](/CAD/issues/CAD-304)

### 4.1 Autenticação e autorização

1. Registar `api.delete('/', requireOperatorAccess, …)` em `registerMediaMutations` (ou handler dedicado) para **imagens** e **videos**.
2. **Proibido** aceitar DELETE em `GET /propriedades` (leitura pública/local mantém-se; mutação exige operador).
3. Loopback bypass (`isLocalSocket`) — **aceite** (paridade Electron); documentar em OpenAPI que LAN exige Bearer.

### 4.2 Validação de path (anti-traversal)

1. **Única** porta para resolver path: `resolveMediaRelativePath(home, kind, body.path)` com `kind` fixo do router (`'imagens'` | `'videos'`).
2. Rejeitar antes de `unlink`: retorno `null` → `jsonError(res, 400, 'Ficheiro inválido')` — **sem** ecoar path absoluto nem `home`.
3. **Não** aceitar paths derivados (thumb, `.mp4` convertido) no body do cliente — calcular apenas a partir do path validado + `mediaPathParts` / `jobKey` / `thumbRelPath` (espelhar lógica de `moveMediaFile` e listagem em `createVideoRouter`).
4. **Proibido** apagar directórios, `videos/*/thumb/` como pasta, ou ficheiros fora da categoria do item listado.

### 4.3 Vídeo — pipeline e ficheiros associados

1. Antes de qualquer `unlink`, `getVideoPipelineState(rel)` — se `status === 'processing'` → `jsonError(res, 409, '…', 'video_processing')` (copy alinhada a i18n).
2. Ordem segura: validar → bloquear se processing → apagar thumb derivada (se existir e path derivado validado) → apagar `.mp4` derivado se regra do escopo → apagar ficheiro principal → limpar `background_rapido`.
3. Em falha a meio → **não** devolver 200; preferir falha antes do primeiro unlink ou documentar best-effort (escopo exige «não apagar parcialmente» em processing; para outros erros, 500 após primeiro unlink é residual aceite).

### 4.4 Fundos rápidos

1. `UPDATE background_rapido` com match em `url`/`diretorio` normalizados (mesma forma que listagem usa) — SQL parametrizado.
2. Não expor IDs de slots em mensagens de erro.

### 4.5 Respostas e OpenAPI

1. Sucesso: `{ "status": "successo", "path": "<relativo normalizado>" }`.
2. Erros: `jsonError` existente — mensagem curta em português, `code` opcional (`video_processing`, `file_invalid`).
3. OpenAPI: adicionar `delete` em `/imagem/categoria` e `/video/categoria` **ou** paths dedicados acordados com `verify-openapi-coverage.mjs` — hoje cobre `PATCH` nos mesmos mounts; incluir `security: [bearerAuth]`, body `MediaDeleteRequest`, respostas 400/401/409.
4. Actualizar `scripts/verify-openapi-coverage.mjs` com entradas `['DELETE', '/imagem/categoria']` e `['DELETE', '/video/categoria']` (ou path final escolhido — **consistente** com Express).

### 4.6 Symlink (residual — Should, não bloqueia)

`resolveMediaRelativePath` usa `fs.statSync` sem `lstat`. Symlink dentro de `~/livepraise/imagens` apontando para fora do root é cenário de operador mal-intencionado ou FS comprometido. **Should:** `fs.lstatSync` + recusar symlinks em DELETE, ou `fs.realpath` e revalidar prefixo — follow-up opcional.

---

## 5. Risco residual (aceite MVP)

| Risco | Severidade | Notas |
|-------|------------|-------|
| Operador autenticado apaga mídia errada | Operacional | Mitigado por confirmação UI (CA-3) |
| Loopback sem token no Electron | Baixa | Superfície local; paridade existente |
| Symlink escape | Baixa | Should §4.6 |
| Sem rate limit em DELETE | Baixa | Paridade PATCH; Could futuro |
| Item na fila com `mediaPath` órfão | Baixa | Comportamento esperado escopo §3.3 |

---

## 6. Critérios de aceite Security (obrigatórios no merge CAD-304)

| ID | Critério | Verificação |
|----|----------|-------------|
| S-1 | DELETE sem auth (socket LAN simulado) → 401 | `smoke-cad300.mjs` |
| S-2 | `path` com `..` ou fora do kind → 400, disco intacto | Idem |
| S-3 | `videos/…` em `DELETE /imagem` → 400 | Idem |
| S-4 | Vídeo `processing` → 409, ficheiro intacto | Idem + `resetVideoPipelineForTests` |
| S-5 | Resposta erro não contém `getLivepraiseHome()` absoluto | Assert no body |

---

## 7. Follow-ups (não bloqueiam CAD-304)

| Item | Prioridade | Dono |
|------|------------|------|
| `lstat`/rejeitar symlinks em DELETE | Should | CTO → Backend |
| Rate limit DELETE (ex. 30/min/IP) | Could | CTO |
| Revisão diff pós-merge | Should | Security |

---

## 8. Referências

- Escopo produto: [escopo.md](./escopo.md)
- Código existente: `core/security/media-file.ts`, `server/routes/media.ts`, `server/middleware/auth.ts`, `server/services/videoPipeline.ts`
- Paridade delete: `server/routes/music.ts` (`DELETE /:codigo`)
- Paridade SSRF/import: [parecer-security.md](../cad228_importar_midia_url_fila/parecer-security.md)
