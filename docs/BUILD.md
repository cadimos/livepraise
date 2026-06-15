# Build — Live Praise

## Política: fonte vs artefacto (TS-002)

| Tipo | Extensões / local | Versionado no git? |
|------|-------------------|--------------------|
| **Fonte** | `.ts`, `.vue`, `.html`, `.css` em `apps/`, `web/`, `server/`, `core/`, `shared/`, `electron/` | Sim |
| **Config de tooling** | `tailwind.config.js`, `postcss.config.js`, `scripts/*.mjs`, `tests/*.mjs` | Sim |
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
| `tailwind.config.js`, `postcss.config.js` | Config | Manter |

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
  → build:web        (futuro — TS-021)
```

## Comandos úteis

```bash
npm run build          # build completo
npm run typecheck      # verificação TS sem emit
npm run dev            # build + Electron dev
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
