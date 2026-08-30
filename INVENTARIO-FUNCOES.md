# Inventário pendente — Live Praise

**Versão analisada:** `1.0.0-alpha.3`  
**Última actualização:** 2026-08-30 (cruzamento com código, CI e [`CHANGELOG.md`](CHANGELOG.md))  
**Repositório:** `electron/`, `server/`, `core/`, `apps/`, `web/`, `shared/`

**TypeScript:** fonte `.ts`/`.vue` em todas as superfícies; emit em `dist/`; CI PR: `test:unit`, `typecheck`, `verify:openapi`, smokes núcleo. ESLint foi retirado (TypeScript 7). Smokes `smoke:cad*` removidos — [`scripts/README.md`](scripts/README.md). Plano técnico histórico: [`docs/PLANO-TAREFAS-TECNICAS.md`](docs/PLANO-TAREFAS-TECNICAS.md) (tarefas marcadas feitas).

Backlog do que **ainda não está implementado** (ou está só parcialmente). Secções ✅ são registo histórico e referência de smokes.

**Legenda:** ✅ implementado · 🟡 parcial / falta validar · ❌ pendente · 📅 **versão futura**

---

## Resumo executivo

| # | Item | Estado | Notas (alpha.3) |
|---|------|--------|-----------------|
| 0 | Migração v0.0.8 → 1.x | ✅ | `legacy-upgrade.ts` + `smoke:legacy-upgrade` |
| 1 | Auditoria e retenção | ✅ | API `GET /api/audit/logs`; **sem painel UI** (opcional) |
| 2 | Release GitHub | ✅ | Draft unificado; `smoke:fase8` nos 3 SO; `smoke:win-installer:ci` no Windows |
| 3 | Testes automatizados | 📅 | `test:unit` (9 ficheiros) + smokes; **Vitest/Playwright não** |
| 4 | Locales | ✅ | Operador: `pt-BR` (default), `en-US`, `pt-PT`, `es-ES`; portal/remote **não** i18n |
| 5 | Watcher de vídeos | ✅ | `videoWatcher.ts` + WS `media-updated` |
| 6 | Busca online de louvores | 📅 | Só Fuse.js local |
| 7 | Editor visual de temas | 📅 | Temas bundled + `theme.json` manual |
| 8 | Telemetria opt-in | 📅 | Só log local `/api/system/error-log` |
| 9 | Versão única no build | ✅ | `bump-version` + `shared/app-version.ts` (`1.0.0-alpha.3`) |
| 10 | Smoke instalador Windows | ✅ | `smoke:win-installer` / `:ci` no job Windows de `release.yml` (SM-035) |
| 11 | Import/export repertório | ✅ | `GET/POST /musica/export\|import` |
| 12 | Acessibilidade WCAG | 📅 | Tema alto contraste; `axe-core` **sem** `npm run a11y` |
| 13 | Auto-update validado | ✅ | In-app **Windows** (alpha.2 → alpha.3); faixa de progresso + Instalar agora |
| 14 | Flash textfill | ✅ | Alpha.2 + medição in-place / diagnóstico na alpha.3 |
| 15 | Fila partilhada | ✅ | **GET/PUT `/api/operator-queue`** + WS `operator-queue-sync` |
| 16 | Diagnóstico textfill | ✅ | JSONL + UI Logs; **rotas ainda fora do OpenAPI** |

### Ainda pendente *(pós-alpha.3)*

| # | Item | Tipo |
|---|------|------|
| **3** | Vitest + Playwright | Qualidade |
| **6** | Busca online de louvores | Produto |
| **7** | Editor visual de temas | Produto |
| **8** | Telemetria remota opt-in | Produto |
| **12** | Auditoria WCAG + `a11y` | Qualidade |
| **1 (UI)** | Painel de logs de auditoria no operador | Opcional |
| **4 (web)** | i18n em `web/portal` e `web/remote` | Dívida ST-027 |
| **OpenAPI** | Backup, tipografia, textfill-diagnostics (existem no servidor, fora da lista canónica) | Documentação |

Sincronização **multi-estação completa** (várias máquinas como um único culto, além da fila partilhada) continua **fora de escopo**.

### Entregue em **alpha.3** ✅

| Item | Verificação |
|------|-------------|
| Fila partilhada entre operadores | `npm run smoke:queue-sync` · `tests/operator-queue/store.test.mjs` |
| Locales `pt-PT` / `es-ES` | `npm run smoke:locales` · `npm run sync:locales` |
| Textfill (corte, medição in-place, cifras só em linhas de acordes) | `npm run smoke:textfill` · `tests/projection-chords.test.mjs` |
| Diagnóstico textfill | UI Configurações → Logs · `~/livepraise/textfill-diagnostics.jsonl` |
| Smoke instalador Windows no CI | `release.yml` → `smoke:win-installer:ci` |
| Auto-update in-app (Windows) | Teste manual alpha.2 → alpha.3 + faixa `AppUpdateBanner` |
| Runtime | Node ≥ 24, Electron 44 |

### Entregue em **alpha.2** ✅

| # | Item | Smoke / verificação |
|---|------|---------------------|
| 0 | Migração v0.0.8 → 1.x | `npm run smoke:legacy-upgrade` |
| 1 | Auditoria e retenção | `npm run smoke:audit` |
| 2 | Release GitHub (draft unificado) | Validado manualmente |
| 4 | Locales (`en-US`; `pt-BR` default) | `npm run smoke:locales` |
| 5 | Watcher de vídeos | `npm run smoke:video-watcher` |
| 9 | Versão única no build | `npm run bump-version` · `npm run smoke:version` |
| 11 | Import/export repertório | `npm run smoke:musica-export` |
| 14 | Flash textfill ao trocar verso | `tests/projection-textfill-visibility.test.mjs` · `npm run smoke:textfill` |

---

## 0. Migração v0.0.8 → 1.x ✅ *(concluído em alpha.2)*

### Implementado

- Detecção de base legada sem `schema_migrations` (`server/db/legacy-upgrade.ts`).
- Backup automático em `~/livepraise/backup/auto-upgrade/` e quarentena `dsw.bd.corrupt-*`.
- Integração no arranque (`prepareLegacyDatabaseFile` em `server/index.ts`).
- Smoke **`npm run smoke:legacy-upgrade`**.

### Manutenção

- [x] Documentar fluxo no README secção migração.
- [x] Decisão CI PR: **não** incluir `smoke:legacy-upgrade` — ver [`docs/SM-034-legacy-upgrade-ci.md`](docs/SM-034-legacy-upgrade-ci.md). Correr manual pré-release.

---

## 1. Auditoria e retenção de dados ✅ *(concluído em alpha.2)*

### Implementado

| Componente | Estado |
|------------|--------|
| `purgeExpiredSessions` | ✅ (`core/auth/sessions.ts`) |
| Tabela `audit_logs` | ✅ migration `008_audit_logs.sql` |
| Helper `core/audit/log.ts` | ✅ `writeAuditLog`, `listAuditLogs` |
| Hooks de auditoria | ✅ `auth`, `users`, `devices`, `backup`/`restore` |
| Retenção agendada | ✅ `core/retention/purge.ts` + scheduler diário no arranque |
| API admin | ✅ `GET /api/audit/logs` (sem painel UI — conforme MVP) |
| OpenAPI | ✅ tag `audit` + schemas `AuditLogRecord`, `AuditRetentionPolicy` |
| Smoke | ✅ `npm run smoke:audit` |

### Política de retenção

| Dado | Prazo |
|------|-------|
| Sessões expiradas | a cada purge (login + job diário) |
| `audit_logs` | 90 dias |
| Contas `active=false` | 30 dias desde `updated_at` |
| `external_devices` inactivos | 180 dias desde `last_seen_at` |

### Acções auditadas

`auth.login`, `auth.login_failed`, `auth.logout`, `user.create`, `user.update`, `device.register`, `device.update`, `backup.export`, `backup.restore`.

### Tarefas *(alpha.2)*

- [x] Migration SQLite `audit_logs` (utilizador, acção, recurso, IP, timestamp).
- [x] Helper `core/audit/log.ts` e chamadas nos routers `auth`, `users`, `devices`.
- [x] `core/retention/purge.ts` + agendamento no arranque do servidor (ou cron interno diário).
- [x] Painel admin opcional: listar últimos N registos (somente `admin`) — **API apenas** (`GET /api/audit/logs`).
- [x] Documentar prazos de retenção e OpenAPI se exposto.
- [x] Smoke: criar utilizador → entrada em `audit_logs`; simular conta antiga → purge.

**Fora do MVP alpha.2 (opcional):** painel admin na UI do operador.

---

## 2. Release GitHub (artefactos multi-OS) ✅ *(validado em alpha.2)*

### Validado *(teste manual — alpha.2)*

Confirmado operacional no GitHub:

- Workflow **`release.yml`** verde — draft unificado com artefactos **Windows, Linux e macOS**.
- Instaladores descarregados do draft **instalam e executam com sucesso** nos três SO.
- Pipeline `resolve-version` → build paralelo → upload ao **mesmo draft** funcional de ponta a ponta.

### Implementado *(infraestrutura)*

**Antes:** três workflows separados (`car40-windows.yml`, `car40-macos.yml`, `car40-linux.yml`) — potencialmente três releases/artefactos desligados.

**Agora:** workflow único **[`.github/workflows/release.yml`](.github/workflows/release.yml)**:

1. **`resolve-version`** — `scripts/resolve-release-version.mjs` calcula versão (reutiliza draft ou incrementa).
2. **`prepare-release`** — cria ou limpa **um único draft** no GitHub (`gh release create --draft`).
3. **`build-windows`**, **`build-linux`**, **`build-macos`** — builds em paralelo; cada job anexa instaladores **ao mesmo draft** via `LIVEPRAISE_PUBLISH=1` + `electron-dist.mjs`.
4. **`sync-version`** — commit automático de `package.json` / `package-lock.json` com `[skip ci]`.

CI de PR separado: **[`.github/workflows/ci.yml`](.github/workflows/ci.yml)** (smokes leves, sem instaladores).

Comandos locais `npm run dist:*` inalterados; documentação em [`README.md`](README.md) / [`scripts/README.md`](scripts/README.md) *(algumas referências ainda mencionam «CA-R40» — nomenclatura legada)*.

| Plataforma | Comando | Artefacto no draft |
|------------|---------|-------------------|
| Windows x64 | `npm run dist:win` | NSIS (`.exe`) + `latest*.yml` |
| macOS | `npm run dist:mac` | DMG (x64 + arm64) |
| Linux x64 | `npm run dist:linux` | AppImage + `.deb` + `.rpm` + `.pacman` |
| Linux (só AppImage) | `npm run dist:linux-appimage` | AppImage |
| Linux (só deb/rpm/pacman) | `dist:linux-deb` / `dist:linux-rpm` / `dist:linux-pacman` | Pacote nativo |
| Linux Flatpak / Snap | `dist:flatpak` / `dist:snap` | Opcional; **não** no workflow CI |
| Todos (local) | `npm run dist:all` | Win + Linux (+ DMG no Mac se disponível) |

**Smokes no CI de release *(alpha.3)*:**

| Job | Smokes actuais |
|-----|----------------|
| Windows | `test:video-pipeline`, `smoke:bootstrap`, `smoke:fase8`, **`smoke:win-installer:ci`** após `dist:win` |
| Linux / macOS | `smoke:fase8` (+ pipeline/bootstrap conforme o job) |
| Manual pré-release | `smoke:release` completo, `smoke:legacy-upgrade` |

**Publicação:** draft gerado pelo CI → validação manual ✅ → **Publish release** no GitHub quando quiser tornar pública (auto-update só activo após publish).

### Manutenção opcional *(não bloqueia alpha.2)*

Melhorias de **regressão automática** — o fluxo principal já está validado:

#### Lacunas de automação no CI

| Lacuna | Situação actual | Prioridade |
|--------|-----------------|------------|
| **`smoke-win-installer` no CI** | ✅ `smoke:win-installer:ci` no job Windows | — |
| **`smoke:fase8` no Windows** | ✅ Nos três jobs de release | — |
| **`smoke:release` / `legacy-upgrade` no CI release** | Gate README não corre no pipeline de release | Baixa |
| **Snap / Flatpak no CI** | Build manual opcional | Baixa |
| **Assinatura de código** | Instaladores funcionam; avisos de publisher | Pós-beta |
| **SHA256 nas notas** | Manual opcional | Baixa |

#### Tarefas opcionais

- [x] Integrar `smoke-win-installer` no job `build-windows` (secção 10).
- [x] Alinhar smokes Windows com Linux/macOS (`smoke:fase8`).
- [ ] (Opcional) `smoke:legacy-upgrade` no CI de PR ou release.
- [ ] Actualizar [`scripts/README.md`](scripts/README.md) / README — remover referências «CA-R40».
- [ ] Snap / Flatpak no CI ou só documentação de build manual.
- [ ] Assinatura de código (certificados Windows + Apple).
- [ ] SHA256 automático nas notas do release.

### Checklist (cada tag/release)

- [x] Workflow unificado gera **um draft** com artefactos Win + Linux + macOS.
- [x] Resolução automática de versão (`resolve-release-version.mjs`).
- [x] Verificação de artefactos no CI (`.exe` + `latest*.yml`, pacotes Linux, `.dmg`).
- [x] CI verde em `main` — draft com os três SO *(alpha.2)*.
- [x] Instaladores do draft testados manualmente — instalação e execução OK *(alpha.2)*.
- [ ] Notas de release (changelog) editadas no GitHub *(se ainda draft)*.
- [ ] Clicar **Publish release** *(quando quiser activar auto-update público)*.
- [ ] (Opcional) Registar SHA256 nas notas.

---

## 3. Testes automatizados (além de smokes) 📅 *(versão futura)*

> **Decisão (mantida na alpha.3):** não adoptar Vitest nem Playwright. O gate é `ci.yml` + `smoke:release`. ESLint **não** faz parte do CI (removido por incompatibilidade com TypeScript 7).

### Gate actual (consolidado — SM-038)

| Comando | Onde corre | O que valida |
|---------|------------|--------------|
| `npm run test:unit` | CI PR | 9× `tests/**/*.test.mjs` (textfill, cifras, fila, temas, security, error-log) |
| `npm run typecheck` | CI PR | Todas as superfícies TS |
| `npm run verify:openapi` | CI PR | **70** operações HTTP na lista canónica vs `openapi.yaml` |
| `npm run test:video-pipeline` | CI PR (`smoke` job) | Pipeline ffmpeg / vídeo |
| `npm run smoke:bootstrap` | CI PR + release | Bootstrap BD, CRUD, persistência |
| `npm run smoke:fase8` | CI PR + release (Win/Linux/macOS) | WS, health, instalação limpa |
| `npm run smoke:release` | Manual pré-release | bootstrap → video → textfill → fase8 |

Documentação: [`scripts/README.md`](scripts/README.md) · [`docs/SM-015-unit-tests-split.md`](docs/SM-015-unit-tests-split.md) · [`docs/SM-042-EPIC-CHECKLIST.md`](docs/SM-042-EPIC-CHECKLIST.md).

### Smokes de feature (manual ou `smoke:features`)

| npm | Domínio |
|-----|---------|
| `smoke:textfill` | Tipografia + motor textfill |
| `smoke:typography-qa` | QA CA tipografia |
| `smoke:auth` | Auth, roles, delivery |
| `smoke:displays` | Displays + footer alert |
| `smoke:backup` | Backup/restore + import URL |
| `smoke:legacy-upgrade` | Migração v0.0.8 *(manual pré-release)* |
| `smoke:locales`, `smoke:audit`, `smoke:video-watcher`, `smoke:musica-export`, `smoke:version`, `smoke:queue-sync` | Ver `smoke:features -- --list` |

Scripts `smoke:cad187` … `smoke:cad314` **removidos** (SM-030). Mapeamento: [`docs/SM-003-smoke-consolidacao.md`](docs/SM-003-smoke-consolidacao.md).

### Já existe (unitários Node)

- `tests/projection-textfill-*.test.mjs` — motor textfill (jsdom)
- `tests/projection-chords.test.mjs` — filtro de cifras
- `tests/operator-queue/store.test.mjs` — estado da fila partilhada
- `tests/security/remote-fetch*.test.mjs` — SSRF e content-type
- `tests/themes/normalize.test.mjs` — normalização temas
- `tests/error-log/redact-url.test.mjs` — redacção de URLs
- Runner: `scripts/run-unit-tests.mjs` via `npm run test:unit` (SM-041)

### O que falta *(planeado — versão futura)*

Suite **Vitest** para `core/` e `shared/` e **Playwright** para fluxos críticos do operador. Backlog: [`docs/SM-039-vitest-backlog.md`](docs/SM-039-vitest-backlog.md) · [`docs/DIVIDA-TECNICA.md`](docs/DIVIDA-TECNICA.md) ST-028.

### Tarefas *(backlog — não alpha.2)*

- [ ] Adicionar Vitest + config mínima.
- [ ] Testes unitários: `bible-reference`, `queue-items`, `sanitize` projection, `sessions.purge`.
- [ ] Playwright: arrancar `dev:server`, abrir operador, login loopback, projectar música mock.
- [ ] Job GHA `test.yml` em PR (hoje smokes + unitários vivem em `ci.yml`).
- [ ] Integrar com `smoke:release` (smokes permanecem gate de release).

---

## 4. Locales adicionais ✅ *(concluído — operador; web pública pendente)*

### Regra de produto

- **`pt-BR` é e permanece o idioma padrão** — instalações novas, fallback i18n, preferências por defeito e resposta `GET /locales` (`default: 'pt-BR'`).
- **`locales/pt-BR.json` é a fonte canónica de chaves** — qualquer locale novo deve ter **paridade de chaves** (mesma árvore JSON); valores traduzidos.
- Idiomas adicionais são **opt-in** no selector Configurações → Idioma; não alteram o default global para utilizadores que nunca mudaram preferências.

### Já existe

- ✅ `core/locales/resolve.ts` — `listLocales()`, `resolveLocale()` (home dir → `locales/` → `install/locales/`).
- ✅ `GET /locales` e `GET /locales/{locale}.json` (`server/routes/locales.ts`).
- ✅ Selector em `AppearancePanel.vue` via `useLocale()` + `refreshLocales()` no arranque.
- ✅ `locales/pt-BR.json` + cópia em `install/locales/pt-BR.json`.
- ✅ Bootstrap/sync de locales bundled para `~/livepraise/locales/`.
- ✅ `DEFAULT_LOCALE = 'pt-BR'` e `fallbackLocale: 'pt-BR'` em `apps/operator/src/i18n.ts`.
- ✅ Preferência inicial `locale: 'pt-BR'` em `usePreferences.ts`.

### Como deve funcionar

1. Operador abre Configurações → Idioma e vê **Português (Brasil)** (predefinido) mais **English**, **Português (Portugal)** e **Español**.
2. Ao escolher outro idioma, o operador carrega `/locales/{code}.json` e persiste a preferência; **reinício** mantém a escolha.
3. Chaves em falta num locale secundário caem no **fallback `pt-BR`** (vue-i18n).
4. Portal/web views podem continuar `lang="pt-BR"` no HTML estático nesta versão; tradução do portal fica fora do MVP se não houver ficheiros em `web/`.

### Implementado *(alpha.2 + alpha.3)*

- `locales/en-US.json`, `pt-PT.json`, `es-ES.json` + cópias em `install/locales/`.
- `npm run sync:locales` — `build-en-us-locale.mjs`, `build-pt-pt-locale.mjs`, `build-es-es-locale.mjs`.
- Rótulos `locales.meta.*` + `useLocaleLabel()` em `AppearancePanel.vue` e `StatusBar.vue`.
- `locales/README.md` — processo para idiomas futuros.
- Smoke `npm run smoke:locales` — paridade de chaves `pt-BR` vs `en-US` / `pt-PT` / `es-ES`; `default === 'pt-BR'`.
- **`pt-BR` inalterado** como default (`i18n.ts`, `usePreferences.ts`, `GET /locales`).

### Tarefas *(alpha.2)*

**Primeiro idioma adicional — `en-US`:**

- [x] Duplicar `locales/pt-BR.json` → `locales/en-US.json` e traduzir valores (manter chaves idênticas).
- [x] Copiar `locales/en-US.json` → `install/locales/en-US.json` (payload de primeira instalação).
- [x] Confirmar que **`pt-BR` não muda** em: `i18n.ts`, `usePreferences.ts`, `server/routes/locales.ts` (`default`), `GET /locales` após bootstrap limpo (lista inclui `pt-BR` + `en-US`; default continua `pt-BR`).
- [x] (Recomendado) Labels legíveis no selector — ex. mapa `{ 'pt-BR': 'Português (Brasil)', 'en-US': 'English' }` em `AppearancePanel.vue` ou chaves `locales.meta.*` no JSON.
- [x] Smoke **`scripts/smoke-locales-i18n.mjs`** (ou estender `smoke-cad306`): `GET /locales/en-US.json` → 200; paridade de chaves `pt-BR` vs `en-US`; `GET /locales` lista ambos; `default === 'pt-BR'`.
- [x] Entrada `npm run smoke:locales` em `package.json`.

**Processo para idiomas futuros** — ver [`locales/README.md`](locales/README.md).

**Fora do MVP (ainda pendente):**

- [ ] Traduções do portal (`web/portal`) e controlo remoto (`web/remote`) — HTML `lang="pt-BR"` estático; dívida **ST-027**.
- [x] `es-ES` e `pt-PT` no operador (alpha.3).
- [x] Paridade de chaves verificada em `smoke:locales` (substitui um script `verify-locale-keys` isolado).

---

## 5. Detecção automática de vídeos na pasta (watcher) ✅ *(concluído em alpha.2)*

### Já existe

- Ao **listar** categoria (`GET /video/categoria/:codigo`) ou **importar**, o servidor agenda pipeline ffmpeg (`videoPipeline.ts`).
- Painel **Vídeos**: polling a cada 3 s **enquanto** há conversões na lista actual (`VideosPanel.vue`).

Isto cobre upload pelo operador e ficheiros descobertos ao **mudar de categoria** ou reabrir o painel.

### Problema resolvido *(alpha.2)*

Copiar vídeo para `~/livepraise/videos/{categoria}/` **com painel já aberto** — antes o operador não via o ficheiro até recarregar manualmente.

### Como funciona agora

1. Servidor detecta criação/alteração nas pastas de categoria (ignorar `thumb/` e temporários).
2. Chama o mesmo `scheduleVideoPipeline` — sem duplicar ffmpeg.
3. Operador recebe aviso (WebSocket ou refresh dirigido) e a grelha actualiza sem mudar de categoria.

**Critério de sucesso:** painel aberto + copiar `.mp4` → tile em poucos segundos; thumb após pipeline.

### Implementado *(alpha.2)*

- `server/services/videoWatcher.ts` — `fs.watch` recursivo em `~/livepraise/videos/` com debounce 500 ms.
- Integração com `scheduleVideoPipeline` (sem duplicar ffmpeg).
- Ignora `thumb/`, `.part`, `.tmp` e extensões não vídeo.
- Arranque em `startLivepraiseServer` (`server/index.ts`); paragem em `stopLivepraiseServer`.
- WebSocket `media-updated` → operadores; `VideosPanel.vue` chama `reloadCurrentCategory()` na categoria activa.
- Smoke `npm run smoke:video-watcher`.

### Tarefas *(alpha.2)*

- [x] `server/services/videoWatcher.ts`: `fs.watch` ou chokidar com debounce sobre `~/livepraise/videos/`.
- [x] Integrar watcher → `scheduleVideoPipeline` (reutilizar API existente; não reimplementar ffmpeg).
- [x] Ignorar subpastas `thumb/`, ficheiros incompletos (`.part`, `.tmp`) e extensões não vídeo.
- [x] Arrancar watcher no bootstrap do servidor (`server/index.ts` ou `bootstrap.ts`).
- [x] Notificar operador: evento WS `media-updated` (ou equivalente) consumido por `VideosPanel.vue` → `reloadCurrentCategory()`.
- [x] Smoke: copiar `.mp4` para categoria com painel aberto → tile visível sem mudar de aba; thumb após pipeline.
- [x] Entrada `npm run smoke:video-watcher` em `package.json`.

---

## 6. Busca online de louvores 📅 *(versão futura)*

> **Decisão (mantida):** não implementar busca online. O painel Louvor mantém **pesquisa local** (Fuse.js).

### Estado actual

Pesquisa **local** Fuse.js no painel Louvor. Integração TeraIDC removida na reescrita 1.x; sem substituto.

### Como deve funcionar

Pesquisa opcional online devolve título, autor, letra; operador importa com um clique. Offline: só Fuse.js.

### Tarefas *(backlog — versão futura)*

- [ ] Decisão de produto: reactivar teraidc vs API alternativa.
- [ ] `server/routes/worship-search.ts` + cache + rate limit.
- [ ] UI em `WorshipPanel.vue`: toggle «busca online», resultados, Importar.
- [ ] Mapear resposta → `POST /musica` existente.
- [ ] Documentar dependência de rede e termos de uso.

---

## 7. Editor visual de temas 📅 *(versão futura)*

> **Decisão (mantida):** não implementar editor visual. Operador escolhe temas bundled (`default`, `high-contrast`) ou edita `theme.json` em `~/livepraise/themes/`.

### Já existe

- Schema `shared/types/theme.ts`; normalização/sync `core/themes/normalize.ts`, `core/themes/sync.ts`.
- Temas bundled `default` e `high-contrast`; CSS vars via `shared/theme-css-vars.ts` e `useTheme.ts`.
- API **somente leitura**: `GET /themes/:id/theme.json`, `variables.css`, assets (`server/routes/themes.ts`).
- Teste `tests/themes/normalize.test.mjs`.
- Tipografia de projeção em preferências separadas — **fora** deste item.

### O que falta *(planeado — versão futura)*

Edição visual em Configurações → Aparência (color pickers, preview, gravar `custom.json`).

### Tarefas *(backlog — versão futura)*

- [ ] Painel com color pickers e preview ao vivo.
- [ ] Validar contra `shared/types/theme.ts` antes de gravar.
- [ ] `PUT /themes/custom` ou escrita no home dir.
- [ ] Recarregar CSS vars via `useTheme.ts` após gravar.
- [ ] Smoke: alterar cor primária → persistência após reinício.

---

## 8. Telemetria opt-in de crashes 📅 *(versão futura)*

> **Decisão (mantida):** não implementar envio remoto. O **log de erros local** (`/api/system/error-log`) mantém-se.

### Já existe

- Log de erros **local**: `POST/GET/DELETE /api/system/error-log`, `core/error-log/store.ts`.
- Cliente: `apps/operator/src/utils/errorLogReporter.ts` (erros UI + fetch API → log local).
- Redacção de URLs sensíveis: `tests/error-log/redact-url.test.mjs`.

Isto **não** envia dados para servidor externo.

### O que falta *(planeado — versão futura)*

Envio **opt-in** e anónimo para endpoint configurável (Sentry/DSN). Desligado por defeito.

### Tarefas *(backlog — versão futura)*

- [ ] Flag em preferências + texto explicativo.
- [ ] Filtro de dados sensíveis antes de envio remoto (letras, PII).
- [ ] Endpoint receptor via env.
- [ ] Separar claramente «log local» vs «telemetria remota» na UI.

---

## 9. Versão única no build e na UI ✅ *(concluído em alpha.2)*

### Explicação (em português claro)

Hoje, cada release exige editar a versão **manualmente em vários sítios** (`package.json`, `preload.ts`, barra de estado, modal Sobre, exemplo OpenAPI). Isto **não é um bug** — funciona — mas é trabalho repetitivo e risco de um sítio ficar desactualizado.

**Problema que resolve:** um único `npm run bump-version 1.0.0-alpha.4` (ou a versão seguinte) propaga o número para todos os ficheiros.

**Não é:** corrigir versão errada na app (desde que edites todos os ficheiros no bump, está coerente).

### Já existe

- `package.json` como fonte npm.
- `server/health.ts` lê versão de `package.json` em runtime.
- `scripts/resolve-release-version.mjs` sincroniza versão no CI de release.

### Antes vs depois *(alpha.2)*

| Antes | Depois |
|-------|--------|
| Versão em 5+ ficheiros editados à mão | `shared/app-version.ts` gerado por `sync-app-version.mjs` |
| Risco de divergência UI / OpenAPI / preload | `npm run bump-version -- <versão>` + `build` corre sync |

### Implementado *(alpha.2)*

- `scripts/bump-version.mjs` — actualiza `package.json` + lock e chama `sync-app-version`.
- `scripts/sync-app-version.mjs` — propaga para `shared/app-version.ts`, `electron/preload.ts`, `openapi.yaml`; corre no `build` e no CI (`resolve-release-version`).
- `StatusBar.vue` / `AboutModal.vue` — importam `APP_VERSION` de `@shared/app-version`; fallback `bridge.version` no Electron.
- `npm run bump-version`, `npm run sync:version`, `npm run smoke:version`.

### Tarefas *(alpha.2)*

- [x] Script `scripts/bump-version.mjs` (ou Vite `define`) propaga `package.json` → preload, OpenAPI exemplo, constantes Vue.
- [x] Remover `APP_VERSION` hardcoded; operador usa `bridge.version` ou import gerado no build.
- [x] Entrada `npm run bump-version` em `package.json`.
- [x] Smoke: versão em `/health`, barra de estado e modal «Sobre» coincidem com `package.json`.

---

## 10. Smoke do instalador Windows no CI ✅ *(concluído em alpha.3 — SM-035)*

### Explicação

Existem **dois níveis** de teste do instalador Windows:

| Nível | O quê | Estado |
|-------|--------|--------|
| **A. Manual** | Descarregar `.exe`, instalar, abrir app | ✅ Validado (secção 2) |
| **B. Automático no CI** | `scripts/smoke-win-installer.mjs --skip-build` após `dist:win` | ✅ `npm run smoke:win-installer:ci` em `release.yml` |

### Implementado

- `npm run smoke:win-installer` (build + instalar) e `npm run smoke:win-installer:ci` (artefacto já em `release-builds/`).
- Job `build-windows` corre o smoke CI após anexar o NSIS ao draft.
- Documentado em [`scripts/README.md`](scripts/README.md).

### Tarefas

- [x] Entrada **`npm run smoke:win-installer`** em `package.json`.
- [x] Passo no job `build-windows` após `dist:win`.
- [x] Documentar em [`scripts/README.md`](scripts/README.md).

---

## 11. Import/export do repertório completo ✅ *(concluído em alpha.2)*

### Explicação (em português claro)

**Isto confunde-se com Backup — são coisas diferentes:**

| Funcionalidade | Existe? | Para quê |
|----------------|---------|----------|
| **Backup/restore** (`Configurações → Backup`) | ✅ Sim | Copiar **todo** o ambiente ou grupos (`database`, imagens, vídeos…) para outra máquina ou recuperação |
| **Export/import só de louvores** (JSON no painel Músicas) | ✅ Sim | Partilhar **só repertório** (categorias/músicas/versos) com outra igreja, editar num editor de texto, importar selecção |

O grupo `database` do backup **inclui** todas as músicas — mas o ficheiro é um **ZIP de backup**, não um export amigável para o painel Louvor.

**Resposta directa:** backup de repertório **sim** (via BD); export granular de louvores **sim** (`GET/POST /musica/export|import` + Configurações → Backup e restauração).

### Já existe

- **Backup/restore selectivo** (`/api/backup`, `/api/restore`): grupo `database` inclui `dsw.bd` com todo o repertório SQLite.
- UI admin de backup com grupos (`database`, `media_*`, `themes`, etc.).

Isto serve **migrar ambiente inteiro**, não exportar só louvores para partilhar/editar JSON.

### Implementado *(alpha.2)*

- `core/music/repertoire.ts` — export/import com formato `livepraise-music-repertoire`.
- `GET /musica/export` e `POST /musica/import` — filtros por categoria ou IDs; conflitos `remap` / `skip` / `overwrite`.
- UI Configurações → Backup e restauração — exportar categoria/tudo; importar JSON (limite 8 MB).
- `apps/operator/src/composables/useMusicRepertoireTransfer.ts`.
- Smoke `npm run smoke:musica-export`.

### Tarefas *(alpha.2)*

- [x] `GET /musica/export` e `POST /musica/import` (JSON versionado `livepraise-music-repertoire`).
- [x] UI em Configurações → Backup e restauração: exportar categoria / tudo / importar JSON.
- [x] Validação de schema, conflitos de ID (`remap`/`skip`/`overwrite`) e limite de 8 MB.
- [x] Smoke: export → import em BD limpa → mesma contagem de versos.
- [x] Entrada `npm run smoke:musica-export`.

---

## 12. Acessibilidade (WCAG) no operador 📅 *(versão futura)*

> **Decisão (mantida):** não fazer auditoria WCAG nesta linha alpha. Mantêm-se tema **alto contraste** e `aria-*` pontuais. Painel **Atalhos** existe in-app (`ShortcutsPanel.vue`); falta página no README.

### Explicação (em português claro)

**Não está implementado como programa de acessibilidade** — existem apenas **peças isoladas**:

| Peça | Estado |
|------|--------|
| Tema **alto contraste** (`high-contrast`) | ✅ Utilizável hoje |
| Alguns atributos **`aria-*`** (ex. slider de fonte) | ✅ Pontual |
| Biblioteca **`axe-core`** no `package.json` | 🟡 Instalada, **nunca corre** (sem `npm run a11y`) |
| Auditoria WCAG (contraste, teclado, labels em fila/login) | ❌ Não feita |
| Correcções sistemáticas antes de beta | ❌ Não feitas |

Ou seja: há **suporte básico**, mas **não** cumpre WCAG de forma verificada.

### Já existe

- Tema `high-contrast` bundled.
- `axe-core` em devDependencies (não wired a script npm).
- Alguns `aria-*` pontuais (ex.: slider escala de fonte em `AppearancePanel.vue`).

### O que falta *(planeado — versão futura)*

Auditoria sistemática + correcções — não confundir com «já tem tema alto contraste».

### Tarefas *(backlog — versão futura)*

- [ ] Script `npm run a11y:operator` (axe + jsdom ou Playwright).
- [ ] Corrigir issues críticos em fila, login e painéis de projeção.
- [ ] Documentar atalhos de teclado no README ou help in-app.

---

## 13. Auto-update validado por SO ✅ *(concluído em alpha.3 — Windows)*

### Explicação

O auto-update está em `electron/updater.ts` (`electron-updater`, `latest*.yml`). O item era **validar o fluxo in-app** (não só instalar do zero).

| Cenário | Estado |
|---------|--------|
| Instalar alpha.3 numa máquina limpa | ✅ NSIS |
| Actualizar **alpha.2 → alpha.3 dentro da app** (Windows) | ✅ Detectou actualização, download em segundo plano |
| Progresso e instalação na UI do operador | ✅ Faixa `AppUpdateBanner` (percentagem + **Instalar agora**) |
| Linux / macOS in-app | Não testado nesta ronda — código partilhado; opcional |

Draft no GitHub **não** alimenta o updater; só release **publicada**.

### Implementado

- `electron-updater` + provider GitHub; `latest*.yml` no job Windows.
- Eventos IPC `livepraise:update-status` (checking, available, downloading com %, ready, installing, error, idle se não houver update).
- UI: `apps/operator/src/components/AppUpdateBanner.vue` + `useAppUpdater.ts`.
- Notificações do SO mantêm-se como complemento.

### Tarefas

- [x] Publicar release e confirmar que o updater oferece a versão nova (Windows).
- [x] Teste in-app: versão anterior → download → (faixa de progresso / instalar agora ou ao encerrar).
- [x] Mostrar progresso de download e estado de instalação no operador.
- [ ] (Opcional) Repetir o teste em Linux e macOS.
- [ ] (Opcional) Smoke headless de `latest.yml` + hashes.

---

## 14. Flash textfill ao trocar verso ✅ *(concluído em alpha.2)*

### Sintoma

Ao **projectar o verso seguinte** (ou anterior) em louvor ou Bíblia, a tela **pisca**: o público vê brevemente o texto num **tamanho incorrecto** (tipicamente pequeno) e só depois o **tamanho final** do textfill. O ideal é **não expor** essa transição — mostrar directamente o verso já dimensionado.

### Onde se manifesta

| Superfície | Ficheiros relevantes |
|------------|-------------------|
| **Projetor** | `apps/projector/src/projector.ts` — `viewMusica` / `viewBiblia` → `innerHTML` + `typography.scheduleRefresh()` |
| **Retorno de palco** | `apps/stage-return/` + `refreshOutputTextfillAll` |
| **Pré-visualizações operador** | `PreviewOutputTile.vue`, `ProjectionTypographyPreview.vue` |
| **Motor textfill** | `shared/projection-textfill.ts` (`.js`), `shared/projection-typography-runtime.js` |

### Causa provável

1. O HTML do verso é **inserido visível** (`content.innerHTML = …`) **antes** do textfill assíncrono correr.
2. O textfill mede começando em `minFontPx` (binary search) — mesmo com `visibility: hidden` no `<span>`, o contentor ou estilos intermédios podem ficar expostos entre frames.
3. **`runRefreshTextfill`** faz **duas passagens** (layout + grid) — risco de flash entre passagens.
4. `refreshOutputTextfillAll` já oculta `rootEl` durante o cálculo; o **projetor** (`refreshOutputTextfill` num único `.content`) pode não aplicar o mesmo padrão.

### Como deve funcionar

1. Ao receber `viewMusica` / `viewBiblia`, o conteúdo projectado permanece **oculto** (ou mostra o frame anterior congelado) até o textfill terminar.
2. Só então revela o verso com **`fontSize` final** já aplicado.
3. Sem flash perceptível ao avançar/recuar versos com textfill activo.
4. Comportamento consistente em projetor, retorno e pré-visualizações (mesmo motor em `shared/`).

### Implementado *(alpha.2)*

- `runRefreshTextfill` oculta o root (`visibility: hidden`) durante **ambas** as passagens de medição, com `suppressVisibilityToggle: true` no binary search.
- Projetor, retorno de palco, `/live` e external-display: `visibility: hidden` **antes** de `innerHTML` ao trocar verso.
- `PreviewOutputTile.vue`: padrão `previewReady` + `opacity-0` (paridade `ProjectionTypographyPreview.vue`).
- Teste `tests/projection-textfill-visibility.test.mjs` integrado em `npm run smoke:textfill`.

### Tarefas *(alpha.2)*

- [x] Reproduzir manualmente: projetor + louvor com textfill ON → avançar 5 versos; confirmar flash antes/depois.
- [x] Ocultar área de conteúdo durante `scheduleRefresh` / `refreshOutputTextfill` até `fontSize` final (padrão alinhado a `refreshOutputTextfillAll`: `visibility: hidden` no root ou `opacity: 0` + `requestAnimationFrame`).
- [x] Garantir que o binary search **nunca** deixa tamanho intermédio visível (revisar `suppressVisibilityToggle` e passagem dupla em `runRefreshTextfill`).
- [x] Aplicar mesma correcção em **stage-return** e tiles de pré-visualização se reproduzirem o bug.
- [x] Regressão: verso curto, verso longo, Bíblia multi-linha, textfill desactivado (deve usar `maxFontPx` sem regressão).

**Critério de sucesso:** operador avança versos durante culto simulado — audiência **não vê** redimensionamento intermédio; apenas o texto final estável.

### Follow-up alpha.3 *(medição e cifras)*

- Medição **in-place** no span real (`scrollHeight` / `scrollWidth`); deixa de inflar para 24px após uma pass válida.
- Diagnóstico JSONL — secção **16**.
- Cifras: só linhas em que **todas** as palavras são acordes (`shared/projection-chords.ts` + `tests/projection-chords.test.mjs`).

---

## 15. Fila partilhada entre operadores ✅ *(concluído em alpha.3)*

### O que faz

Vários operadores na mesma LAN podem **ligar a sincronização da fila** (abas estilo Chrome). O estado vive na BD (`009_operator_queue_state.sql`), com revisão optimista: `PUT` com `expectedRevision` devolve **409** se outro operador gravou entretanto.

### Implementado

- `GET` / `PUT` **`/api/operator-queue`** (`server/routes/operator-queue.ts`).
- Broadcast WebSocket **`operator-queue-sync`**.
- UI: `useOperatorQueueSync.ts`.
- OpenAPI: operações na spec.
- `npm run smoke:queue-sync` · `tests/operator-queue/store.test.mjs`.

Isto **não** é sincronização multi-estação completa (preferências, mídia, utilizadores em vários PCs).

---

## 16. Diagnóstico de textfill ✅ *(concluído em alpha.3; OpenAPI parcial)*

### Implementado

- Ficheiro `~/livepraise/textfill-diagnostics.jsonl`.
- API `/api/system/textfill-diagnostics` (GET/POST/DELETE + `/meta`).
- UI em Configurações → Logs de erro (activar, exportar, limpar).
- Inclusão no backup selectivo.

### Ainda pendente *(documentação)*

- [ ] Incluir estas rotas (e, se fizer sentido, backup/tipografia) em `openapi.yaml` + `scripts/verify-openapi-coverage.mjs`. Hoje o gate conta **70** operações e **não** lista diagnóstico, backup nem `projection-typography`.

---

## Metodologia

1. Varredura de `server/`, `apps/`, `web/`, `core/`, `shared/`, `.github/workflows/` e scripts `smoke-*.mjs`.
2. Confronto com o repositório em **2026-08-30** (`package.json` = `1.0.0-alpha.3`).
3. Lista canónica OpenAPI: **70** operações em `scripts/verify-openapi-coverage.mjs` (backup, tipografia e textfill-diagnostics **fora** desta lista).
4. Smokes: `smoke:audit`, `smoke:locales`, `smoke:video-watcher`, `smoke:musica-export`, `smoke:version`, `smoke:legacy-upgrade`, `smoke:queue-sync`, `smoke:win-installer:ci`.

---
