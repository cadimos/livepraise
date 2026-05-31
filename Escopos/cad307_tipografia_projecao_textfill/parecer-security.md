# Parecer Security — rotas de fontes (`GET /fonts`, `GET /api/system/fonts`)

**Issue:** [CAD-309](/CAD/issues/CAD-309)  
**Escopo:** [CAD-307](/CAD/issues/CAD-307) · [escopo.md](./escopo.md) §3.3–3.4, CA-13  
**Data:** 2026-05-31  
**Autor:** Security Engineer (Cadimos)  
**Decisão:** **APROVADO** (gate Security satisfeito para desenho; implementação em [CAD-311](/CAD/issues/CAD-311))

---

## 1. Resumo executivo

O epic [CAD-307](/CAD/issues/CAD-307) adiciona fontes embutidas servidas localmente (`GET /fonts/{familia}/{ficheiro}`) e enumeração de fontes do SO (`GET /api/system/fonts`). A superfície principal é **path traversal / arbitrary file read** na rota estática e **Broken Function-Level Authorization** na API de sistema.

**Veredito:** o desenho do escopo é adequado para implementação desde que o Backend **não** monte `express.static` directo em `/fonts` (padrão actual de `/imagens`/`/videos` é insuficiente para este caso — ver §4.2). Exigir resolver centralizado com allowlist de manifesto, paridade conceptual com `resolveMediaRelativePath`.

**Condição de merge obrigatória em [CAD-311](/CAD/issues/CAD-311):** smoke/regressão Security (S-1–S-7) em `scripts/smoke-cad311.mjs` (ou equivalente) que falhe sem validação e passe após o fix.

**Auth `GET /fonts`:** leitura **pública intencional** (sem Bearer) — clientes de projeção (`/projector`, `/live`, `/vocal`, `/stage`, stage-return) carregam `@font-face` na LAN sem sessão. Blast radius limitado a ficheiros já em `~/livepraise/fonts/` e apenas entradas do manifesto.

---

## 2. Superfície e ameaça (STRIDE)

| Classe | Vetor | Blast radius | Exploitabilidade |
|--------|--------|----------------|------------------|
| **Information disclosure** | Path traversal em `GET /fonts` | Leitura de ficheiros arbitrários sob `~/livepraise` ou fora do home | Alta se usar `express.static` sem allowlist |
| **Information disclosure** | `GET /api/system/fonts` sem auth | Fingerprint do SO (fontes instaladas) a qualquer cliente LAN | Média |
| **Tampering** | Symlink em `~/livepraise/fonts/` | Servir alvo fora do directório de fontes | Baixa — operador local ou FS comprometido |
| **Denial of service** | Pedidos em massa a `/fonts` | CPU/disco (fontes são pequenas) | Baixa — Could rate-limit futuro |

**Ataques demonstráveis (pós-implementação):**

```http
GET /fonts/roboto/../../musica.db HTTP/1.1
Host: <ip-lan>
```

**Esperado:** HTTP 400 ou 404 genérico; **não** devolver bytes de `musica.db`.

```http
GET /fonts/roboto/secret.woff2 HTTP/1.1
Host: <ip-lan>
```

Com ficheiro existente no disco mas **ausente** do `manifest.json`:

**Esperado:** HTTP 404 — manifesto é allowlist (Minimize Attack Surface).

```http
GET /api/system/fonts HTTP/1.1
Host: <ip-lan>
```

**Sem** `Authorization: Bearer …` **Esperado:** HTTP 401 (socket remoto ≠ loopback).

---

## 3. Lentes aplicadas

| Lente | Avaliação |
|-------|-----------|
| **OWASP API #1 BOLA / path** | Path de ficheiro não é ID opaco; **Complete Mediation** via resolver único + manifesto |
| **OWASP API #5 Broken Function-Level Authorization** | `GET /api/system/fonts` exige `requireOperatorAccess`; `GET /fonts` público por requisito funcional |
| **Least Privilege** | Apenas ficheiros listados no manifesto; API de sistema só staff |
| **Fail Securely** | Inválido/traversal → 400/404 genérico; sem ecoar `home` absoluto |
| **Secure Defaults** | Sem CDN externo (escopo §3.3); sync só de `resources/fonts/` |
| **Defense in Depth** | `isSafePathSegment` + manifest allowlist + prefixo `path.resolve` + extensão allowlist |
| **Economy of Mechanism** | Um módulo `core/security/bundled-font.ts`; rota Express fina |

---

## 4. Requisitos normativos para [CAD-311](/CAD/issues/CAD-311)

### 4.1 `GET /fonts/{familia}/{ficheiro}` — resolver e rota

1. **Proibido** `app.use('/fonts', express.static(...))` sem validação por pedido.
2. Criar **`resolveBundledFontPath(home, familia, fileName)`** em `core/security/bundled-font.ts` (ou nome equivalente), espelhando a estrutura de `resolveMediaRelativePath`:
   - `familia`: `isSafePathSegment(familia)` — ids do manifesto (`roboto`, `source-sans-3`, …).
   - `fileName`: `path.basename(fileName)`; rejeitar se `fileName !== raw` ou contiver `..`.
   - Extensão allowlist: `.woff2`, `.woff`, `.ttf`, `.otf` (case-insensitive).
   - **Allowlist de manifesto:** `fileName` deve constar em `manifest.json` para essa família (carregar manifesto uma vez; cache em memória aceite).
   - Root: `path.resolve(path.join(home, 'fonts', familia))`; ficheiro resolvido deve estar sob esse root (`startsWith` + `path.sep`).
   - Existência: `fs.existsSync` + `fs.statSync(...).isFile()` — paridade `media-file.ts`.
3. Handler Express dedicado (ex.: `createFontsRouter()`):
   - `GET /:familia/:fileName` → chamar resolver; 404 se `null`; `res.sendFile` com callback de erro genérico.
   - **Sem** `requireOperatorAccess` — público para `@font-face` (paridade `/themes/:id/assets/:filename`).
4. Montagem: `app.use('/fonts', createFontsRouter())` **antes** do static catch-all `/`.

### 4.2 MIME, cache e cabeçalhos

1. `Content-Type` por extensão:
   - `.woff2` → `font/woff2`
   - `.woff` → `font/woff`
   - `.ttf` → `font/ttf`
   - `.otf` → `font/otf`
2. `Cache-Control: public, max-age=31536000, immutable` aceite (fontes versionadas no pacote).
3. `Access-Control-Allow-Origin: *` **opcional** — só se `@font-face` cross-origin for necessário; default same-origin suficiente para MVP.
4. Respostas de erro: corpo mínimo ou vazio; **nunca** incluir `getLivepraiseHome()` nem stack.

### 4.3 Sync e superfície em disco

1. Sync de arranque copia **apenas** de `resources/fonts/` → `~/livepraise/fonts/` (escopo §3.3).
2. **Won't (MVP):** upload de fontes pelo utilizador — reduz superfície.
3. Se operador colocar ficheiro extra manualmente em `~/livepraise/fonts/`, manifesto **ainda** bloqueia serviço (allowlist).

### 4.4 `GET /api/system/fonts` — auth e payload

1. Registar em `createSystemRouter()` (ou router dedicado): `api.get('/fonts', requireOperatorAccess, …)`.
2. **Proibido** expor caminhos absolutos do SO, paths de ficheiros `.ttf`, ou metadados de licença.
3. Payload mínimo sugerido:

```json
{
  "status": "successo",
  "items": [{ "family": "Arial", "localizedName": "Arial" }]
}
```

4. Deduplicar e ordenar por `family` (locale `pt-BR` ou `undefined`).
5. Loopback bypass via `isLocalSocket` — **aceite** (paridade `requireOperatorAccess` / Electron).
6. **Rate limit:** não bloqueia merge MVP; **Could** follow-up (30 req/min/IP).

### 4.5 OpenAPI e cobertura

1. Documentar `GET /fonts/{familia}/{fileName}` — **sem** `security: bearerAuth` (rota pública).
2. Documentar `GET /api/system/fonts` com `security: [bearerAuth]`.
3. Actualizar `scripts/verify-openapi-coverage.mjs` com entradas correspondentes.

### 4.6 Licenças OFL (`resources/fonts/README.md`)

Requisito de **compliance**, não de controlo de acesso. Security **não bloqueia** merge por README ausente, mas Backend **Must** incluir créditos antes de release (escopo §3.3). Verificar origem dos binários em `resources/fonts/` (supply chain — pacotes oficiais OFL/Apache).

### 4.7 Symlink (residual — Should, não bloqueia)

`resolveMediaRelativePath` usa `statSync` sem `lstat`. **Should:** `lstatSync` + recusar symlinks em `resolveBundledFontPath`, ou `realpath` + revalidar prefixo — follow-up partilhado com mídia ([CAD-302](/CAD/issues/CAD-302) §4.6).

---

## 5. Anti-padrão explícito

| Padrão | Risco | Decisão |
|--------|-------|---------|
| `express.static(home + '/fonts')` | Serve qualquer ficheiro colocado no directório, incluindo traversal se mal configurado | **Rejeitar** |
| Validar só `..` sem manifesto | Ficheiro arbitrário `.woff2` dropado no disco torna-se público | **Rejeitar** |
| Auth Bearer em `GET /fonts` | Quebra `@font-face` em `/live`, `/vocal`, projetor browser | **Rejeitar** |
| `GET /api/system/fonts` público | Enumeração SO anónima na LAN | **Rejeitar** |

---

## 6. Risco residual (aceite MVP)

| Risco | Severidade | Notas |
|-------|------------|-------|
| Fontes bundled são públicos na LAN | Baixa | Conteúdo OFL; requisito funcional CA-7 |
| Operador autenticado vê lista de fontes SO | Baixa | Dado operacional; auth staff |
| Symlink escape | Baixa | Should §4.7 |
| Sem rate limit em `/fonts` | Baixa | Ficheiros pequenos; Could futuro |
| `express.static` em `/imagens`/`/videos` sem manifesto | Média (outro epic) | Fora de escopo CAD-307; não replicar em `/fonts` |

---

## 7. Critérios de aceite Security (obrigatórios no merge CAD-311)

| ID | Critério | Verificação |
|----|----------|-------------|
| S-1 | `GET /fonts/roboto/../../musica.db` → 400/404, disco intacto | `smoke-cad311.mjs` |
| S-2 | Ficheiro no disco mas fora do manifesto → 404 | Idem |
| S-3 | `familia` inválida (`../`, `foo/bar`) → 400/404 | Idem |
| S-4 | Extensão inválida (`.exe`, `.json`) → 400/404 | Idem |
| S-5 | Fonte válida do manifesto → 200 + `Content-Type` correcto | Idem |
| S-6 | `GET /api/system/fonts` sem auth (socket LAN) → 401 | Idem |
| S-7 | Resposta erro não contém path absoluto de `getLivepraiseHome()` | Assert no body |

CA-13 do produto ([escopo §5](./escopo.md)) coberto por **S-1** e **S-3**.

---

## 8. Follow-ups (não bloqueiam CAD-311)

| Item | Prioridade | Dono |
|------|------------|------|
| `lstat`/rejeitar symlinks em resolver de fontes | Should | CTO → Backend |
| Rate limit `GET /api/system/fonts` | Could | CTO |
| Revisão diff pós-merge CAD-311 | Should | Security |
| Harmonizar `/imagens`/`/videos` static com resolver (dívida técnica) | Could | CTO |

---

## 9. Referências

- Escopo produto: [escopo.md](./escopo.md)
- Paridade path: `core/security/media-file.ts`, `core/security/safe-segment.ts`, `core/security/media-category.ts`
- Paridade rota parametrizada: `server/routes/themes.ts` (`/:themeId/assets/:filename`)
- Auth operador: `server/middleware/auth.ts` (`requireOperatorAccess`)
- Parecer anterior (DELETE mídia): [parecer-security.md](../cad300_remover_imagens_videos/parecer-security.md)
