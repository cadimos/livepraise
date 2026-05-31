# Documento de Escopo — Importar mídia na fila por URL genérica

**Iniciativa:** CAD-228  
**Produto:** Live Praise (`1.0.0-alpha.1`)  
**Data:** 2026-05-28  
**Versão:** 1.0  
**Autor:** PM (Cadimos)  
**Status:** APROVADO — gates Security ([CAD-229](/CAD/issues/CAD-229)), Compliance ([CAD-230](/CAD/issues/CAD-230)) e UX ([CAD-231](/CAD/issues/CAD-231)) assinados; implementação [CAD-232](/CAD/issues/CAD-232) concluída; UAT [CAD-233](/CAD/issues/CAD-233) em curso  
**Issue:** [CAD-228](/CAD/issues/CAD-228)

---

## 1. Objetivo (JTBD)

Quando o operador prepara o culto, precisa **adicionar imagens ou vídeos à fila de projeção** a partir de um link HTTP(S) (CDN da igreja, stock, slide hospedado) **sem descarregar manualmente** para o computador nem depender só do fluxo YouTube.

**Outcome:** tempo menor na montagem da fila; mesma fiabilidade de projeção que itens locais quando o modo «biblioteca» estiver activo.

## 2. Contexto (as-is)

| Elemento | Estado actual |
|----------|----------------|
| Modal fila | `QueueAddMediaModal.vue` — opções **ficheiro local** e **YouTube** (`postQueueUpload`, `postYoutubeImport`) |
| API importação | `server/routes/queue-import.ts` — `POST /api/queue/upload`, `POST /api/queue/youtube` (+ aliases `/video/importar/*`, `/imagem/importar/*`) |
| Modelo fila | `shared/queue-items.ts` — `mediaPath` relativo em `~/livepraise` ou `youtubeVideoId` para embed |
| Projeção | `resolveProjectionMediaUrl` já aceita path relativo **ou** URL `https://` absoluta |
| Segurança path | `core/security/media-file.ts` — validação de paths sob `imagens/` e `videos/`; **sem** política de fetch remoto |
| Inventário | `INVENTARIO-FUNCOES.md` §2 |

## 3. Escopo (to-be)

### 3.1 Fluxo operador

1. Na fila activa, «Adicionar» → nova opção **«URL de mídia»** (distinta de YouTube).
2. Operador cola URL `http://` ou `https://` e confirma importação.
3. Servidor valida URL, tipo de conteúdo e limites; responde com `QueueItem` (`image` ou `video`).
4. Item aparece no tile da fila e projecta via acções `background` / `video` existentes.

**Redireccionamento YouTube:** URLs reconhecidas por `parseYouTubeVideoId` **não** usam este endpoint — a UI mantém o passo YouTube ou devolve erro orientando o operador para «Importar vídeo do YouTube».

### 3.2 API servidor

Novo endpoint (paridade com CAD-194):

| Método | Path preferido | Alias legado |
|--------|----------------|--------------|
| `POST` | `/api/queue/import-url` | `/video/importar/url`, `/imagem/importar/url` |

**Body JSON:**

```json
{
  "url": "https://cdn.exemplo.org/slide.png",
  "category": "fila",
  "mode": "download"
}
```

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `url` | sim | HTTP(S) público; ver validações §3.4 |
| `category` | não (default `fila`) | Mesma regra que upload/YouTube |
| `mode` | não (default `download`) | `download` \| `reference` — ver §3.3 |

**Resposta sucesso** (alinhada a upload/YouTube):

```json
{
  "status": "successo",
  "mode": "download",
  "item": {
    "kind": "image",
    "label": "slide.png",
    "mediaPath": "imagens/fila/slide.png"
  }
}
```

Em `mode: reference`, `mediaPath` é a **URL absoluta https** (já suportada por `resolveProjectionMediaUrl`).

**Erros HTTP** com mensagens i18n no operador: URL inválida, scheme não permitido, tipo não suportado, timeout, tamanho excedido, SSL falhou, SSRF bloqueado, YouTube deve usar fluxo dedicado.

### 3.3 Modos de importação

| Modo | Comportamento | Prioridade |
|------|---------------|------------|
| **`download` (default)** | Servidor faz `GET` controlado, grava em `~/livepraise/{imagens\|videos}/{category}/`, devolve path relativo; vídeo dispara `scheduleVideoPipeline` como upload | **Must** MVP |
| **`reference`** | Não grava ficheiro; `mediaPath` = URL remota; projector/clientes carregam directamente | **Should** — entregar no mesmo epic se esforço baixo; senão issue filha CTO |

**Configuração futura (Could):** preferência global `queueImportUrlMode` em settings do operador; MVP usa default `download` sem ecrã de settings.

### 3.4 Validações servidor (Must)

- **Scheme:** apenas `http:` e `https:` (rejeitar `file:`, `ftp:`, `data:`, `blob:`, esquemas relativos).
- **SSRF (gate [CAD-229](/CAD/issues/CAD-229) — aprovado):** ver política completa em §3.4.1. Resumo: bloquear destinos privados/reservados/metadata **na validação sintáctica, na resolução DNS e no endereço remoto efectivo de cada hop** (incluindo redirects); módulo central `core/security/remote-fetch.ts`.
- **Redirects:** seguir no máximo **3** redirects **manuais** (não usar `redirect: 'follow'` cego); revalidar URL + DNS + IP em **cada** hop; rejeitar mudança de scheme (`https` → `http`).
- **Tamanho:** corpo máximo **50 MB** imagens, **600 MB** vídeos (paridade `express.raw` upload); abortar stream se exceder (não bufferizar corpo inteiro antes de verificar).
- **Timeout:** **60 s** por pedido (connect + transferência); **10 s** connect timeout.
- **Content-Type:** cabeçalho `Content-Type` deve ser `image/*` ou `video/*` (lista fechada + fallback por extensão do path se `application/octet-stream`); rejeitar `text/html`, `application/json`, `application/xml`, `multipart/*`.
- **Extensões aceites:** mesmas famílias que `queue-import.ts` (`IMAGE_EXT`, `VIDEO_EXT`); path final após redirects deve manter extensão suportada ou Content-Type válido.
- **Autenticação:** `requireOperatorAccess` como upload/YouTube.
- **Nome ficheiro:** `safeFileName` existente; colisão → HTTP 409 como upload.
- **Fetch:** sem cookies, sem credenciais embutidas na URL (`user:pass@`), sem headers `Authorization`/`Cookie`/`Proxy-Authorization`; `User-Agent` fixo `LivePraise-MediaImport/1.0`; desactivar compressão ambígua se facilitar sniffing de tipo.
- **YouTube:** se `parseYouTubeVideoId(url)` não for `null` → **400** com código `youtube_use_dedicated_flow` (não chamar fetch genérico).

#### 3.4.1 Política SSRF e fetch remoto (Security — CAD-229)

**Superfície:** `POST /api/queue/import-url` em `mode: download` faz `GET` server-side com privilégios do processo Node (LAN, metadata cloud, serviços internos). **Lentes:** STRIDE (SSRF → Information disclosure / Elevation), OWASP API #7 SSRF, Fail Securely, Least Privilege, Complete Mediation.

**Pré-requisitos de URL (antes de DNS):**

| Regra | Acção |
|-------|--------|
| Comprimento URL ≤ **2048** caracteres | 400 |
| Host obrigatório, sem path-only | 400 |
| Porta explícita: apenas **80** (http) ou **443** (https); omitida = default do scheme | 400 |
| Hostname em denylist literal: `localhost`, `localhost.localdomain`, `*.localhost`, `*.local`, `*.internal`, `metadata`, `metadata.google.internal` | 400 `ssrf_blocked` |
| IPv4/IPv6 literais no host: avaliar com mesmas regras de IP abaixo | 400 se bloqueado |
| Encodings alternativos de IP (decimal, octal, hex, IPv4-mapped IPv6) | normalizar e reaplicar regras |
| `userinfo` (`https://user:pass@host/`) presente | 400 (credenciais na URL proibidas) |

**Bloqueio de endereços (após `dns.lookup` / `dns.lookup` all — IPv4 + IPv6):**

Rejeitar se **qualquer** registo A/AAAA resolver para:

- Loopback: `127.0.0.0/8`, `::1`
- Privado RFC1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- Link-local / APIPA: `169.254.0.0/16`, `fe80::/10`
- Shared address space (CGNAT): `100.64.0.0/10`
- Metadata cloud: `169.254.169.254`, `fd00:ec2::254` (AWS IMDSv2 IPv6), `metadata.google.internal`
- Não roteável / reservado: `0.0.0.0/8`, `192.0.0.0/24`, `198.18.0.0/15`, `224.0.0.0/4`, `240.0.0.0/4`, `::/128`, `100::/64`, `2001:db8::/32`, `fc00::/7` (ULA), `ff00::/8`
- IPv4-mapped IPv6 que mapeia para qualquer range acima

**DNS rebinding:** validar IP **imediatamente antes** de abrir socket (hook `connect` / `lookup` customizado no cliente HTTP). Não confiar só na validação pré-DNS.

**Redirects:** máx. 3; método GET apenas; revalidar §3.4.1 completo em cada `Location`; rejeitar redirect para host diferente se porta não standard; rejeitar `//evil.com` (scheme-relative).

**`mode: reference`:** sem fetch server-side — risco SSRF **no browser** dos clientes de projeção (operador pode colar URL interna visível só na LAN). MVP aceite com aviso UX; não expande superfície do servidor. CA-7 cobre CORS, não SSRF server-side.

**Erros:** HTTP **400** com corpo `{ "code": "ssrf_blocked" \| "invalid_url" \| ... }` — mensagem genérica no operador (sem revelar qual regra falhou em produção).

**Implementação obrigatória (CTO / [CAD-232](/CAD/issues/CAD-232)):**

1. `core/security/remote-fetch.ts` — `validateMediaImportUrl(url: string): URL`, `assertSafeResolvedAddresses(ips: string[]): void`, `fetchRemoteMedia(url, limits): Promise<{ body, contentType, finalUrl }>`.
2. Reutilizar lógica IPv4 privada de `core/network/local-ipv4.ts` (extrair `isPrivateIpv4` partilhado) + tabela IPv6.
3. Testes de regressão em `tests/security/remote-fetch.test.ts` (lista abaixo).

**Casos de teste SSRF (Must — bloqueiam merge CAD-232):**

| Caso | Esperado |
|------|----------|
| `http://127.0.0.1/x.png` | 400 `ssrf_blocked` |
| `http://[::1]/x.png` | 400 |
| `http://169.254.169.254/latest/meta-data/` | 400 |
| `http://192.168.1.1/secret.mp4` | 400 |
| `http://localhost/slide.png` | 400 |
| `http://10.0.0.1/` | 400 |
| `http://2130706433/` (127.0.0.1 decimal) | 400 |
| Redirect 302 → `http://127.0.0.1/` | 400 no hop 2 |
| CDN público HTTPS válido (fixture) | 200 em smoke |
| URL YouTube | 400 `youtube_use_dedicated_flow` |

**Risco residual (aceite para MVP):**

- Operador autenticado pode forçar o servidor a descarregar URLs **públicas** arbitrárias (abuso de banda / ToS de terceiros) — mitigar com limites de tamanho/timeout; rate limit **Could** (5 req/min por sessão).
- `mode: reference` pode expor URLs internas aos browsers de projeção na LAN.
- DNS rebinding sofisticado com janela sub-ms — mitigação completa exigiria proxy egress dedicado; aceite residual baixo em deploy típico LAN com DNS confiável.
- `http://` permite downgrade em redes hostis — aceite para CDNs legados; **Could:** forçar HTTPS-only via setting.

### 3.5 UI operador

- Terceiro item no menu do modal: **«URL de mídia»** com ícone `Link2` (ou equivalente).
- Passo dedicado: campo URL, botão Importar, estados busy/erro/sucesso.
- **Preview opcional (Should):** miniatura após sucesso quando `kind === image` ou `thumbPath` disponível.
- Chaves `queueAdd.optionMediaUrl`, `queueAdd.mediaUrlHint`, erros específicos em `locales/pt-BR.json`.
- Cliente: `postMediaUrlImport` em `queue-import-api.ts` com fallback de paths como YouTube/upload.

### 3.6 Projeção e CORS

- **Download:** sem alteração — URLs servidas pelo próprio Live Praise (`/imagens/...`).
- **Reference:** browsers nos clientes de projeção podem falhar se o CDN não enviar CORS; documentar no operador (aviso tipo embed YouTube). Não bloquear MVP.
- **Cache:** sem requisito novo; reutilizar comportamento actual de `<img>` / `<video>`.

### 3.7 Observabilidade

- Falhas de fetch/registo em `core/error-log` com `source: media-url-import` (paridade `youtube-import`).
- **Proibido** persistir URL integral em `message` ou `detail` — usar `redactMediaImportUrl` (§3.8.1).

#### 3.8 Tratamento de dados e privacidade (Compliance — CAD-230)

**Superfície:** URL fornecida pelo operador autenticado; fetch server-side em `mode: download`; persistência opcional de URL absoluta em `mode: reference`. **Lentes:** LGPD art. 6º (minimização, segurança, transparência), art. 7º, V (execução de contrato/serviço à organização controladora), Privacy by design/default.

**Classificação:** dados **não obrigatórios**; URLs podem ser **confidenciais** (tokens, paths identificáveis). Não há novo cadastro de titulares.

| Regra | Acção |
|-------|--------|
| Logs `media-url-import` | Apenas host + path sem query, ou query com valores `[REDACTED]` via `redactMediaImportUrl` |
| Proibido em logs | URL integral, `userinfo`, corpo de resposta remoto, headers `Authorization`/`Cookie` |
| Fila `download` | `mediaPath` relativo (sem query) — igual upload |
| Fila `reference` | URL absoluta permitida (CDN assinado); default MVP = `download` |
| UI operador | Hint com aviso «Evite URLs com palavras-passe ou tokens na query» (`mediaUrlPrivacyNote` em [ux-handoff.md](./ux-handoff.md)) |
| Modo default | `download` (privacy by default) |

#### 3.8.1 Redacção de URL em logs (Must — CAD-232)

Implementar `core/error-log/redact-url.ts`:

```ts
// redactMediaImportUrl('https://cdn/x.png?token=abc') → 'https://cdn/x.png?token=[REDACTED]'
```

**Parâmetros de query a redigir** (lista não exaustiva, case-insensitive): `password`, `senha`, `token`, `access_token`, `api_key`, `apikey`, `secret`, `signature`, `sig`, `auth`, `authorization`, `jwt`, `session`, `credential`, `key`, e prefixos `x-amz-` (AWS presigned).

Reutilizar/estender `sanitizeErrorLogText` em `core/error-log/sanitize.ts` com a mesma lista.

**Casos de teste (CA-10 — bloqueiam merge CAD-232):**

| Caso | Esperado no log |
|------|-----------------|
| URL com `?token=secret` | `token=[REDACTED]` |
| URL com `?X-Amz-Signature=abc` | `X-Amz-Signature=[REDACTED]` |
| URL sem query sensível | host + path preservados |
| `https://user:pass@host/x` | nunca chega ao log (rejeitado em §3.4.1) |

**Risco residual (aceite MVP):**

- `mode: reference` propaga URL completa a clientes de projeção na LAN (ver §3.4.1 Security).
- PII incidental em path de URL colada pelo operador — responsabilidade do controlador (igreja); mitigado por copy.
- Auditoria global (`audit_logs`) — inventário §4, fora deste epic.

**Parecer completo:** [parecer-compliance.md](./parecer-compliance.md)

## 4. Fora de escopo

- Importar playlists inteiras ou scraping de páginas HTML (só URL directa de ficheiro de mídia).
- Autenticação OAuth em URLs remotas (headers custom, cookies).
- `file://`, `ftp://`, data URLs, magnet, HLS/DASH manifestos como «vídeo único».
- Whitelist de domínios configurável pelo utilizador (Could futuro; MVP usa validação SSRF + HTTPS).
- Alterar fluxo YouTube existente.
- Biblioteca de mídia fora da fila (painéis Imagens/Vídeos) — apenas entrada via modal da fila neste epic.
- Compliance LGPD de retenção/auditoria global (CAD separado no inventário §4).

## 5. Critérios de aceite (testáveis)

| ID | Critério | Verificação |
|----|----------|-------------|
| CA-1 | `POST /api/queue/import-url` com PNG público em `mode: download` → ficheiro em `imagens/{category}/` e item `kind: image` na fila | Smoke API + UI |
| CA-2 | MP4 público em download → item `video`, `scheduleVideoPipeline` invocado, thumb quando disponível | Smoke |
| CA-3 | URL YouTube no endpoint genérico → **400** com mensagem a usar importação YouTube | Teste API |
| CA-4 | URLs da tabela §3.4.1 (loopback, RFC1918, metadata, decimal IP, redirect interno) → **400** `ssrf_blocked` | `tests/security/remote-fetch.test.ts` |
| CA-5 | Ficheiro &gt; limite ou `Content-Type: text/html` → erro claro no operador | Teste API |
| CA-6 | Item importado → projectar na fila → acção WS `background` ou `video` com imagem/vídeo visível no projetor | Smoke manual |
| CA-7 | `mode: reference` com CDN CORS-friendly → projeção sem download local | Smoke (se entregue) |
| CA-8 | Regressão: upload local e YouTube inalterados | Regressão |
| CA-9 | `/health` e OpenAPI reflectem rota `import-url` | Docs |
| CA-10 | Log de falha `media-url-import` não contém query sensível (`token`, `sig`, `X-Amz-*`) | `tests/error-log/redact-url.test.ts` |

## 6. Métricas de sucesso

- Operador adiciona slide por URL em **&lt; 30 s** (incluindo download típico &lt; 5 MB) em LAN.
- **0** incidentes SSRF em testes de caixa negra (lista Security).
- Taxa de sucesso ≥ 95% em URLs de CDN de teste (3 domínios públicos de imagem/vídeo) em UAT.

## 7. MoSCoW

| Prioridade | Item |
|------------|------|
| **Must** | Endpoint, validações §3.4, modo `download`, UI terceira opção, CA-1–CA-6, CA-8 |
| **Should** | Modo `reference`, preview pós-import, CA-7 |
| **Could** | Preferência global de modo; whitelist domínios |
| **Won't** | Auth em URL, playlists, HLS |

## 8. Dependências e gates

| Gate | Dono | Bloqueia implementação |
|------|------|--------------------------|
| Política SSRF / superfície fetch | [SecurityEngineer](/CAD/agents/securityengineer) | **Aprovado** — [CAD-229](/CAD/issues/CAD-229) |
| Tratamento de dados / logs de URL | [Compliance](/CAD/agents/compliance) | **Aprovado** — [CAD-230](/CAD/issues/CAD-230) (C-1–C-4 verificadas pós-CAD-232) |
| Layout modal + copy | [UXDesigner](/CAD/agents/uxdesigner) | Parcial — CTO pode implementar com copy PM se UX atrasar |
| Implementação | [CTO](/CAD/agents/cto) | Após gates + escopo aprovado |

**Compliance:** fetch server-side de URLs fornecidas pelo operador; sem PII obrigatória, mas URLs podem conter tokens — redacção em logs e orientação UX «não cole links autenticados».

## 9. RICE

- **Reach:** todos os operadores que usam fila com assets online.
- **Impact:** médio — reduz fricção vs download manual.
- **Confidence:** alta — padrão já existe para upload/YouTube e `resolveProjectionMediaUrl`.
- **Effort:** médio (endpoint + validação SSRF + UI).

## 10. Desdobramento de entrega (issues filhas)

| Issue | Dono | Entrega |
|-------|------|---------|
| [CAD-229](/CAD/issues/CAD-229) | SecurityEngineer | Parecer SSRF + limites; actualizar §3.4 se necessário |
| [CAD-230](/CAD/issues/CAD-230) | Compliance | Parecer LGPD/logs; aprovar ou condicionar |
| [CAD-231](/CAD/issues/CAD-231) | UXDesigner | Copy, estados erro/sucesso, preview opcional |
| [CAD-232](/CAD/issues/CAD-232) | CTO | API `import-url`, cliente, i18n, health/OpenAPI — bloqueado por CAD-229–231 |
| [CAD-233](/CAD/issues/CAD-233) | QA | Casos CA-1–CA-9 — bloqueado por CAD-232 |

## 11. Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-28 | Escopo inicial (PM) — EM_APROVAÇÃO |
| 1.1 | 2026-05-28 | §3.4.1 política SSRF (Security CAD-229) — gate Security aprovado |
| 1.2 | 2026-05-28 | §3.8 privacidade/logs + CA-10 (Compliance CAD-230) — gate Compliance aprovado com condições |
