# Inventário pendente — Live Praise

**Versão analisada:** `1.0.0-alpha.2`  
**Última atualização:** 2026-06-07  
**Repositório:** `electron/`, `server/`, `core/`, `apps/`, `web/`, `shared/`

Backlog do que **ainda não está implementado** (ou está só parcialmente). Cada entrada indica o **estado actual**, **como deve funcionar** quando incompleto, e **tarefas** restantes.

**Legenda:** ✅ implementado · 🟡 parcial · ❌ pendente · 🎯 **escopo confirmado alpha.2** · 📅 **versão futura** (não alpha.2)

---

## Resumo executivo

| # | Item | Estado | Notas (alpha.2) |
|---|------|--------|-----------------|
| 0 | Migração v0.0.8 → 1.x | ✅ | `legacy-upgrade.ts` + `smoke:legacy-upgrade` |
| 1 | Auditoria e retenção | ✅ | `audit_logs`, purge diário, `GET /api/audit/logs`, `smoke:audit` |
| 2 | Release GitHub | ✅ | Validado manualmente alpha.2 — draft unificado, instaladores Win/Linux/macOS OK |
| 3 | Testes automatizados | 📅 | **Fora do escopo alpha.2** — smokes actuais bastam; Vitest/Playwright numa versão futura |
| 4 | Locales adicionais | ✅ | `en-US` + labels legíveis; `pt-BR` default inalterado; `smoke:locales` |
| 5 | Watcher de vídeos | ✅ | `videoWatcher.ts` + WS `media-updated` → `VideosPanel`; `smoke:video-watcher` |
| 6 | Busca online de louvores | 📅 | **Fora do escopo alpha.2** — Fuse.js local; busca online numa versão futura |
| 7 | Editor visual de temas | 📅 | **Fora do escopo alpha.2** — leitura/sync OK; editor UI numa versão futura |
| 8 | Telemetria opt-in | 📅 | **Fora do escopo alpha.2** — log local existe; envio remoto opt-in no futuro |
| 9 | Versão única no build | ✅ | `bump-version` + `sync:version`; `package.json` → preload, UI, OpenAPI |
| 10 | Smoke instalador Windows | 🟡 | **Automação CI** — tu já testaste à mão; falta script no workflow (opcional) |
| 11 | Import/export repertório | 🎯 | **Confirmado alpha.2** — export/import JSON no painel Louvor (≠ backup ZIP) |
| 12 | Acessibilidade WCAG | 📅 | **Fora do escopo alpha.2** — parcial hoje; auditoria WCAG numa versão futura |
| 13 | Auto-update validado | 🟡 | **Código ✅**; falta testar *update* de versão antiga→nova por SO (não só instalador) |
| 14 | Flash textfill ao trocar verso | ✅ | Root oculto durante textfill; sem flash ao trocar versos |

### Escopo confirmado **alpha.2**

| # | Item | Entregáveis mínimos |
|---|------|---------------------|
| ~~**1**~~ | ~~**Auditoria e retenção**~~ | ✅ Concluído — migration 008, `core/audit`, `core/retention`, API admin |
| ~~**4**~~ | ~~**Locales adicionais**~~ | ✅ Concluído — `en-US`, `locales/README.md`, selector com rótulos |
| ~~**14**~~ | ~~**Flash textfill ao trocar verso**~~ | ✅ Concluído — `runRefreshTextfill` oculta root; projetor/retorno/live/espaços externos |
| ~~**5**~~ | ~~**Watcher de vídeos**~~ | ✅ Concluído — fs.watch recursivo, debounce, `media-updated` |
| ~~**9**~~ | ~~**Versão única no build**~~ | ✅ Concluído — `bump-version`, `sync:version`, `smoke:version` |
| **11** | **Import/export repertório** | API + UI Louvor; export/import JSON de categorias/músicas/versos; smoke |

### Fora do escopo **alpha.2** *(confirmado — versão futura)*

| # | Item | Notas |
|---|------|--------|
| **3** | **Testes automatizados (Vitest + Playwright)** | Smokes + testes Node em `tests/` mantêm-se como gate; suite formal fica para release posterior |
| **6** | **Busca online de louvores** | Pesquisa local Fuse.js mantém-se; API online (TeraIDC ou alternativa) numa versão futura |
| **7** | **Editor visual de temas** | Temas bundled + sync OK; color pickers / `custom.json` numa versão futura |
| **8** | **Telemetria opt-in de crashes** | Log local de erros mantém-se; envio anónimo opt-in (Sentry/DSN) numa versão futura |
| **12** | **Acessibilidade WCAG** | Tema alto contraste mantém-se; auditoria sistemática + script `a11y` numa versão futura |

### Candidatos naturais para **alpha.2** (ainda a confirmar)

Itens 🟡 com lacuna pequena e alto impacto operacional:

1. **Secção 10** — integrar `smoke-win-installer.mjs` no job Windows do `release.yml` (validação manual já feita; falta automatizar no CI).

---

## 0. Migração v0.0.8 → 1.x ✅ *(concluído em alpha.2)*

### Implementado

- Detecção de base legada sem `schema_migrations` (`server/db/legacy-upgrade.ts`).
- Backup automático em `~/livepraise/backup/auto-upgrade/` e quarentena `dsw.bd.corrupt-*`.
- Integração no arranque (`prepareLegacyDatabaseFile` em `server/index.ts`).
- Smoke **`npm run smoke:legacy-upgrade`**.

### Manutenção (opcional)

- [ ] Documentar fluxo no README secção migração (hoje só no CHANGELOG).
- [ ] Incluir `smoke:legacy-upgrade` no job CI de PR (hoje só no CHANGELOG como recomendação pré-release).

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

**Smokes no CI de release (parcial):**

| Job | Smokes actuais |
|-----|----------------|
| Windows | `test:video-pipeline`, `smoke:bootstrap` |
| Linux / macOS | + `smoke:fase8` |
| Nenhum job | `smoke:release` completo, `smoke:legacy-upgrade`, `smoke-win-installer` |

**Publicação:** draft gerado pelo CI → validação manual ✅ → **Publish release** no GitHub quando quiser tornar pública (auto-update só activo após publish).

### Manutenção opcional *(não bloqueia alpha.2)*

Melhorias de **regressão automática** — o fluxo principal já está validado:

#### Lacunas de automação no CI

| Lacuna | Situação actual | Prioridade |
|--------|-----------------|------------|
| **`smoke-win-installer` no CI** | Script existe; validação manual OK; **não** corre no job Windows | Média (secção 10) |
| **`smoke:fase8` no Windows** | Só Linux/macOS no release workflow | Baixa |
| **`smoke:release` / `legacy-upgrade` no CI release** | Gate README não corre no pipeline de release | Baixa |
| **Snap / Flatpak no CI** | Build manual opcional | Baixa |
| **Assinatura de código** | Instaladores funcionam; avisos de publisher | Pós-beta |
| **SHA256 nas notas** | Manual opcional | Baixa |

#### Tarefas opcionais

- [ ] Integrar `smoke-win-installer` no job `build-windows` (secção 10).
- [ ] Alinhar smokes Windows com Linux/macOS (`smoke:fase8`).
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

## 3. Testes automatizados (além de smokes) 📅 *(versão futura — não alpha.2)*

> **Decisão alpha.2:** não implementar Vitest nem Playwright nesta versão. Os smokes existentes (`ci.yml`, `smoke:release`) continuam como gate de qualidade até uma release dedicada a testes formais.

### Já existe

- Smokes por feature (`scripts/smoke-cad*.mjs`, `smoke:legacy-upgrade`, gate `npm run smoke:release`).
- CI PR: `ci.yml` corre `test:video-pipeline`, `smoke:bootstrap`, `smoke:fase8`.
- Testes pontuais em `tests/` (temas, sanitização remote-fetch, redacção URLs error log) — runner Node nativo, **sem** Vitest.

### O que falta *(planeado — versão futura)*

Suite **Vitest** para `core/` e `shared/` e **Playwright** (ou equivalente) para fluxos críticos do operador. Job dedicado `test.yml` em PR; falha bloqueia merge.

### Tarefas *(backlog — não alpha.2)*

- [ ] Adicionar Vitest + config mínima.
- [ ] Testes unitários: `bible-reference`, `queue-items`, `sanitize` projection, `sessions.purge`.
- [ ] Playwright: arrancar `dev:server`, abrir operador, login loopback, projectar música mock.
- [ ] Job GHA `test.yml` em PR (hoje smokes vivem só em `ci.yml`).
- [ ] Integrar com `smoke:release` (smokes permanecem gate de release).

---

## 4. Locales adicionais ✅ *(concluído em alpha.2)*

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

1. Operador abre Configurações → Idioma e vê **pt-BR** (predefinido) mais locales instalados (ex.: **English (en-US)**).
2. Ao escolher outro idioma, o operador carrega `/locales/{code}.json` e persiste a preferência; **reinício** mantém a escolha.
3. Chaves em falta num locale secundário caem no **fallback `pt-BR`** (vue-i18n).
4. Portal/web views podem continuar `lang="pt-BR"` no HTML estático nesta versão; tradução do portal fica fora do MVP se não houver ficheiros em `web/`.

### Implementado *(alpha.2)*

- `locales/en-US.json` + `install/locales/en-US.json` — 543 chaves em paridade com `pt-BR`.
- `scripts/build-en-us-locale.mjs` — regenera `en-US` a partir de `pt-BR` (mapa de traduções).
- Rótulos `locales.meta.*` + `useLocaleLabel()` em `AppearancePanel.vue` e `StatusBar.vue`.
- `locales/README.md` — processo para idiomas futuros.
- Smoke `npm run smoke:locales` (`scripts/smoke-locales-i18n.mjs`).
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

**Fora do MVP alpha.2 (opcional):**

- [ ] Traduções do portal (`web/`) e vistas externas.
- [ ] `es` ou outros idiomas além de `en-US`.
- [ ] Script `node scripts/verify-locale-keys.mjs` reutilizável em CI.

---

## 5. Detecção automática de vídeos na pasta (watcher) ✅ *(concluído em alpha.2)*

### Já existe

- Ao **listar** categoria (`GET /video/categoria/:codigo`) ou **importar**, o servidor agenda pipeline ffmpeg (`videoPipeline.ts`).
- Painel **Vídeos**: polling a cada 3 s **enquanto** há conversões na lista actual (`VideosPanel.vue`).

Isto cobre upload pelo operador e ficheiros descobertos ao **mudar de categoria** ou reabrir o painel.

### O que falta

Copiar vídeo para `~/livepraise/videos/{categoria}/` **com painel já aberto** → operador não vê o ficheiro até recarregar manualmente.

### Como deve funcionar

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

## 6. Busca online de louvores 📅 *(versão futura — não alpha.2)*

> **Decisão alpha.2:** não implementar busca online nesta versão. O painel Louvor mantém **pesquisa local** (Fuse.js) como hoje.

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

## 7. Editor visual de temas 📅 *(versão futura — não alpha.2)*

> **Decisão alpha.2:** não implementar editor visual nesta versão. Operador continua a escolher temas bundled (`default`, `high-contrast`) ou editar `theme.json` manualmente em `~/livepraise/themes/`.

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

## 8. Telemetria opt-in de crashes 📅 *(versão futura — não alpha.2)*

> **Decisão alpha.2:** não implementar envio remoto nesta versão. O **log de erros local** (`/api/system/error-log`) mantém-se como hoje.

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

**Problema que resolve:** um único `npm run bump-version 1.0.0-alpha.3` propagaria o número para todos os ficheiros.

**Não é:** corrigir versão errada na app (desde que edites todos os ficheiros no bump, está coerente).

### Já existe

- `package.json` como fonte npm.
- `server/health.ts` lê versão de `package.json` em runtime.
- `scripts/resolve-release-version.mjs` sincroniza versão no CI de release.

### O que falta *(alpha.2)*

| Ficheiro | Hoje |
|----------|------|
| `package.json` | Fonte principal ✅ |
| `server/health.ts` | Lê `package.json` em runtime ✅ |
| `electron/preload.ts` | `'1.0.0-alpha.2'` hardcoded |
| `StatusBar.vue` / `AboutModal.vue` | `APP_VERSION` hardcoded |
| `openapi.yaml` | exemplo hardcoded |

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

## 10. Smoke do instalador Windows no CI 🟡

### Explicação (em português claro)

Existem **dois níveis** de teste do instalador Windows:

| Nível | O quê | Estado |
|-------|--------|--------|
| **A. Manual** | Descarregar `.exe`, instalar, abrir app | ✅ **Tu já validaste** (secção 2) |
| **B. Automático no CI** | Script `smoke-win-installer.mjs` corre sozinho no GitHub Actions após cada build | ❌ Ainda não ligado |

O script **B** repete o que fizeste à mão (desinstalar → instalar NSIS → verificar arranque). Serve para **regressões futuras** — se alguém quebrar o instalador, o CI falha antes de publicar.

**Não é obrigatório para alpha.2** se o teste manual já passou; é hardening do pipeline.

### Já existe

- Script **`scripts/smoke-win-installer.mjs`**: desinstalar → build → instalar NSIS → boot + CAD-194.
- Job Windows em `release.yml` verifica tamanho do `.exe` e presença de `ffmpeg.exe` no unpacked — **não** executa ciclo de instalação.

### O que falta *(automação opcional)*

- [ ] Entrada **`npm run smoke:win-installer`** em `package.json`.
- [ ] Passo no job `build-windows` após `dist:win`.
- [ ] Documentar em [`scripts/README.md`](scripts/README.md).

---

## 11. Import/export do repertório completo 🎯 *(escopo alpha.2)*

### Explicação (em português claro)

**Isto confunde-se com Backup — são coisas diferentes:**

| Funcionalidade | Existe? | Para quê |
|----------------|---------|----------|
| **Backup/restore** (`Configurações → Backup`) | ✅ Sim | Copiar **todo** o ambiente ou grupos (`database`, imagens, vídeos…) para outra máquina ou recuperação |
| **Export/import só de louvores** (JSON no painel Músicas) | ❌ Não | Partilhar **só repertório** (categorias/músicas/versos) com outra igreja, editar num editor de texto, importar selecção |

O grupo `database` do backup **inclui** todas as músicas — mas o ficheiro é um **ZIP de backup**, não um export amigável para o painel Louvor.

**Resposta directa:** backup de repertório **sim** (via BD); export granular de louvores **não**.

### Já existe

- **Backup/restore selectivo** (`/api/backup`, `/api/restore`): grupo `database` inclui `dsw.bd` com todo o repertório SQLite.
- UI admin de backup com grupos (`database`, `media_*`, `themes`, etc.).

Isto serve **migrar ambiente inteiro**, não exportar só louvores para partilhar/editar JSON.

### O que falta *(alpha.2)*

Export/import **granular** a partir do painel Louvor (caso de uso distinto do backup ZIP).

### Tarefas *(alpha.2)*

- [x] `GET /musica/export` e `POST /musica/import` (JSON versionado `livepraise-music-repertoire`).
- [x] UI em Louvor: Exportar selecção / categoria / Importar ficheiro.
- [x] Validação de schema, conflitos de ID (`remap`/`skip`/`overwrite`) e limite de 8 MB.
- [x] Smoke: export → import em BD limpa → mesma contagem de versos.
- [x] Entrada `npm run smoke:musica-export`.

---

## 12. Acessibilidade (WCAG) no operador 📅 *(versão futura — não alpha.2)*

> **Decisão alpha.2:** não implementar auditoria WCAG nesta versão. Mantêm-se tema **alto contraste** e melhorias pontuais já existentes.

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

## 13. Auto-update validado por SO 🟡

### Explicação (em português claro)

**O auto-update já está implementado no código** (`electron-updater`, `latest*.yml`, notificações). Isto **não** é «falta implementar updater».

O item refere-se a **validar o fluxo completo de actualização** — cenário diferente de «instalar a app pela primeira vez» (que tu já testaste na secção 2):

| Cenário | Testaste? | O quê |
|---------|-----------|--------|
| Instalar **alpha.2** numa máquina limpa | ✅ (secção 2) | NSIS / AppImage / DMG funciona |
| **Actualizar** de alpha.1 → alpha.2 **dentro da app** (updater) | ❓ Pendente | App antiga abre → detecta release **publicada** → descarrega → reinicia na nova versão |

Enquanto a release estiver em **draft**, o updater **não entrega** aos utilizadores — só após **Publish release** no GitHub.

### Já existe

- `electron-updater` + provider GitHub (`electron-builder.yml`).
- Windows gera `latest*.yml`; CI verifica presença no job Windows.
- README descreve comportamento (draft vs publicado, fallback manual).

### O que realmente falta

1. **Publicar** a release (sair do draft) — senão o updater não activa para utilizadores reais.
2. **Teste manual por SO** (checklist curto):
   - [ ] Windows: instalar versão **anterior publicada** → abrir app → confirmar download/instalação silenciosa ou notificação de fallback.
   - [ ] Linux: idem com AppImage ou `.deb` (conforme canal usado).
   - [ ] macOS: idem com DMG + versão anterior.
3. (Opcional) Script que valida `latest.yml` + hashes nos artefactos do release.

**Não falta:** reescrever `electron-updater` — já está ligado em `electron/updater.ts`.

### Tarefas *(backlog)*

- [ ] Checklist de teste manual Win/Linux/macOS na secção 2 ou README.
- [ ] (Opcional) Smoke headless que valida `latest.yml` e hashes no artefacto.

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
- Teste `tests/projection-textfill-visibility.test.mjs` integrado em `smoke:cad313`.

### Tarefas *(alpha.2)*

- [x] Reproduzir manualmente: projetor + louvor com textfill ON → avançar 5 versos; confirmar flash antes/depois.
- [x] Ocultar área de conteúdo durante `scheduleRefresh` / `refreshOutputTextfill` até `fontSize` final (padrão alinhado a `refreshOutputTextfillAll`: `visibility: hidden` no root ou `opacity: 0` + `requestAnimationFrame`).
- [x] Garantir que o binary search **nunca** deixa tamanho intermédio visível (revisar `suppressVisibilityToggle` e passagem dupla em `runRefreshTextfill`).
- [x] Aplicar mesma correcção em **stage-return** e tiles de pré-visualização se reproduzirem o bug.
- [x] Regressão: verso curto, verso longo, Bíblia multi-linha, textfill desactivado (deve usar `maxFontPx` sem regressão).
- [ ] (Opcional) Nota em [`CHANGELOG.md`](CHANGELOG.md) secção Corrigido após merge.

**Critério de sucesso:** operador avança versos durante culto simulado — audiência **não vê** redimensionamento intermédio; apenas o texto final estável.

---

## Metodologia

1. Varredura de `server/`, `apps/`, `web/`, `core/`, `shared/`, `.github/workflows/` e scripts `smoke-*.mjs`.
2. Confronto com o estado actual do repositório (2026-06-07).
3. `node scripts/verify-openapi-coverage.mjs` — **64** endpoints HTTP alinhados.

---
