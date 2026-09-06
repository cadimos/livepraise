# SM-039 — Backlog Vitest (funções puras)

Candidatos a migrar de `tests/*.test.mjs` (Node + jsdom manual) para **Vitest** quando a suite formal for adoptada (ver [`DIVIDA-TECNICA.md`](DIVIDA-TECNICA.md) ST-028).

## Operador (futuro Vitest)

- `useProjectionTypographyPreview` — casos em [`TF-023-composable-preview-test.md`](TF-023-composable-preview-test.md)

## Prioridade alta (`shared/` — sem DOM)

| Módulo | Funções / comportamento | Teste actual |
|--------|-------------------------|--------------|
| `shared/projection-chords.ts` | `stripChordsForProjection`, `stripChordsFromHtml` | `tests/projection-chords.test.mjs` |
| `shared/projection-text-shadow.ts` | `isValidAdvancedTextShadowCss`, `projectionTextShadowSlackPx` | smoke tipografia |
| `shared/bible-navigation.ts` | `computeNextVerseIndex` | — |
| `shared/bible-reference.ts` | parsing referências | — |
| `shared/queue-items.ts` | `summarizeLabel`, `migrateTabVerses`, paths | — |
| `shared/playlist-transfer.ts` | export/import parsing | — |
| `shared/live-delivery.ts` | `effectiveDeliveryAction` | — |
| `shared/theme-css-vars.ts` | `themeToCssVariables` | `tests/themes/normalize.test.mjs` |
| `shared/shortcuts.ts` | `formatComboLabel`, normalização combos | — |

## Prioridade média (`core/`)

| Módulo | Notas |
|--------|-------|
| `core/auth/*` | roles, sessão |
| `core/projection/chords.ts` | re-export shared — testar só shared |
| Temas / normalização | já parcial em `tests/themes/` |

## Manter em smokes `.mjs` (integração)

- HTTP + WS (`smoke-fase8`, `smoke-auth`, …)
- Boot servidor + exports (`smoke-textfill` integração)
- Pipeline vídeo, backup, legacy-upgrade

## Manter em Playwright (futuro)

- Fluxos operador: login, projectar louvor, fila, displays
- Prévia multi-saída com tipografia
