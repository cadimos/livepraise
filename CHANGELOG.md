# Changelog

Todas as alterações relevantes do Live Praise são documentadas neste ficheiro.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado

- **Auto-update no operador** — faixa no topo com progresso de download, estado de instalação e botão Instalar agora (`AppUpdateBanner`).

### Alterado

### Corrigido

---

## [1.0.0-alpha.3] — 2026-08-30

Terceira release alpha — qualidade de **textfill** no projetor, **fila partilhada** entre operadores, mais idiomas, runtime **Node 24** + **Electron 44**, e consolidação da estrutura TypeScript/smokes.

### Resumo

| | 1.0.0-alpha.2 | 1.0.0-alpha.3 |
|---|---|---|
| **Foco** | Estabilização + produto | Textfill, fila sincronizada, runtime |
| **Node.js** | ≥ 22.5 | **≥ 24** (`engines` + CI) |
| **Electron** | 42 | **44.0.0** |
| **Idiomas** | `pt-BR`, `en-US` | + **`pt-PT`**, **`es-ES`** |
| **Fila de culto** | Só no operador local | Sync **GET/PUT `/api/operator-queue`** + WS `operator-queue-sync` |
| **Textfill** | Ocultar até ao tamanho final | Medição in-place, diagnóstico JSONL, menos corte de texto |
| **Cifras** | Remoção por linha | Só linhas *inteiras* de acordes (não apaga letra em PT) |
| **Prévia** | Tiles por destino | Aspect ratio alinhado ao ecrã de projeção |
| **Sobre** | Versão | Créditos (contribuintes, fontes, editoras) |

---

### Adicionado

#### Culto e operador

- **Fila partilhada** — estado persistido (`009_operator_queue_state.sql`); **GET/PUT `/api/operator-queue`** com revisão optimista (409 se outro operador gravou); broadcast WebSocket **`operator-queue-sync`**; UI no operador (`useOperatorQueueSync`); smoke **`npm run smoke:queue-sync`**.
- **Diagnóstico de textfill** — medições de fonte/layout (prévia e projetor) em `~/livepraise/textfill-diagnostics.jsonl`; UI em Configurações → Logs de erro (activar, exportar JSONL, limpar); API `/api/system/textfill-diagnostics`; incluído no backup selectivo.
- **Locales `pt-PT` e `es-ES`** — paridade de chaves com `pt-BR` / `en-US`; `npm run sync:locales` gera os ficheiros derivados; smoke **`smoke:locales`** actualizado.
- **Créditos na janela Sobre** — contribuintes, fontes e editoras (i18n).
- **Prévia com aspect ratio** da saída de projeção (`projectionPreviewAspect`) para o tile reflectir o ecrã real.

#### Infraestrutura e qualidade

- **TypeScript / build** — `npm run build:browser:dev` com source maps para projector/web; `npm run verify:sourcemaps`; `npm run dev` usa o build browser de desenvolvimento.
- **Smokes consolidados** — `smoke:features`, `smoke:auth`, `smoke:displays`, `smoke:backup`, `smoke:textfill`, `smoke:typography-qa`; aliases `smoke:core:*`; `smoke:release` inclui textfill.
- **`npm run test:unit`** no CI; hook git opt-in (`install:git-hooks`); `verify:depcheck`; `npm run clean` apaga `dist/`.
- **Módulos partilhados** — `shared/projection-chords.ts`, `shared/ws-live-url.ts`; `shared/*.ts` é a fonte única (JS só em `dist/shared/`).
- Bootstrap Windows: `git clone` + `npm i` + `npm run dev` sem passos extra; `extract-zip` no install Electron; smoke do instalador NSIS resolve o caminho real de instalação.
- Documentação de dívida técnica (`docs/DIVIDA-TECNICA.md`); epic de estrutura [`ST-038-EPIC-CHECKLIST.md`](ST-038-EPIC-CHECKLIST.md).

---

### Alterado

- **Node.js ≥ 24** e **Electron 44.0.0**; **electron-builder 26.15.3**; TypeScript 7; Tailwind CSS 4 via Vite (`@tailwindcss/vite`).
- **Textfill** como superfície única estilo jQuery (`$.fn.textfill` / chamada directa); constantes de debounce de tipografia partilhadas entre prévia e saída.
- Filtro de **cifras na projeção** — uma linha só é cifra se *todas* as palavras forem acordes (evita apagar versos como «E ao Teu falar»).
- **Archiver 8** (backup) em ESM; dependências de segurança (`undici`, `form-data`, `tar`, `js-yaml` / depcheck).
- Login do **portal**: formulário **POST**; extração mais segura de username/password na API de auth.
- Layout do conteúdo do projetor em **ecrãs mais pequenos**.

---

### Corrigido

- **Textfill — texto cortado no projetor** — `#conteudo` impedia `font-size` inline no Electron; medição no span real (`scrollHeight` / `scrollWidth`, paridade jquery-textfill); `!important` no tamanho aplicado; overflow visual não força o mínimo 24px após uma pass válida.
- **Textfill pass 2** — segunda passagem podia inflar `scrollHeight` e cair em 24px depois de uma pass 1 válida; mantém pass 1 quando pass 2 não cabe; limpa fonte entre passagens; sombra só em nós de texto.
- **Textfill medição oculta** — `visibility:hidden` no root e `opacity:0` distorciam `scrollHeight`; o root permanece visível; pass `reconcile-visible` se o resultado não cabe no ecrã.
- **Projetor visível após refresh** — `refreshOutputTextfill` restaura `visibility` de `#conteudo`.
- **Prévia sem piscar** — removido `opacity-0` durante o refresh de tipografia.
- Smoke do **instalador Windows** (caminho NSIS real).

---

### Removido

- Scripts **`smoke:cad187` … `smoke:cad314`** — substituídos por `smoke:features`, `smoke:textfill`, `smoke:typography-qa`, etc. Ver [`scripts/README.md`](scripts/README.md).
- JS/`.d.ts` duplicados em `shared/` e `web/`; script `sync-shared-modules`.
- Configuração **ESLint** introduzida a meio do ciclo e retirada por incompatibilidade com TypeScript 7 (o CI usa `typecheck`).
- Relatório local `audit.json` de vulnerabilidades npm (não fazia parte do produto).

---

### Breaking / requisitos

- **Node.js 24+** é obrigatório para desenvolvimento, CI e `engines` do `package.json` (antes 22.x).
- Clientes que sincronizem a fila devem usar **`/api/operator-queue`** e o evento WS **`operator-queue-sync`**.

---

### Fora do escopo alpha.3

Ainda adiado (ver [`INVENTARIO-FUNCOES.md`](INVENTARIO-FUNCOES.md)):

- Suite Vitest + Playwright além dos smokes / `test:unit`
- Busca online de louvores
- Editor visual de temas
- Telemetria opt-in remota
- Auditoria WCAG sistemática
- Painel UI de logs de auditoria (API admin já existe desde alpha.2)
- i18n em portal e remote (ST-027)
- OpenAPI para backup, tipografia e textfill-diagnostics

---


## [1.0.0-alpha.2] — 2026-06-07

Segunda release alpha — estabilização pós-`alpha.1`: migração legada, pipeline de release unificado, correcções Windows, e entregáveis de produto (auditoria, i18n, watcher de vídeos, export de louvores, sync de versão, textfill sem flash).

### Resumo

| | 1.0.0-alpha.1 | 1.0.0-alpha.2 |
|---|---|---|
| **Foco** | Primeira alpha (reescrita 1.x) | Estabilização + funcionalidades de produto |
| **Migração v0.0.8** | Parcial | `legacy-upgrade` + `smoke:legacy-upgrade` |
| **Release CI** | Workflows separados | Draft único Win/Linux/macOS (validado manualmente) |
| **Auditoria** | — | `audit_logs` + retenção + `GET /api/audit/logs` |
| **Idiomas** | Só `pt-BR` | `pt-BR` (default) + `en-US` |
| **Vídeos** | Pipeline + polling | Watcher de pasta + evento WS `media-updated` |
| **Louvor** | CRUD local | Export/import JSON (`livepraise-music-repertoire`) |
| **Projeção** | Flash ao trocar verso | Textfill oculta root até tamanho final |
| **Versão** | Bump manual em vários ficheiros | `bump-version` + `shared/app-version.ts` |
| **OpenAPI** | 64 endpoints | **67** endpoints |

---

### Adicionado

#### Infraestrutura e release (desde alpha.1)

- Caminho de **upgrade legado v0.0.8 → 1.x** (`server/db/legacy-upgrade.ts`) com backup automático e quarentena de BD corrompida.
- Smoke **`npm run smoke:legacy-upgrade`**.
- Script **`scripts/smoke-win-installer.mjs`** — validação do instalador NSIS no Windows.
- Serviço **`server/services/ffmpegBinary.ts`**; helper **`server/db/migration-skip.ts`**.
- Workflow **`release.yml`**: draft único no GitHub, builds Win/Linux/macOS em paralelo, `resolve-release-version.mjs`, rpm + pacman no job Linux — **validado manualmente**.

#### Alpha.2 — produto

- **Auditoria e retenção** — migration `008_audit_logs.sql`, `core/audit/log.ts`, hooks em `auth`, `users`, `devices`, `backup`/`restore`; `core/retention/purge.ts` + scheduler diário (contas 30 d, logs 90 d, dispositivos 180 d); **`GET /api/audit/logs`** (admin); smoke **`npm run smoke:audit`**.
- **Locales** — `locales/en-US.json` + `install/locales/en-US.json` (paridade de chaves com `pt-BR`); rótulos legíveis no selector; **`pt-BR` permanece default**; `locales/README.md`; smoke **`npm run smoke:locales`**.
- **Watcher de vídeos** — `server/services/videoWatcher.ts` (`fs.watch` recursivo, debounce); integração com `scheduleVideoPipeline`; WebSocket **`media-updated`** → `VideosPanel.vue`; smoke **`npm run smoke:video-watcher`**.
- **Import/export repertório** — formato JSON **`livepraise-music-repertoire`**; **`GET /musica/export`**, **`POST /musica/import`** (conflitos `remap`/`skip`/`overwrite`); UI no painel Louvor; smoke **`npm run smoke:musica-export`**.
- **Versão única** — `scripts/bump-version.mjs`, `scripts/sync-app-version.mjs`, `shared/app-version.ts`; sync no `build`; **`npm run bump-version`**, **`npm run smoke:version`**.

---

### Alterado

- Refactor de **`server/index.ts`** e **`server/bootstrap.ts`** (arranque modular, watcher, retention scheduler).
- Melhorias na **ligação WebSocket** e gestão de sessões de base de dados.
- Refactor do **pipeline de vídeo** (`server/services/videoPipeline.ts`).
- **`shared/projection-textfill`** — root oculto durante medição; `suppressVisibilityToggle` na passagem dupla; projetor/retorno/live ocultam conteúdo **antes** de `innerHTML` ao trocar verso.
- **`PreviewOutputTile.vue`** — padrão `previewReady` alinhado a `ProjectionTypographyPreview.vue`.
- **README** — requisitos e instruções Windows/Linux.
- **electron-builder** actualizado para **26.8.1**.

---

### Corrigido

- Instalação no **Windows** (NSIS) e uso incorrecto do modo dev como migração.
- Migração **v0.0.8 → 1.0.0-alpha.1** (repertório e sidecars WAL/SHM).
- **Flash textfill** ao trocar verso em louvor/Bíblia — público deixa de ver texto pequeno antes do tamanho final.
- Action de deploy Windows e resolução de versão no workflow de release.
- Vulnerabilidade na dependência **`tmp`**.
- `.gitignore` e workflows GHA.

---

### Removido

- Workflow **CodeQL** (desactivado nesta linha de release).
- Três workflows **CA-R40** separados — substituídos por **`release.yml`** unificado.

---

### Fora do escopo alpha.2

Adiado para versão futura (ver [`INVENTARIO-FUNCOES.md`](INVENTARIO-FUNCOES.md)):

- Vitest + Playwright (secção 3)
- Busca online de louvores (secção 6)
- Editor visual de temas (secção 7)
- Telemetria opt-in remota (secção 8)
- Auditoria WCAG sistemática (secção 12)

### Pendente / opcional pós-alpha.2

- Smoke **`smoke-win-installer`** no CI Windows (secção 10) — validação manual já feita.
- Painel UI para logs de auditoria (API admin já existe).
- ~~Teste de **auto-update in-app**~~ — concluído na alpha.3 (Windows; ver inventário §13).

---

## [1.0.0-alpha.1] — 2026-05-28

Primeira release alpha do **Live Praise 1.x** — reescrita completa do produto com arquitetura modular (Electron 42 + TypeScript + Vue 3). Inclui notas de migração a partir da linha **v0.0.8** (`0.0.9`).

### Resumo

Reescrita completa com arquitetura modular (Electron 42 + TypeScript + Vue 3), preservando o fluxo de culto do operador legado e acrescentando multi-saída, tipografia configurável, autenticação, sincronização remota, backup selectivo, documentação OpenAPI e pipeline de release multi-plataforma.

| | v0.0.8 (`0.0.9`) | 1.0.0-alpha.1 |
|---|---|---|
| **Runtime** | Electron 29 | Electron 42, Node ≥ 22.5 |
| **UI operador** | HTML + jQuery + Bootstrap | Vue 3 + Vite + Tailwind CSS |
| **Servidor** | Express 4 + Consign | Express 5, rotas tipadas |
| **Tempo real** | Socket.IO | WebSocket nativo (`ws`) |
| **Base de dados** | `sqlite3` (npm nativo) | `node:sqlite` (built-in Node 22+) |
| **Build / release** | electron-packager | electron-builder (NSIS, deb, rpm, pacman, AppImage, Snap, Flatpak, DMG) |
| **Textfill no projetor** | jQuery TextFill | Motor próprio (`shared/projection-textfill.ts`) |
| **Documentação API** | — | OpenAPI 3 + Swagger UI (`/api/docs`) |

---

### Arquitetura

- Separação em `electron/`, `server/`, `core/`, `apps/`, `web/`, `shared/`, `install/`.
- **Operador** (`apps/operator/`) — condução do culto, fila, configurações.
- **Projetor** (`apps/projector/`) — saída pública (monitor ou browser).
- **Retorno de palco** (`apps/stage-return/`) — visão distinta (`viewMusicaRetorno`, `viewBibliaRetorno`).
- **Vistas web** (`web/`) — portal (`/`), transmissão (`/live`), controlo remoto (`/remote`), ecrãs externos (`/vocal`, `/stage`, `/player`).
- Lógica partilhada em `core/` (projeção, live-state, auth, temas, fontes, segurança, dispositivos).
- Dados do utilizador em `~/livepraise/` (BD SQLite, imagens, vídeos, temas, fontes, locales).

---

### Paridade com v0.0.8 (funcionalidades mantidas)

#### Projeção e culto

- Fila de projeção com abas estilo Chrome (louvor, Bíblia, imagens, vídeos, slides em branco).
- Drag-and-drop para reordenar itens na fila.
- Projeção de letras, versículos, imagens de fundo e vídeos.
- **Congelar / descongelar** ecrã durante o culto.
- **Limpar ecrã** (`removeConteudo`).
- **Fundos rápidos** — strip de backgrounds pré-configurados.
- **Ajustar tela** (`ajustarTela`) por monitor.
- Bloco de notas / texto livre.
- Atalhos de teclado configuráveis.
- **Textfill** — textos longos redimensionam para caber na área útil (paridade com jQuery TextFill; agora por perfil de saída).

#### Repertório e mídia

- CRUD de categorias e músicas com versos (schema SQLite compatível).
- Biblioteca de imagens e vídeos por categorias em `~/livepraise/`.
- Pipeline **ffmpeg** para conversão MP4 e thumbnails (CA-R40).
- Importação **YouTube** para a fila (download via **yt-dlp** ou embed).
- Upload de ficheiros locais para fila e biblioteca.
- Múltiplas traduções da Bíblia (`install/livepraise/biblias/`).
- Navegação Bíblia: livros → capítulos → versículos.
- Resolução de playlist de culto (`POST /playlist/resolve`).
- Pesquisa **local** de louvores (Fuse.js).

#### Monitores e desktop

- Splash screen no arranque.
- Gestão de múltiplos monitores com papéis (`operator`, `projection`, `stage-return`, `off`).
- Servidor HTTP integrado ao Electron.
- Auto-update via `electron-updater` (GitHub Releases).
- Bloqueio de suspensão do ecrã durante o culto.

#### Temas e aparência

- Sistema de temas via `theme.json` + variáveis CSS (`default`, `high-contrast`).
- Sync automático de temas bundled para `~/livepraise/themes/` no arranque.
- Locale `pt-BR` (i18n com `vue-i18n`).

---

### Novidades

#### Multi-saída e pré-visualização

- **Retorno de palco** dedicado, com acções WebSocket separadas da projeção pública.
- **Perfis de ecrã externo** — `live`, `vocal`, `stage`, `player` — com filtragem no hub WS.
- **Pré-visualização multi-saída** (CAD-221) — um tile por grupo de destino (Projetor, 2.ª saída, Live, Vocal, …), reflectindo o estado filtrado por perfil.
- Filtro `/live`: não recebe `background`; usa `limparFundo` (CA-R21).

#### Tipografia e layout de projeção

- **Layout 3 zonas** — `.titulo` | `.content` | `.rodape` (`shared/projection-layout.css`, CAD-286/288).
- **Tipografia por perfil** (CAD-307) — painel em Configurações → Tipografia de projeção: família, min/max px, textfill on/off, sombra, estilo.
- Perfis independentes: projetor, retorno de palco, live, vocal, stage, player.
- **Fontes embutidas** servidas em `/fonts/{familia}/{fileName}` + enumeração de fontes do SO (`GET /api/system/fonts`).
- Sync de fontes bundled para `~/livepraise/fonts/`; preferências em `PUT /api/projection-typography` com broadcast WS.
- Pré-visualização ao vivo no operador (`ProjectionTypographyPreview.vue`).

#### Autenticação, utilizadores e remoto

- Login local com sessões Bearer (`POST /api/auth/login`).
- Papéis: `admin`, `operator`, `remote` ([docs/auth-roles.md](docs/auth-roles.md)).
- Gestão de utilizadores (CRUD, activação/desactivação).
- **Controlo remoto web** (`/remote`) e **fila de aprovações**.
- Sincronização de **abas Chrome remotas** com consumo local.
- API de **dispositivos externos** (`/api/devices`) com presença WebSocket.

#### Overlays de culto

- **Timer de culto** (`serviceTimer`) — CAD-187.
- **Alerta no rodapé** (`footerAlert`) — CAD-188.

#### Fila de projeção

- Import por **ficheiro local**, **YouTube** e **URL genérica** HTTP(S) (`POST /api/queue/import-url`, CAD-228).
- **Remover item da fila** via menu contextual (CAD-234).
- Política **anti-SSRF** centralizada (`core/security/remote-fetch.ts`).

#### Backup e restore

- **Backup selectivo** (`POST /api/backup`) — grupos: BD, louvor, imagens, vídeos, temas, monitores, utilizadores, preferências (CAD-238).
- **Restore selectivo** (`POST /api/restore`) — manifesto `backup-manifest.json`, itens do zip marcados por defeito.
- UI em Configurações → Backup / Restore (`BackupModal`, `RestoreModal`).
- Scripts CLI: `scripts/backup-livepraise.mjs`, `scripts/restore-livepraise.mjs`.

#### Projeção avançada

- Modo **alto contraste** no projetor e clientes externos.
- **Acordes** em perfis externos (`showChords`).
- Sanitização centralizada de HTML (`core/projection/sanitize.ts`).
- Estado ao vivo persistido e sincronizado (`core/live-state/`).

#### Operador e UX

- Interface Vue 3 + Tailwind; ícones Lucide.
- Painéis modulares: monitores, aparência, tipografia, louvor, Bíblia, backup, aprovações, atalhos, log de erros.
- Modal **Nova música** com editor de versos.
- Barra de estado com IP local e dispositivos externos.

#### API, documentação e qualidade

- **64 endpoints** HTTP documentados em [`openapi.yaml`](openapi.yaml) (`npm run verify:openapi`).
- Swagger UI em `GET /api/docs`; health em `GET /health` e `GET /api/health`.
- Log de erros local com redacção de URLs sensíveis.
- Smokes de release (`npm run smoke:release`) e smokes por feature (CAD-187…CAD-314).
- Workflows CI **CA-R40** (Windows, macOS, Linux).
- Testes de segurança SSRF (`tests/security/remote-fetch*.test.mjs`).

---

### Segurança

- Anti-SSRF na importação por URL (validação sintáctica → DNS → IP → redirects).
- Validação de paths de mídia e fontes (`core/security/media-file.ts`, `safe-segment.ts`).
- Passwords com hash + salt; purge de sessões expiradas.
- Bypass de autenticação **apenas em loopback** (`127.0.0.1`) para bootstrap Electron; LAN exige token.
- Guard de modo backup durante restore.

---

### Alterações técnicas (breaking)

| Área | v0.0.8 | 1.0.0-alpha.1 |
|------|--------|---------------|
| **Versão npm** | `0.0.9` | `1.0.0-alpha.1` |
| **Node.js** | Sem requisito explícito | ≥ 22.5.0 |
| **WebSocket** | Socket.IO | `ws://host:3000/ws/live` |
| **Operador** | `tema/default/index.html` | `/operator` |
| **Projetor** | `tema/default/projetor.html` | `/projector` |
| **Rotas Bíblia** | `/lista/biblias`, `/livros/biblia/…` | `/biblias`, `/biblias/livros/…` |
| **Autenticação** | JWT opcional | Sessões SQLite + papéis em LAN |
| **Busca online de louvores** | API TeraIDC | **Removida** — só busca local |
| **SQLite** | `sqlite3` + `electron-rebuild` | `node:sqlite` built-in |

---

### Removido ou descontinuado

- Integração **TeraIDC** para busca online de músicas.
- Stack jQuery / Bootstrap / jQuery UI / Font Awesome no operador.
- Socket.IO, Consign, electron-packager.
- Dependências legadas: `dotenv`, `fs-extra`, `systeminformation`, `sqlite3`, `@electron/rebuild`.

---

### Pendente (não incluído em alpha.1; ver alpha.2 para itens já entregues)

Ver [`INVENTARIO-FUNCOES.md`](INVENTARIO-FUNCOES.md) — **entregue em alpha.2:** auditoria, locales `en-US`, watcher de vídeos, export/import louvor, sync de versão, flash textfill, release unificado.

**Ainda pendente (pós-alpha.3 ou opcional):**

1. Suite Vitest + Playwright além dos smokes.
2. Busca online de louvores (nova fonte — decisão de produto).
3. Editor visual de temas (color pickers).
4. Telemetria opt-in de crashes (envio remoto).
5. Acessibilidade WCAG sistemática.
6. Sincronização multi-estação (fora de escopo).

---

### Migração a partir de v0.0.8

1. **Encerre** o Live Praise antigo antes de copiar ficheiros.
2. Copiar `~/livepraise/` (imagens, vídeos, `dsw.bd`, temas). Se existirem, copie também `dsw.bd-wal` e `dsw.bd-shm` (modo WAL).
3. Primeiro arranque em 1.x: backup automático da base legada em `~/livepraise/backup/auto-upgrade/`, depois migrations incrementais (repertório preservado).
4. Utilizador `admin` bootstrap com password na consola (se ainda não existir conta).
5. Reconfigurar monitores em Configurações → Ecrãs.
6. Se a base estiver corrompida, o app isola `dsw.bd.corrupt-*` e cria uma base nova; restaure um `dsw.bd` íntegro ou use Backup/Restore.
7. Actualizar clientes browser/remotos para novas rotas REST e WebSocket (ver [`openapi.yaml`](openapi.yaml)).
8. Validar upgrade com `npm run smoke:legacy-upgrade` e `npm run smoke:release` antes de publicar.

---

### Créditos

- **Autor:** Thiago de Lucena Sobrinho
- **Contribuidores da linha anterior:** Kerolen Lucena, Sabrina Santos
- **Licença:** MIT

[1.0.0-alpha.3]: https://github.com/cadimos/livepraise/releases/tag/v1.0.0-alpha.3
[1.0.0-alpha.2]: https://github.com/cadimos/livepraise/releases/tag/v1.0.0-alpha.2
[1.0.0-alpha.1]: https://github.com/cadimos/livepraise/releases/tag/v1.0.0-alpha.1
