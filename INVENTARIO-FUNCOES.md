# Inventário pendente — Live Praise

**Versão analisada:** `1.0.0-alpha.1`  
**Última atualização:** 2026-05-28  
**Repositório:** `electron/`, `server/`, `core/`, `apps/`, `web/`, `shared/`

Backlog do que **ainda não está implementado** (ou está só parcialmente). Cada entrada traz **como deve funcionar** e **tarefas** prontas para execução.

---

## 1. Auditoria e retenção de dados

### Como deve funcionar

Acções sensíveis (login, CRUD utilizadores, alterações de dispositivos, exportações) geram registos em `audit_logs`. Jobs periódicos aplicam retenção: contas desactivadas (30 dias), logs de auditoria (90 dias), dispositivos externos inactivos (180 dias), além do `purgeExpiredSessions` já existente.

### Tarefas

- [ ] Migration SQLite `audit_logs` (utilizador, acção, recurso, IP, timestamp).
- [ ] Helper `core/audit/log.ts` e chamadas nos routers `auth`, `users`, `devices`.
- [ ] `core/retention/purge.ts` + agendamento no arranque do servidor (ou cron interno diário).
- [ ] Painel admin opcional: listar últimos N registos (somente `admin`).
- [ ] Documentar prazos de retenção e OpenAPI se exposto.
- [ ] Smoke: criar utilizador → entrada em `audit_logs`; simular conta antiga → purge.

---

## 2. Release GitHub (artefactos multi-OS)

### Já existe

Workflows **CA-R40** em `.github/workflows/` (`car40-windows.yml`, `car40-macos.yml`, `car40-linux.yml`): smokes, build e upload de artefactos por SO. Comandos `npm run dist:*` e documentação em [`README.md`](README.md) / [`scripts/README.md`](scripts/README.md).

### O que falta

Executar o **checklist operacional** em cada tag/release real (não só CI verde) e fechar lacunas opcionais (Snap, Flatpak, assinatura de código).

| Plataforma | Comando | Artefacto (`release-builds/`) |
|------------|---------|--------------------------------|
| Windows x64 | `npm run dist:win` | NSIS (`.exe`) + `latest*.yml` |
| macOS | `npm run dist:mac` | DMG (x64 + arm64) |
| Linux x64 | `npm run dist:linux` | AppImage + `.deb` + `.rpm` + `.pacman` |
| Linux (só AppImage) | `npm run dist:linux-appimage` | AppImage |
| Linux (só deb/rpm/pacman) | `dist:linux-deb` / `dist:linux-rpm` / `dist:linux-pacman` | Pacote nativo |
| Linux Flatpak | `npm run dist:flatpak` | `.flatpak` (requer `flatpak-builder`) |
| Linux (opcional) | `npm run dist:snap` | Snap |
| **Todos (1 comando)** | `npm run dist:all` | Win + Linux (+ DMG no Mac; snap/flatpak no Linux se instalados) |

**Antes de publicar**, correr `npm run smoke:release` (bootstrap + pipeline vídeo + smoke fase 8). Isto valida o servidor e o fluxo ao vivo; **não substitui** abrir o instalador empacotado numa máquina limpa.

**Publicação:** `GH_TOKEN` + `npm run dist:<plataforma> -- --publish always` (provider `github` em `electron-builder.yml`). Assinatura de código (Windows/macOS) só se certificados estiverem configurados; hoje o build Windows usa `signAndEditExecutable: false`.

### Checklist (cada tag/release)

- [ ] CI verde em `main` (workflows Windows, macOS e Linux).
- [ ] `npm run smoke:release` localmente ou confirmar smokes equivalentes no CI.
- [ ] Windows: workflow `CA-R40 Windows` ou `npm run dist:win` — verificar `.exe` e `latest*.yml` em `release-builds/`.
- [ ] macOS: workflow `CA-R40 macOS` ou `npm run dist:mac` — verificar `.dmg` (x64/arm64).
- [ ] Linux: workflow `CA-R40 Linux` ou `npm run dist:linux` — verificar AppImage, `.deb`, `.rpm`, `.pacman`; testar instalação numa máquina limpa.
- [ ] Snap / Flatpak (opcional): `npm run dist:snap` / `dist:flatpak`, ou incluídos em `dist:all` no Linux com ferramentas instaladas.
- [ ] Bump `version` em `package.json`; notas de release (changelog) no GitHub Release.
- [ ] Publicar com `dist:* -- --publish always` ou anexar artefactos manualmente ao Release.
- [ ] (Opcional) Registar SHA256 dos ficheiros nas notas do release.

---

## 3. Testes automatizados (além de smokes)

### Já existe

- Smokes por feature (`scripts/smoke-cad*.mjs`, gate `npm run smoke:release`).
- Testes pontuais em `tests/` (temas, sanitização remote-fetch, redacção de URLs no error log) via runner Node nativo.

### O que falta

Suite **Vitest** para `core/` e `shared/` (auth, referências bíblicas, fila, sanitização) e **Playwright** (ou equivalente) para fluxos críticos do operador: login, projectar verso, freeze, import playlist. CI corre em PR; falha bloqueia merge.

### Tarefas

- [ ] Adicionar Vitest + config mínima.
- [ ] Testes unitários: `bible-reference`, `queue-items`, `sanitize` projection, `sessions.purge`.
- [ ] Playwright: arrancar `dev:server`, abrir operador, login loopback, projectar música mock.
- [ ] Job GHA `test.yml` em PR.
- [ ] Integrar com `smoke:release` (smokes permanecem como gate de release).

---

## 4. Locales adicionais

### Como deve funcionar

Além de `pt-BR`, pelo menos **en-US** (e opcionalmente `es`) com paridade de chaves em `locales/*.json`. O operador e o portal permitem escolher idioma; `GET /locales/:code` serve ficheiros instalados.

### Tarefas

- [ ] Criar `locales/en-US.json` a partir de `pt-BR.json` (tradução ou cópia inicial).
- [ ] `core/locales/resolve.ts`: listar locales disponíveis.
- [ ] Selector em `AppearancePanel.vue` (já existe infra de locale).
- [ ] Copiar para `install/locales/` no bootstrap.
- [ ] Smoke: `GET /locales/en-US.json` → 200.

---

## 5. Detecção automática de vídeos na pasta (watcher)

### Já existe

- Ao **listar** uma categoria (`GET /video/categoria/:codigo`) ou **importar** ficheiro/URL, o servidor agenda o pipeline ffmpeg (`videoPipeline.ts`: thumb + MP4).
- O painel **Vídeos** mostra progresso e faz polling a cada 3 s **enquanto** há conversões em curso na lista actual.

Isto cobre upload pelo operador e ficheiros descobertos quando a categoria é carregada de novo (mudar de aba/categoria, reabrir o painel, etc.).

### O que falta

Quando alguém **copia ou move** um vídeo directamente para `~/livepraise/videos/{categoria}/` (Finder, Explorer, SMB, etc.) **com o painel Vídeos já aberto**, o operador **não vê** o ficheiro novo até voltar a carregar a lista manualmente. Este item fecha essa lacuna: o servidor vigia a pasta, dispara o pipeline para ficheiros novos e avisa o operador para actualizar a grelha **sem** reabrir o painel nem mudar de categoria.

### Como deve funcionar

1. O servidor detecta criação/alteração de ficheiros de vídeo nas pastas de categoria (ignorar `thumb/` e temporários).
2. Para cada ficheiro novo, chama o **mesmo** `scheduleVideoPipeline` já usado hoje — sem duplicar lógica de conversão.
3. O operador recebe aviso (WebSocket ou refresh dirigido) e a grelha do painel Vídeos inclui o item novo; o progresso de conversão continua a usar o polling actual.

**Critério de sucesso:** com o painel Vídeos aberto numa categoria, copiar um `.mp4` para essa pasta → o tile aparece em poucos segundos e a miniatura surge quando o pipeline terminar.

### Tarefas

- [ ] `server/services/videoWatcher.ts`: `fs.watch` ou chokidar com debounce sobre `~/livepraise/videos/`.
- [ ] Integrar watcher → `scheduleVideoPipeline` (reutilizar API existente; não reimplementar ffmpeg).
- [ ] Ignorar subpastas `thumb/`, ficheiros incompletos (`.part`, `.tmp`) e extensões não vídeo.
- [ ] Notificar operador: evento WS `media-updated` (ou equivalente) consumido por `VideosPanel.vue` para `reloadCurrentCategory()`.
- [ ] Smoke: copiar `.mp4` com painel aberto → item visível sem mudar categoria; thumb após pipeline.

---

## 6. Busca online de louvores

### Como deve funcionar

No painel Louvor, pesquisa opcional numa **fonte online** (substituir ou reimplementar API teraidc) devolve título, autor, letra; o operador importa para o repertório local com um clique. Offline: só pesquisa local (Fuse.js actual).

### Tarefas

- [ ] Decisão de produto: reactivar teraidc vs API alternativa mantida.
- [ ] `server/routes/worship-search.ts` + cache + rate limit.
- [ ] UI em `WorshipPanel.vue`: toggle «busca online», resultados, botão Importar.
- [ ] Mapear resposta → CRUD `POST /musica` existente.
- [ ] Documentar dependência de rede e termos de uso.

---

## 7. Editor visual de temas

### Já existe

- Schema e tipos em `shared/types/theme.ts` (incl. `colors.selection` para listas louvor/Bíblia).
- Normalização e sync: `core/themes/normalize.ts`, `core/themes/sync.ts` → `~/livepraise/themes/`.
- Temas bundled `default` e `high-contrast` (v1.1.0); CSS vars via `shared/theme-css-vars.ts` e `useTheme.ts`.
- Teste unitário `tests/themes/normalize.test.mjs`.

A tipografia de **projeção** (fontes, textfill, sombra por perfil) vive em preferências separadas — já implementada; não faz parte deste item.

### O que falta

Em Configurações → Aparência, o operador edita cores e tokens do `theme.json` activo, pré-visualiza no operador e grava em `~/livepraise/themes/custom.json` **sem editar ficheiros à mão**.

### Tarefas

- [ ] Painel com color pickers (paleta, fundo, texto, seleção, etc.) e preview ao vivo.
- [ ] Validar alterações contra `shared/types/theme.ts` antes de gravar.
- [ ] `PUT /themes/custom` ou escrita directa no home dir com confirmação.
- [ ] Recarregar CSS vars via `useTheme.ts` após gravar.
- [ ] Smoke: alterar cor primária → operador reflecte; persistência após reinício.

---

## 8. Telemetria opt-in de crashes

### Como deve funcionar

Utilizador activa envio **anónimo** de stack traces (sem letras de músicas nem dados pessoais) para endpoint configurável. Desligado por defeito. Não confundir com o log de erros local já existente.

### Tarefas

- [ ] Flag em preferências e texto explicativo nas definições.
- [ ] Enriquecer `errorLogReporter.ts` com filtro de dados sensíveis.
- [ ] Endpoint receptor (ou Sentry DSN) via env.

---

## Metodologia

1. Varredura de `server/`, `apps/`, `web/`, `core/`, `shared/` e scripts `smoke-*.mjs`.
2. Confronto com o estado actual do repositório (2026-05-28).
3. `node scripts/verify-openapi-coverage.mjs` — 60 endpoints alinhados.

---
