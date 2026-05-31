# Parecer Security — Importar mídia na fila por URL (SSRF)

**Issue:** [CAD-229](/CAD/issues/CAD-229)  
**Escopo:** [CAD-228](/CAD/issues/CAD-228) · [escopo.md](./escopo.md) §3.4 / §3.4.1  
**Data:** 2026-05-28  
**Autor:** Security Engineer (Cadimos)  
**Decisão:** **APROVADO** (gate Security satisfeito; implementação em [CAD-232](/CAD/issues/CAD-232))

---

## 1. Resumo executivo

O epic introduz `POST /api/queue/import-url` com fetch server-side em `mode: download`. A superfície é **SSRF privilegiado** (operador autenticado, processo Node na LAN/host). A política em §3.4.1 aplica **Fail Securely**, **Complete Mediation** (validação sintáctica → DNS → IP no socket → cada redirect) e centraliza controles em `core/security/remote-fetch.ts`.

**Veredito:** desenho adequado para implementação. **CA-4** (`tests/security/remote-fetch.test.ts`) é condição de merge obrigatória.

---

## 2. Superfície e ameaça (STRIDE)

| Classe | Vetor | Blast radius | Exploitabilidade |
|--------|--------|----------------|------------------|
| **SSRF** | `mode:download` — GET com privilégios do processo | Metadata cloud (`169.254.169.254`), RFC1918/loopback na LAN do host, port scan interno | Média — requer `requireOperatorAccess` |
| **Tampering** | Redirect 302 → destino interno sem revalidação | Mesmo que SSRF | Alta se `redirect: 'follow'` cego — **mitigado** por redirects manuais (máx. 3) |
| **Information disclosure** | Logs com query (`token`, `sig`, `X-Amz-*`) | Secrets em `error-log.jsonl` | Média — redacção §3.7 / [CAD-230](/CAD/issues/CAD-230) |
| **DoS** | Stream sem limite / timeout longo | Disco `~/livepraise`, CPU | Baixa — caps 50 MB / 600 MB, 60 s |

**Ataque demonstrável (pós-implementação):**

```http
POST /api/queue/import-url
Authorization: Bearer <operador>
Content-Type: application/json

{"url":"http://169.254.169.254/latest/meta-data/","mode":"download","category":"fila"}
```

**Esperado:** HTTP 400, corpo `{ "code": "ssrf_blocked" }`, sem corpo de metadata no response.

---

## 3. Lentes aplicadas

| Lente | Avaliação |
|-------|-----------|
| **OWASP API #7 SSRF** | Denylist host + ranges IP + DNS no connect + redirects |
| **Least Privilege** | Sem cookies/Authorization no fetch; User-Agent fixo |
| **Defense in Depth** | Validação URL + DNS + socket hook + Content-Type allowlist |
| **Secure Defaults** | MVP `mode: download` (path relativo na fila) |
| **Economy of Mechanism** | Módulo único `remote-fetch.ts` reutilizável |

---

## 4. Fix exigido (classe, não instância)

1. **`core/security/remote-fetch.ts`** — `validateMediaImportUrl`, `assertSafeResolvedAddresses`, `fetchRemoteMedia`.
2. Extrair **`isPrivateIpv4`** (e equivalente IPv6) de `core/network/local-ipv4.ts` para partilha — a função actual só cobre RFC1918 e **não** inclui loopback, link-local, CGNAT `100.64.0.0/10`, nem metadata; §3.4.1 exige tabela completa.
3. **Proibido** `fetch(url, { redirect: 'follow' })` sem revalidação por hop.
4. **`tests/security/remote-fetch.test.ts`** — tabela §3.4.1 (CA-4).

### Nota de implementação (IPv6 / encoding)

- Normalizar **IPv4 decimal/octal/hex** e **IPv4-mapped IPv6** antes de aplicar ranges.
- `dns.lookup` com `{ all: true }` — rejeitar se **qualquer** A/AAAA for bloqueado.
- Hook no **connect** (não só pré-DNS) para mitigar DNS rebinding (risco residual aceite §3.4.1).

---

## 5. Risco residual (aceite MVP)

| Risco | Severidade | Notas |
|-------|------------|-------|
| Abuso de banda (URLs públicas arbitrárias) | Baixa | Operador autenticado; rate limit **Could** |
| `mode: reference` — SSRF no browser do projetor | Baixa | Não expande superfície servidor; aviso UX |
| DNS rebinding sub-ms | Baixa | Proxy egress seria follow-up |
| `http://` downgrade | Baixa | **Could:** HTTPS-only via setting |

---

## 6. Follow-ups (não bloqueiam CAD-232)

| Item | Prioridade | Dono |
|------|------------|------|
| Rate limit `import-url` (5 req/min/sessão) | Could | CTO |
| Setting HTTPS-only | Could | PM + CTO |
| Whitelist domínios igreja | Could | PM |
| Revisão de código pós-merge CAD-232 | Should | Security (diff `remote-fetch.ts` + CA-4) |

---

## 7. Critérios de aceite Security

| ID | Critério | Verificação |
|----|----------|-------------|
| S-1 | Tabela §3.4.1 → 400 `ssrf_blocked` | `tests/security/remote-fetch.test.ts` |
| S-2 | Redirect interno no hop 2+ bloqueado | Idem |
| S-3 | YouTube → 400 `youtube_use_dedicated_flow` | Idem + smoke |
| S-4 | Logs `media-url-import` sem URL integral | CA-10 + Compliance C-1 |

---

## 8. Referências

- Política normativa: [escopo.md](./escopo.md) §3.4.1 (rev. 1.1)
- Compliance: [parecer-compliance.md](./parecer-compliance.md)
- Código existente: `core/network/local-ipv4.ts` (extrair ranges), `server/routes/queue-import.ts` (padrão auth/upload)
