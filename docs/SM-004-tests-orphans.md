# SM-004 — Testes em `tests/` (sem órfãos)

Data: 2026-06-17

Todos os `tests/**/*.test.mjs` correm via `npm run test:unit` (`scripts/run-unit-tests.mjs`).

| Ficheiro | Antes | Agora |
|----------|-------|-------|
| `projection-textfill-*.test.mjs` (×3) | `smoke:cad313` | `test:unit` + `smoke:textfill` |
| `security/remote-fetch*.test.mjs` (×2) | `test:cad228` | `test:unit` |
| `error-log/redact-url.test.mjs` | `test:cad228` | `test:unit` |
| `themes/normalize.test.mjs` | smoke isolado | `test:unit` |

**Gate CI:** job `typecheck` inclui `npm run test:unit`.

Não há testes que dependam exclusivamente de scripts `smoke:cad*` removidos.
