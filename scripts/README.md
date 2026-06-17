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
| `smoke:textfill` | `smoke-textfill.mjs` | ❌ | **Sim** | Tipografia + textfill (SM-010) |
| `smoke:typography-qa` | `smoke-typography-qa.mjs` | ❌ | **Sim** | QA CA-1–14 (ex cad314) |
| `smoke:auth` | `smoke-auth.mjs` | ❌ | Sim | Auth/delivery + preview (SM-011) |
| `smoke:displays` | `smoke-displays.mjs` | ❌ | Sim | footerAlert + fila/media (SM-012) |
| `smoke:backup` | `smoke-backup.mjs` | ❌ | Sim | import-url + fila + backup (SM-013) |
| `smoke:features` | `smoke-features.mjs` | ❌ | Sim | Entrypoint único (SM-009) |
| `smoke-win-installer` | `smoke-win-installer.mjs` | ❌ | Manual Windows | Instalador NSIS |

**Nota:** scripts `smoke:cad*` removidos em SM-030 — ver CHANGELOG [Unreleased].

### Suite features (SM-009)

| npm | Ficheiro | O que valida |
|-----|----------|--------------|
| `smoke:features` | `smoke-features.mjs` | locales, audit, video-watcher, musica-export, version, textfill, typography-qa, auth, displays, backup |
| `smoke:features -- --only=locales` | idem | Um domínio (ver `--list`) |

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
| `verify:sourcemaps` | `verify-sourcemaps.mjs` — TS-038 dev vs produção |
| `verify:build` | `verify-fresh-build.mjs` — build + surfaces (TS-044) |
| `check:js-in-src` | `check-js-in-src.mjs` — gate sem `.js` em pastas fonte |
| `test:unit` | `run-unit-tests.mjs` — todos os `tests/**/*.test.mjs` (SM-041) |
| `verify:depcheck` | `depcheck` — TS-042 |
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

Ver também [`docs/BUILD.md`](../docs/BUILD.md), [`TF-028-EPIC-CHECKLIST.md`](../docs/TF-028-EPIC-CHECKLIST.md), [`SM-042-EPIC-CHECKLIST.md`](../docs/SM-042-EPIC-CHECKLIST.md).
