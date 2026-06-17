# TF-023 — Teste do composable `useProjectionTypographyPreview`

Backlog até adoptar Vitest (ver [`DIVIDA-TECNICA.md`](DIVIDA-TECNICA.md) ST-028).

## Estado actual

- Lógica de textfill na prévia: `apps/operator/src/composables/useProjectionTypographyPreview.ts`
- Consumidores: `PreviewOutputTile.vue`, `ProjectionTypographyPreview.vue`
- Cobertura indirecta: `tests/projection-textfill-*.test.mjs` (motor `@shared/projection-textfill`), `smoke:textfill`, `smoke:typography-qa`

## O que Vitest deve cobrir (quando existir)

| Caso | Assert |
|------|--------|
| Mount com `rootRef` + `.content > span` | `refreshPreviewTextfill` chamado após `nextTick` |
| `disabled: true` | Não mede / não altera `font-size` |
| `prepareContent` retorna `false` | Aborta refresh |
| `layoutSignature` igual | Skip re-medida (debounce) |
| `ResizeObserver` no `frameRef` | Re-agenda refresh após resize |
| `profile` muda (fonte, maxFontPx) | Re-aplica estilos + textfill |
| `onBeforeUnmount` | Cancela timers / desliga observer |

## Setup mínimo sugerido

```ts
// tests/operator/useProjectionTypographyPreview.test.ts (futuro)
import { describe, it, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { useProjectionTypographyPreview } from '@/composables/useProjectionTypographyPreview';
// @vitest-environment jsdom
```

Mock: `@shared/projection-textfill.refreshPreviewTextfill`, `useProjectionFonts`.

## Alternativa sem Vitest

Não implementada — o motor partilhado já tem testes Node; duplicar mount Vue em `.mjs` seria frágil. Manter TF-023 em backlog até Vitest.
