# Scripts de regressão (`scripts/`)

Smokes de release — validação manual ou em CI **antes de publicar**, não no desenvolvimento diário.

Gate de release: `npm run smoke:release` = `smoke:bootstrap` → `test:video-pipeline` → `smoke:fase8`.

Desenvolvimento diário: `npm run typecheck` e `npm run dev`.

Requisito: Node ≥ 22.12 (`engines` na raiz).

## Suite núcleo (CI)

| npm | Ficheiro | Corre no CI? | O que valida |
|-----|----------|--------------|--------------|
| `smoke:bootstrap` / `smoke:fase2` | `smoke-fase2.mjs` | ✅ `ci.yml` | Bootstrap BD, CRUD música, persistência |
| `smoke:fase8` | `smoke-fase8.mjs` | ✅ `ci.yml` | Instalação limpa, health, WebSocket, latência |
| `test:video-pipeline` / `smoke:car40` | `smoke-car40.mjs` | ✅ `ci.yml` | Pipeline ffmpeg / vídeo |
| `smoke:release` | *(encadeamento)* | Manual / local | Os três acima |

## Smokes de feature (manual — SM-001, SM-002)

| npm | Ficheiro | CI | Ainda necessário? | Feature |
|-----|----------|-----|-------------------|---------|
| `smoke:legacy-upgrade` | `smoke-legacy-upgrade.mjs` | ❌ | **Sim** — migração v0.0.8 | Upgrade BD legado |
| `smoke:audit` | `smoke-audit-retention.mjs` | ❌ | Sim | Retenção auditoria |
| `smoke:locales` | `smoke-locales-i18n.mjs` | ❌ | Sim | Paridade locales en-US |
| `smoke:video-watcher` | `smoke-video-watcher.mjs` | ❌ | Sim | Watcher pasta vídeos |
| `smoke:musica-export` | `smoke-musica-export.mjs` | ❌ | Sim | Export/import louvores |
| `smoke:version` | `smoke-version-sync.mjs` | ❌ | Sim | Sync versão package.json |
| `smoke:cad187` | `smoke-cad187.mjs` | ❌ | Parcial | WS join roles |
| `smoke:cad188` | `smoke-cad188.mjs` | ❌ | Parcial | Displays + projector build |
| `smoke:cad189` | `smoke-cad189.mjs` | ❌ | Parcial | — |
| `smoke:cad190` | `smoke-cad190.mjs` | ❌ | Parcial | — |
| `smoke:cad193` | `smoke-cad193.mjs` | ❌ | Parcial | — |
| `smoke:cad194` | `smoke-cad194.mjs` | ❌ | Parcial | Projetor estático |
| `smoke:cad221` | `smoke-cad221.mjs` | ❌ | Parcial | Auth/roles |
| `smoke:cad224` | `smoke-cad224.mjs` | ❌ | Parcial | Preview groups / delivery |
| `smoke:cad221-qa` | cad221 + cad224 | ❌ | Parcial | — |
| `smoke:cad228` | `smoke-cad228.mjs` | ❌ | Parcial | Backup/restore |
| `smoke:cad234` | `smoke-cad234.mjs` | ❌ | Parcial | — |
| `smoke:cad238` | `smoke-cad238.mjs` | ❌ | Parcial | — |
| `smoke:cad288` | `smoke-cad288.mjs` | ❌ | Parcial | CSS/contraste |
| `smoke:cad290` | `smoke-cad290.mjs` | ❌ | Parcial | Release assets |
| `smoke:cad300` | `smoke-cad300.mjs` | ❌ | Parcial | — |
| `smoke:cad311` | `smoke-cad311.mjs` | ❌ | Parcial | Fontes bundled |
| `smoke:textfill` | `smoke-textfill.mjs` | ❌ | **Sim** | Tipografia + textfill (SM-010) |
| `smoke:cad313` | `smoke-cad313.mjs` | ❌ | Parcial | Redireccionado → `smoke:textfill` |
| `smoke:cad314` | `smoke-cad314.mjs` | ❌ | **Sim** | QA tipografia CA-1–14 |
| `smoke-win-installer` | `smoke-win-installer.mjs` | ❌ | Manual Windows | Instalador NSIS |

**Plano de consolidação:** SM-016–SM-029 deprecados (aviso + encaminhamento em `smoke-deprecated.mjs`); remoção física dos `.mjs` cad* em SM-030 (próximo release).

### Suite features (SM-009)

| npm | Ficheiro | O que valida |
|-----|----------|--------------|
| `smoke:features` | `smoke-features.mjs` | Todos: locales, audit, video-watcher, musica-export, version, textfill |
| `smoke:features -- --only=locales` | idem | Um domínio (ver `--list`; aliases: typography → textfill) |

Scripts individuais (`smoke:locales`, `smoke:audit`, …) mantidos como aliases directos.

## CI (GitHub Actions)

| Workflow | Smokes |
|----------|--------|
| `.github/workflows/ci.yml` (PR) | `test:video-pipeline`, `smoke:bootstrap`, `smoke:fase8` |
| `.github/workflows/release.yml` | `smoke:bootstrap`, `smoke:fase8` (Linux/macOS); Windows parcial |

## Outros scripts úteis

| npm | Ficheiro |
|-----|----------|
| `smoke:surfaces` | `smoke-build-surfaces.mjs` — artefactos `dist/` após `npm run build` (TS-030/031) |
| `smoke:features` | `smoke-features.mjs` — locales, audit, video-watcher, musica-export, version, **textfill** (SM-009/010) |
| `smoke:textfill` | `smoke-textfill.mjs` — API tipografia + `tests/projection-textfill-*` (SM-010) |
| `verify:build` | `verify-fresh-build.mjs` — build + surfaces (TS-044) |
| `check:js-in-src` | `check-js-in-src.mjs` — gate sem `.js` em pastas fonte |
| `verify:openapi` | `verify-openapi-coverage.mjs` |
| `sync:locales` | `build-*-locale.mjs` |
| `dist:*` | `dist-win.mjs`, `dist-linux.mjs`, etc. |

## Helpers de build

| Script | Função |
|--------|--------|
| `copy-shared-assets.mjs` | CSS de `shared/` → `dist/shared/` |
| `copy-browser-app-static.mjs` | HTML/CSS de `apps/*` ou `web/*` → `dist/` |
| `lib/smoke-helpers.mjs` | assert, fetchJson, env isolado (SM-007) |
| `lib/smoke-textfill.mjs` | Asserções textfill importáveis (SM-010) |

Ver também [`docs/BUILD.md`](../docs/BUILD.md).
