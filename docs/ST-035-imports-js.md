# ST-035 — Imports `.js` em TypeScript (NodeNext)

Convenções por superfície — `npm run typecheck` valida todas.

## `server/`, `electron/`, `shared/`, `core/`

- **Module:** `NodeNext` / `Node16` nos respectivos `tsconfig.*.json`.
- Imports relativos **com extensão `.js`** apontando para o emit compilado:
  ```ts
  import { getMainDb } from '../db/connection.js';
  import type { LiveAction } from './types/live.js';
  ```
- Pacotes npm sem extensão: `import express from 'express'`.

## Apps browser (`tsc` — projector, live, external-display, stage-return)

- Imports de runtime partilhado via **URL absoluta** `/shared/foo.js` + paths em `tsconfig.browser-paths.json` → `dist/shared/*.d.ts`.
- Tipos de `@shared/types/*` onde o tsconfig inclui paths de tipos.

## Operador (Vite)

- Alias `@shared/foo` **sem** `.js` — resolve para fonte `shared/` em build dev/prod.
- Não misturar `/shared/` no operador.

## Verificação

```bash
npm run typecheck   # todas as superfícies
npm run lint        # ESLint import rules
```

Nenhum import relativo em `server/` deve omitir `.js` (quebra runtime ESM Node).
