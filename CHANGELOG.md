# Changelog

Todas as alterações relevantes do Live Praise são documentadas neste ficheiro.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0-alpha.1] — 2026-05-28

Primeira versão da **refatoração completa** do Live Praise, substituindo o legado em `v0.0.8/` (binário histórico `0.0.9`).

### Resumo

Reescrita do zero com arquitetura modular (Electron 42 + TypeScript + Vue 3), mantendo paridade funcional com o operador legado e acrescentando multi-saída, autenticação, sincronização remota, documentação de API e pipeline de release multi-plataforma.

| | Legado (`v0.0.8` / `0.0.9`) | Refatoração (`1.0.0-alpha.1`) |
|---|---|---|
| **Runtime** | Electron 29, Node implícito antigo | Electron 42, Node ≥ 22.5 |
| **UI operador** | HTML + jQuery + Bootstrap | Vue 3 + Vite + Tailwind CSS |
| **Servidor** | Express 4 + Consign | Express 5, rotas tipadas |
| **Tempo real** | Socket.IO | WebSocket nativo (`ws`) |
| **Base de dados** | `sqlite3` (nativo npm) | `node:sqlite` (built-in Node 22+) |
| **Build** | electron-packager | electron-builder (NSIS, AppImage, Snap, DMG) |
| **Documentação API** | — | OpenAPI 3 + Swagger UI em `/api/docs` |

---

### Arquitetura

- Separação clara em `electron/`, `server/`, `core/`, `apps/`, `web/`, `shared/`, `install/`.
- **Operador** (`apps/operator/`) — interface principal do culto.
- **Projetor** (`apps/projector/`) — saída pública em monitor dedicado ou browser.
- **Retorno de palco** (`apps/stage-return/`) — visão distinta para o palco (`viewMusicaRetorno`, `viewBibliaRetorno`).
- **Vistas web** (`web/`) — portal (`/`), transmissão (`/live`), controlo remoto (`/remote`), ecrãs externos (`/vocal`, `/stage`, `/player`).
- Lógica partilhada em `core/` (projeção, live-state, auth, temas, segurança, dispositivos).
- Tipos TypeScript partilhados em `shared/`.
- Dados do utilizador em `~/livepraise/` (imagens, vídeos, temas, locales, BD SQLite).

---

### Paridade com o legado (funcionalidades mantidas)

#### Projeção e culto

- Fila de projeção com abas estilo Chrome (louvor, Bíblia, imagens, vídeos, slides em branco).
- Drag-and-drop para reordenar itens na fila.
- Projeção de letras de louvor, versículos bíblicos, imagens de fundo e vídeos.
- **Congelar / descongelar** ecrã (`freeze`) durante o culto.
- **Limpar ecrã** (`removeConteudo`).
- **Fundos rápidos** — strip de backgrounds pré-configurados.
- **Ajustar tela** (`ajustarTela`) — dimensionamento da área útil por monitor.
- Bloco de notas / texto livre no operador.
- Atalhos de teclado configuráveis.

#### Repertório e mídia

- CRUD de categorias e músicas com versos (schema SQLite legado preservado).
- Biblioteca de imagens por categorias em `~/livepraise/imagens/`.
- Biblioteca de vídeos por categorias em `~/livepraise/videos/`.
- Pipeline **ffmpeg** para conversão MP4 e geração de thumbnails (CA-R40).
- Importação de vídeo **YouTube** para a fila (embed ou download local).
- Upload de ficheiros locais para a fila de projeção.
- Múltiplas traduções da Bíblia (payload em `install/livepraise/biblias/`).
- Navegação Bíblia: livros → capítulos → versículos.
- Resolução de playlist de culto (`POST /playlist/resolve`).
- Pesquisa **local** de louvores (Fuse.js).

#### Monitores e Electron

- Splash screen no arranque.
- Gestão de múltiplos monitores com papéis (`operator`, `projection`, `stage-return`, `off`).
- Servidor HTTP integrado ao processo Electron.
- Auto-update via `electron-updater` (GitHub Releases).
- Bloqueio de suspensão do ecrã durante o culto.

#### Temas e aparência

- Sistema de temas via `theme.json` + variáveis CSS.
- Servidor de assets de tema (`/themes/{id}/…`).
- Suporte a locale `pt-BR` (i18n com `vue-i18n` no operador).

---

### Novidades

#### Multi-saída e pré-visualização

- **Retorno de palco** como aplicação dedicada, com acções WS separadas da projeção pública.
- **Perfis de ecrã externo** — `live`, `vocal`, `stage`, `player` — cada um com regras de entrega de conteúdo no hub WebSocket.
- **Coluna de pré-visualização multi-saída** (CAD-221) — um painel por grupo de destino (Projetor, 2.ª saída física, Live, Vocal, etc.), reflectindo o estado filtrado por perfil.
- Filtro `/live`: não recebe `background`; usa `limparFundo` para limpar vídeo/fundo (CA-R21).

#### Autenticação, utilizadores e remoto

- Sistema de **login local** com sessões Bearer (`POST /api/auth/login`).
- Papéis de conta: `admin`, `operator`, `remote` ([docs/auth-roles.md](docs/auth-roles.md)).
- Painel de **gestão de utilizadores** (CRUD, activação/desactivação).
- **Controlo remoto web** (`/remote`) — operador remoto envia pedidos ao operador local.
- **Fila de aprovações** — pedidos remotos de louvor, Bíblia e vídeo aguardam aprovação local.
- Sincronização de **abas Chrome remotas** com consumo pelo operador local.
- API de **dispositivos externos** (`GET/PUT /api/devices`) com presença WebSocket.

#### Overlays de culto

- **Timer de culto** (`serviceTimer`) — contador sincronizado em todas as saídas relevantes (CAD-187).
- **Alerta no rodapé** (`footerAlert`) — texto rolante sincronizado (CAD-188).

#### Fila de projeção (melhorias)

- **Importar mídia por URL genérica** (`POST /api/queue/import-url`) — imagens e vídeos HTTP(S) sem download manual (CAD-228).
- **Remover item da fila** via menu contextual (clique direito no tile), sem apagar ficheiros da biblioteca (CAD-234).
- Import por upload, YouTube e URL unificados em `QueueAddMediaModal`.

#### Backup e restore

- **Backup selectivo** do ambiente (`POST /api/backup`) — escolha de grupos (BD, louvor, imagens, vídeos, temas, monitores, utilizadores, preferências).
- **Restore selectivo** (`POST /api/restore`) — leitura do manifesto do `.zip`, itens presentes marcados por defeito, ausentes desabilitados (CAD-238).
- Scripts CLI espelhando a API (`scripts/backup-livepraise.mjs`, `restore-livepraise.mjs`).

#### Projeção avançada

- Modo **alto contraste** no projetor e clientes externos.
- Suporte a **acordes** em perfis externos (`showChords`).
- Sanitização centralizada de HTML de projeção (`core/projection/sanitize.ts`).
- Estado ao vivo persistido e sincronizado (`core/live-state/`).

#### Operador e UX

- Interface responsiva com Tailwind; ícones Lucide.
- Painéis de configuração modulares: monitores, aparência, louvor, Bíblia, aprovações, atalhos, log de erros.
- Modal **Nova música** com editor de versos.
- Barra de estado com IP local e estado de dispositivos externos.
- Alertas e modais de serviço integrados ao fluxo do culto.

#### API, documentação e qualidade

- **60 endpoints** documentados em [`openapi.yaml`](openapi.yaml) com cobertura verificada (`npm run verify:openapi`).
- Swagger UI em `GET /api/docs`.
- Health check detalhado em `GET /health` (módulos activos, fase de release, feature flags).
- **Log de erros** local com redacção de URLs sensíveis (`core/error-log/redact-url.ts`).
- Suite de **smokes de release** (`npm run smoke:release`) — bootstrap, pipeline vídeo, WebSocket, latência LAN.
- Workflows CI **GitHub Actions** para Windows e macOS (`car40-windows.yml`, `car40-macos.yml`).
- Testes de segurança SSRF para importação por URL (`tests/security/remote-fetch*.test.mjs`).

---

### Segurança

- Política **anti-SSRF** centralizada em `core/security/remote-fetch.ts` (validação sintáctica, DNS, IP efectivo, redirects).
- Validação de paths de mídia local (`core/security/media-file.ts`, `safe-segment.ts`).
- Hash de passwords com salt (`core/auth/password.ts`); purge de sessões expiradas.
- Middleware de autenticação com bypass **apenas em loopback** (`127.0.0.1`) para bootstrap Electron; pedidos LAN exigem token.
- Redacção de query strings sensíveis em logs de erro.
- Guard de modo backup durante restore (bloqueio de escrita).

---

### Alterações técnicas (breaking)

Estas mudanças exigem atenção na migração a partir do legado:

| Área | Legado | Nova versão |
|------|--------|-------------|
| **Versão npm** | `0.0.9` | `1.0.0-alpha.1` |
| **Node.js** | Sem requisito explícito | ≥ 22.5.0 |
| **Comunicação WS** | Socket.IO (`socket.io`) | WebSocket puro em `ws://host:3000/ws/live` |
| **UI operador** | `tema/default/index.html` | `/operator` (build Vite) |
| **Projetor** | `tema/default/projetor.html` | `/projector` |
| **Rotas Bíblia** | `/lista/biblias`, `/livros/biblia/…` | `/biblias`, `/biblias/livros/…` |
| **Autenticação** | JWT opcional (`middlewares/auth.js`) | Sessões SQLite + papéis obrigatórios em LAN |
| **Busca online de louvores** | API `livepraise.teraidc.com.br` | **Removida** — apenas busca local |
| **Textfill automático** | jQuery TextFill no projetor | **Pendente** — ver inventário §1 |
| **Dependência `sqlite3`** | npm nativo + `electron-rebuild` | `node:sqlite` — sem rebuild nativo |

> **Nota:** A pasta `v0.0.8/` permanece no repositório como arquivo histórico (CA-R07). Não recebe evolução.

---

### Removido ou descontinuado

- Integração com **TeraIDC** para busca online de músicas.
- Stack jQuery / Bootstrap / jQuery UI / Font Awesome no operador.
- Socket.IO como protocolo de tempo real.
- `consign` para carregamento dinâmico de módulos.
- `electron-packager` como ferramenta principal de build.
- Dependências legadas: `dotenv`, `fs-extra`, `systeminformation`, `node-abi`, `@electron/rebuild`.

---

### Pendente / conhecido (não incluído nesta release)

Itens registados em [`INVENTARIO-FUNCOES.md`](INVENTARIO-FUNCOES.md):

1. **Textfill** — auto-ajuste de fonte no projetor para textos longos.
2. **Auditoria e retenção** — `audit_logs` e jobs de purge (contas, logs, dispositivos).
3. **Validação release multi-OS** — checklist completa de artefactos em CI.
4. **Suite Vitest + Playwright** — além dos smokes pontuais existentes.
5. **Locales adicionais** — `en-US`, `es`, etc.
6. **Import/export do repertório completo** — pacote versionado de todo o catálogo.
7. **Watcher da pasta de vídeos** — detecção automática de novos ficheiros.
8. **Busca online de louvores** — reimplementação com nova fonte (decisão de produto).
9. **Optimização IPC** para 3+ monitores locais.
10. **Editor visual de temas** em Configurações → Aparência.
11. **Telemetria opt-in** de crashes (anónima, desligada por defeito).
12. **Sincronização multi-estação** — fora de escopo nesta fase.

---

### Migração a partir do legado

1. **Dados do utilizador:** copiar `~/livepraise/` (imagens, vídeos, `dsw.bd`, temas) — o schema SQLite legado é compatível (`002_legacy_core_schema.sql`).
2. **Primeiro arranque:** o servidor cria utilizador `admin` com password gerada (ver consola).
3. **Monitores:** reconfigurar papéis em Configurações → Ecrãs (`PUT /displays/config`).
4. **Clientes browser/remotos:** actualizar URLs de WebSocket e endpoints REST conforme [`openapi.yaml`](openapi.yaml).
5. **Release:** validar com `npm run smoke:release` antes de publicar instaladores.

---

### Créditos

- **Autor:** Thiago de Lucena Sobrinho
- **Contribuidores legado:** Kerolen Lucena, Sabrina Santos (TeraIDC)
- **Licença:** MIT

[1.0.0-alpha.1]: https://github.com/cadimos/livepraise/compare/v0.0.9...v1.0.0-alpha.1
