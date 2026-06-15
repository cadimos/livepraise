# Build — Live Praise

## Política: fonte vs artefacto (TS-002)

| Tipo | Extensões / local | Versionado no git? |
|------|-------------------|--------------------|
| **Fonte** | `.ts`, `.vue`, `.html`, `.css` em `apps/`, `web/`, `server/`, `core/`, `shared/`, `electron/` | Sim |
| **Config de tooling** | `tailwind.config.ts`, `postcss.config.ts`, `scripts/*.mjs`, `tests/*.mjs` | Sim |
| **Artefacto de build** | `dist/**` (server, shared, electron, operator, apps browser) | **Não** — gerado por `npm run build` |
| **Emit browser apps** | `dist/apps/projector/`, `dist/apps/stage-return/` | **Não** — `tsc` + cópia de HTML/CSS |

**Regra:** nunca commitar output de `tsc` ou `vite build`. A fonte vive só em `.ts` / `.vue`.

### Inventário de `.js` versionados (TS-001)

| Ficheiro | Classificação | Acção |
|----------|---------------|-------|
| `apps/projector/*.js` | Build commitado (legado) | Removido — emit em `dist/apps/projector/` |
| `apps/stage-return/stage-return.js` | Build commitado (legado) | Removido — emit em `dist/apps/stage-return/` |
| `core/displays/config-file.js` | Build commitado (legado) | Removido — emit em `dist/core/` |
| `core/displays/merge-assignments.js` | Cópia obsoleta (fonte em `electron/displays/`) | Removido |
| `web/**/*.js` | **Fonte** (migração TS pendente) | ✅ Migrado — fonte em `web/*/src/*.ts`, emit em `dist/web/*/` |
| `tailwind.config.js`, `postcss.config.js` | Config | ✅ Migrados para `.ts` (TS-024, TS-025) |

## Decisão: destino do emit browser (TS-007)

**Opção B adoptada:** emit de `apps/projector` e `apps/stage-return` vai para `dist/apps/<app>/`, alinhado com `dist/apps/operator/`.

Motivos:
- `dist/` já está no `.gitignore`
- Paridade com operador (Vite → `dist/apps/operator`)
- `electron-builder` já inclui `dist/**/*`

Ficheiros estáticos (`index.html`, `*.css`) permanecem em `apps/<app>/` na fonte e são copiados para `dist/apps/<app>/` no build.

## Ordem de build

```text
npm run sync:version
  → build:server     (tsc server+core+shared → dist/ + migrations + copy CSS)
  → build:projector  (tsc → dist/apps/projector + copy HTML/CSS)
  → build:stage-return
  → build:electron   (tsc → dist/electron/)
  → build:operator   (vite → dist/apps/operator/)
  → build:web        (tsc web apps → dist/web/* + copy HTML/CSS)
```

## Aliases de import (TS-026)

Dois padrões, consoante a superfície:

| Alias | Onde | Config | Runtime |
|-------|------|--------|---------|
| `@shared/*`, `@core/*` | Operador (Vite), `server/`, `core/` | `tsconfig.json` + `vite.config.ts` | Bundler / Node resolve para `shared/` e `core/` |
| `/shared/*.js` | Projector, stage-return, web apps | `tsconfig.browser-paths.json` (estendido por cada `tsconfig.*.json` browser) | URL absoluta servida por Express em `/shared/` |

**Fonte única dos paths browser:** `tsconfig.browser-paths.json` na raiz — projector, stage-return e `web/*/tsconfig.json` estendem este ficheiro. Runtime usa `/shared/*.js`; `import type` de `@shared/types/*` e `@shared/auth-session` apontam para `.d.ts` em `dist/shared/` (evita conflito `rootDir` em web).

Requer `npm run build:server` (ou `build`) antes do typecheck browser: os paths `/shared/*.js` apontam para `.d.ts` em `dist/shared/`.

**Git (TS-043):** `shared/**/*.js` e `shared/**/*.d.ts` estão no `.gitignore` — emit só em `dist/shared/`.

## Comandos úteis

```bash
npm run build          # build completo (produção, sem source maps browser)
npm run build:browser:dev  # browser + maps (TS-038, usado por npm run dev)
npm run typecheck      # verificação TS sem emit
npm run dev            # browser dev com maps + Electron
npm run dev:server     # servidor + operador (sem Electron)
```

## Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `LIVEPRAISE_HOME` | Override de `~/livepraise` (smokes, testes) |
| `LIVEPRAISE_APP_ROOT` | Raiz do repo em runtime empacotado |
| `LIVEPRAISE_PORT` | Porta HTTP (0 = aleatória) |

## Requisitos

Node ≥ 22.12 (`engines` em `package.json`).

## Decisões de build

- **TS-037:** manter `tsc` para web/projector/stage-return — ver [`ADR-037-web-bundler.md`](ADR-037-web-bundler.md).
- **TS-038:** source maps só em dev — `npm run build:browser:dev` (ou `npm run dev`, que o usa em vez de `build` completo para browser).
- **TS-044:** quickstart clone em `README.md`; validação local com `npm run verify:build`.
- **TS-045:** checklist de fecho — [`TS-045-EPIC-CHECKLIST.md`](TS-045-EPIC-CHECKLIST.md).
