# SM-015 — Smokes finos, testes grossos

Separação entre scripts de smoke (gate rápido) e testes unitários em `tests/`.

## Princípio

| Camada | Onde | O quê |
|--------|------|--------|
| **Smoke** | `scripts/smoke-*.mjs`, `scripts/lib/smoke-*.mjs` | Boot servidor, HTTP, exports existem, wiring mínimo |
| **Unitário** | `tests/**/*.test.mjs` | jsdom, casos de borda, algoritmos (textfill, temas, SSRF) |

## Textfill (ex-cad313)

- **Smoke:** `scripts/smoke-textfill.mjs` → `runTextfillIntegrationSmoke` (API tipografia, manifest fontes, exports `projection-textfill` / `projection-typography-runtime`).
- **Unitário:** `scripts/lib/smoke-textfill.mjs` → `TEXTFILL_UNIT_TESTS` corre em subprocesso:
  - `tests/projection-textfill-visibility.test.mjs`
  - `tests/projection-textfill-fit.test.mjs`
  - `tests/projection-textfill-two-pass.test.mjs`

## Gate CI

- `npm run test:unit` — todos os `*.test.mjs` em `tests/` (SM-041), incluindo textfill e `tests/security/*`.
- `npm run smoke:textfill` — integração + unitários textfill (usado em `smoke:release` via TF-025).
- Job `typecheck` no CI corre `test:unit` antes do `typecheck`.

## Adicionar cobertura nova

1. Lógica algorítmica → novo `tests/area-nome.test.mjs` (auto-descoberto por `run-unit-tests.mjs`).
2. Smoke só verifica que o endpoint exporta ou que o fluxo HTTP de alto nível responde 200.
