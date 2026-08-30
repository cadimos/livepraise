# Dívida técnica registada (ST-027–032)

Itens **fora do escopo da linha alpha actual** ou melhorias opcionais. Detalhe funcional em [`INVENTARIO-FUNCOES.md`](../INVENTARIO-FUNCOES.md) (actualizado para `1.0.0-alpha.3`).

## ST-027 — i18n portal e remote

| Item | Estado | Referência |
|------|--------|------------|
| Operador Vue | ✅ | `locales/*.json`, `smoke:locales` (`pt-BR`, `en-US`, `pt-PT`, `es-ES`) |
| Portal `web/portal` | 📅 | HTML estático `lang="pt-BR"`; sem ficheiros de locale |
| Remote `web/remote` | 📅 | Idem |

**Quando atacar:** release dedicada a web views públicas; reutilizar pipeline `sync:locales` onde fizer sentido.

## ST-028 — Vitest e Playwright

| Hoje | Futuro |
|------|--------|
| `tests/*.test.mjs` + Node nativo | Vitest para `core/` + `shared/` |
| Smokes em CI | Playwright para fluxos operador |

Dependências de backlog: [`docs/SM-039-vitest-backlog.md`](SM-039-vitest-backlog.md). Nota: `shared/projection-chords.ts` já tem `tests/projection-chords.test.mjs`. Ver INVENTARIO secção **3**.

## ST-029 — Busca online de louvores

Pesquisa local Fuse.js em `WorshipPanel.vue`. API online (TeraIDC ou alternativa) — INVENTARIO secção **6**.

## ST-030 — Editor visual de temas

Temas bundled + `~/livepraise/themes/` manual. Editor UI (color pickers, `custom.json`) — INVENTARIO secção **7**.

## ST-031 — Pasta `v0.0.8/` no repositório

**Política:** não versionar código legado v0.0.8 no clone. O upgrade de dados vive em `server/db/legacy-upgrade.ts` + `npm run smoke:legacy-upgrade`.

- Não existe pasta `v0.0.8/` no tree actual.
- `.gitignore` ignora apenas `v0.0.8/node_modules/` (caso alguém coloque cópia local para comparação).
- Referências históricas em CHANGELOG e `legacy-upgrade.ts` mantêm-se.

## ST-032 — OpenAPI coverage no CI

- Script: `npm run verify:openapi` (`scripts/verify-openapi-coverage.mjs`) — **70** operações na lista canónica alinhadas com `openapi.yaml` (inclui `GET`/`PUT /api/operator-queue`).
- **Fora da lista (existem no servidor):** backup/restore, projection-typography, textfill-diagnostics — ver INVENTARIO secção **16**.
- **CI:** job `typecheck` executa `verify:openapi` em cada PR.
