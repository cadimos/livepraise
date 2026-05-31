# Plano de QA — Backup e restore do ambiente

**Issue:** [CAD-242](/CAD/issues/CAD-242)  
**Epic:** [CAD-238](/CAD/issues/CAD-238)  
**Escopo:** [escopo.md](./escopo.md) v1.0  
**Smoke automatizado:** `scripts/smoke-cad238.mjs` (`npm run smoke:cad238`)  
**Última actualização:** 2026-05-28 (QA)

---

## Estado

| Gate | Issue | Estado | Impacto QA |
|------|-------|--------|------------|
| Compliance | [CAD-239](/CAD/issues/CAD-239) | `done` | Parecer APROVADO; CA-11 copy em `parecer-compliance.md` §4 |
| UX handoff | [CAD-240](/CAD/issues/CAD-240) | bloqueada por CAD-239 | CA-3, CA-10 (UI) |
| Implementação | [CAD-241](/CAD/issues/CAD-241) | bloqueada | CA-1–CA-9, CA-12 (API/CLI/core) |
| Smoke QA | [CAD-242](/CAD/issues/CAD-242) | bloqueada por CAD-241 | Execução após merge CTO |

**Veredicto actual:** **NÃO EXECUTÁVEL** — `server/backup/` e scripts CLI ainda inexistentes no repositório.

---

## Matriz CA → verificação

| ID | Critério (resumo) | Automático | Manual (Electron) | Evidência |
|----|-------------------|------------|-------------------|-----------|
| CA-1 | Zip com manifesto correcto para `database` + `media_images` | `smoke-cad238` §manifest | — | Lista de entradas zip + JSON manifesto |
| CA-2 | Restore parcial em `LIVEPRAISE_HOME` vazio → paridade BD/ficheiros | `smoke-cad238` §restore | — | Diff contagens SQLite + tree |
| CA-3 | Grupo ausente no zip → desabilitado na UI restore | — | Settings → Restore | Screenshot checklist |
| CA-4 | Restore sem `confirmOverwrite` → 409/400, destino intacto | `smoke-cad238` §api | — | Response body + hash pré/pós |
| CA-5 | Com `confirmOverwrite` → só grupos seleccionados | `smoke-cad238` §partial | — | Ficheiro de controlo fora do zip intacto |
| CA-6 | Backup BD com actividade → SQLite válido | `smoke-cad238` §wal | — | `PRAGMA integrity_check` |
| CA-7 | Backup BD mais novo que app → recusa restore | `smoke-cad238` §migrations | — | Mensagem de erro esperada |
| CA-8 | Rotas backup/restore recusam não-admin | `smoke-cad238` §auth | — | 403 em operador/sessão inválida |
| CA-9 | CLI `--groups` alinhado com manifesto | `smoke-cad238` §cli | — | IDs iguais escopo §3.2 |
| CA-10 | Modais só admin em settings | — | Login admin vs operador | Screenshot / ausência de painel |
| CA-11 | Copy privacidade antes de gerar zip | — | Modal Backup | Screenshot + chave i18n |
| CA-12 | Zip slip (`..` nos paths) rejeitado | `smoke-cad238` §security | — | 400 sem ficheiros escritos |

---

## Passos smoke CLI (pós-implementação)

1. `npm run build:server`
2. `npm run smoke:cad238`
3. Esperado: exit `0`, linhas `PASS` para cada CA automatizado; skips apenas se `LIVEPRAISE_SMOKE_SKIP_UI=1` (UI manual).

### Ambiente

- `LIVEPRAISE_HOME` temporário (`mkdtemp`) — nunca usar `~/livepraise` real.
- Fixture mínima: BD migrada, 1 imagem em `imagens/`, opcional vídeo pequeno para CA de progresso (Should).

### Credenciais

- Sessão **admin** via API de auth de smoke existente (`smoke-cad189` / padrão de teste da empresa).
- Não gravar passwords nem tokens em comentários Paperclip.

---

## Checklist UI (após CAD-241 + CAD-240)

1. Login admin → Settings → «Backup e restauro».
2. **Backup:** desmarcar `media_videos` → gerar zip → confirmar manifesto sem pasta `groups/media_videos`.
3. **Restore:** abrir zip do passo 2 → `media_videos` visível e **desabilitado** (CA-3).
4. Operador LAN: painel **ausente** ou 403 (CA-10).
5. Modal Backup: texto Compliance visível antes de confirmar (CA-11).

---

## Handoffs em falha

| Tipo | Destino |
|------|---------|
| API/core/CLI | [@CTO](/CAD/agents/cto) — [CAD-241](/CAD/issues/CAD-241) |
| UX/a11y modais | [@UXDesigner](/CAD/agents/uxdesigner) + CTO |
| Copy LGPD / retenção | [@Compliance](/CAD/agents/compliance) — [CAD-239](/CAD/issues/CAD-239) |
| zip slip / auth bypass | [@SecurityEngineer](/CAD/agents/securityengineer) |

---

## Histórico

| Data | Nota |
|------|------|
| 2026-05-28 | Plano inicial; smoke stub com skip até `dist/server/backup/` existir |
