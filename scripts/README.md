# Scripts de regressão entre versões (`scripts/`)

Esta pasta contém **smokes de release** — validação manual ou em CI **antes de publicar uma versão**, não durante o desenvolvimento diário.

Smokes pontuais por feature existem para validação manual; o gate de release continua a ser `smoke:release`.

## Comandos

| npm | Ficheiro | Âmbito |
|-----|----------|--------|
| `smoke:release` | *(encadeamento)* | Suite completa de release |
| `smoke:bootstrap` / `smoke:fase2` | `smoke-fase2.mjs` | Bootstrap, CRUD, persistência |
| `test:video-pipeline` / `smoke:car40` | `smoke-car40.mjs` | Pipeline vídeo (CA-R40) |
| `smoke:fase8` | `smoke-fase8.mjs` | Instalação limpa, health, WebSocket, latência |

### Suite de release (recomendado)

```bash
npm run smoke:release
```

Equivalente a: `smoke:bootstrap` → `test:video-pipeline` → `smoke:fase8`.

## CI (GitHub Actions)

Os workflows `car40-macos.yml`, `car40-windows.yml` e `car40-linux.yml` executam subconjunto destes smokes antes do build de artefactos.

## Desenvolvimento

Use `npm run typecheck` e `npm run dev` no dia-a-dia. Não correr smokes por alteração de código — só na validação de release.

Requisito: Node ≥ 22.5 (`engines` na raiz).
