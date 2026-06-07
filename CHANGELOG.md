# Changelog

Todas as alterações relevantes do Live Praise são documentadas neste ficheiro.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0-alpha.2] — 2026-06-07

Segunda release alpha — estabilização pós-lançamento inicial: migração legada v0.0.8, correcções no instalador Windows, refactor do servidor e melhorias no pipeline de release/CI.

> **Rascunho:** secções abaixo reflectem o trabalho desde `v1.0.0-alpha.1`. Itens adicionais desta release serão acrescentados conforme instruções de produto.

### Resumo

| | 1.0.0-alpha.1 | 1.0.0-alpha.2 |
|---|---|---|
| **Foco** | Primeira alpha (reescrita 1.x) | Estabilização, Windows, migração legada, CI/release |
| **Migração v0.0.8** | Parcial | Fluxo dedicado `legacy-upgrade` + smoke |
| **Instalador Windows** | Problemas conhecidos | Correcções de instalação e modo dev |
| **electron-builder** | 26.x anterior | 26.8.1 |
| **CI Linux packaging** | AppImage/deb base | rpm + pacman no workflow de release |

---

### Adicionado

- Caminho de **upgrade legado v0.0.8 → 1.x** (`server/db/legacy-upgrade.ts`): detecção de base sem `schema_migrations`, backup automático, quarentena de BD corrompida.
- Smoke **`npm run smoke:legacy-upgrade`** para validar migração antes de release.
- Script **`scripts/smoke-win-installer.mjs`** — validação do instalador NSIS no Windows.
- Script **`scripts/test-electron-server-boot.mjs`** — arranque servidor dentro do Electron empacotado.
- Serviço **`server/services/ffmpegBinary.ts`** — resolução centralizada do binário ffmpeg.
- Helper **`server/db/migration-skip.ts`** — casos limite em migrations incrementais.
- Workflow de release: instalação de ferramentas **rpm** e **pacman** no job Linux.
- Pipeline **release unificado** (`release.yml`): draft único no GitHub, builds Win/Linux/macOS em paralelo — **validado manualmente** (instaladores gerados e executados com sucesso).

### Alterado

- Refactor de **`server/index.ts`** e **`server/bootstrap.ts`** (arranque modular, gestão de BD).
- Melhorias na **ligação WebSocket** (`ws`) e gestão de sessões de base de dados.
- Refactor do **pipeline de vídeo** (`server/services/videoPipeline.ts`).
- Ajustes em **`server/config/paths.ts`** (paths do home dir e binários).
- Formatação e legibilidade dos **scripts** (`scripts/*.mjs`).
- **README:** requisitos mínimos e instruções Windows/Linux actualizadas.
- **electron-builder** actualizado para **26.8.1**.

### Corrigido

- Instalação no **Windows** (NSIS) e uso incorrecto do modo dev como migração.
- Migração **v0.0.8 → 1.0.0-alpha.1** (repertório e sidecars WAL/SHM).
- Action de deploy Windows e resolução de versão no workflow de release.
- Vulnerabilidade na dependência **`tmp`**.
- `.gitignore` e workflows GHA (artefactos e paths de build).

### Removido

- Workflow **CodeQL** (desactivado nesta linha de release).

### Planeado (escopo confirmado alpha.2)

- **Auditoria e retenção de dados** — tabela `audit_logs`, registo de acções sensíveis (`auth`, `users`, `devices`), jobs de retenção (contas 30 d, logs 90 d, dispositivos inactivos 180 d) além de `purgeExpiredSessions`, smoke dedicado. Ver secção 1 de [`INVENTARIO-FUNCOES.md`](INVENTARIO-FUNCOES.md).
- **Locales adicionais** — primeiro idioma `en-US` com paridade de chaves a `pt-BR`; **`pt-BR` permanece idioma padrão** (fallback, instalação nova, API `default`). Ver secção 4.
- **Flash textfill ao trocar verso** — corrigir piscar da projeção (texto pequeno visível antes do tamanho final) em louvor/Bíblia. Ver secção 14.
- **Watcher de vídeos** — detectar ficheiros copiados/movidos para `~/livepraise/videos/{categoria}/` com painel Vídeos aberto; pipeline ffmpeg + notificação WS ao operador. Ver secção 5.
- **Versão única no build** — script `bump-version` propagando `package.json` para preload, UI e OpenAPI. Ver secção 9.
- **Import/export repertório** — export/import JSON de louvores no painel Músicas (distinto do backup ZIP). Ver secção 11.

### Fora do escopo alpha.2

- **Vitest + Playwright** (secção 3) — adiado para versão futura; smokes e testes Node em `tests/` mantêm-se como gate actual.
- **Busca online de louvores** (secção 6) — Fuse.js local mantém-se; API online numa versão futura.
- **Editor visual de temas** (secção 7) — temas bundled + sync; editor na UI numa versão futura.
- **Telemetria opt-in** (secção 8) — log local mantém-se; envio remoto opt-in numa versão futura.
- **Acessibilidade WCAG** (secção 12) — tema alto contraste mantém-se; auditoria sistemática numa versão futura.

### Pendente (continua em [`INVENTARIO-FUNCOES.md`](INVENTARIO-FUNCOES.md))

Outros itens planeados para alpha.2 ou seguintes — a confirmar:

<!-- Espaço reservado para itens adicionais desta release -->

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

### Pendente (não incluído nesta release)

Ver [`INVENTARIO-FUNCOES.md`](INVENTARIO-FUNCOES.md):

1. Auditoria e retenção de dados (`audit_logs`).
2. Checklist operacional completo de release multi-OS (CI existe; falta gate humano por tag).
3. Suite Vitest + Playwright além dos smokes.
4. Locales adicionais (`en-US`, `es`, …).
5. Import/export do repertório completo.
6. Watcher de pasta de vídeos (detecção em tempo real com painel aberto).
7. Busca online de louvores (nova fonte — decisão de produto).
8. Editor visual de temas (color pickers; normalização já existe).
9. Telemetria opt-in de crashes.
10. Sincronização multi-estação (fora de escopo).

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

[1.0.0-alpha.2]: https://github.com/cadimos/livepraise/releases/tag/v1.0.0-alpha.2
[1.0.0-alpha.1]: https://github.com/cadimos/livepraise/releases/tag/v1.0.0-alpha.1
