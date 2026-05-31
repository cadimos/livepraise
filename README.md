# Live Praise (refatoração)

![version](https://shields.io/github/package-json/v/cadimos/livepraise)

Software desktop open-source (MIT) para projeção de louvores, passagens bíblicas, imagens e vídeos em cultos — operador local com pré-visualização e saída multi-monitor.

## Estado do repositório

| Área | Localização | Notas |
|------|-------------|-------|
| **Código activo** | Raiz (`/`) | Refactor Electron 42 + TypeScript + Vite + Tailwind |
| **Legado v0.0.9** | `v0.0.8/` | Arquivo histórico; executável independente (CA-R07) |

## Estrutura (sec. 10.13 do escopo)

```
livepraise/
├── electron/          # Processo principal Electron 42 (splash, monitores)
├── server/            # HTTP + WebSocket (Fase 2+)
├── core/              # Lógica de sistema (projeção, live-state, parsers)
├── apps/
│   ├── operator/      # Vue 3 + Vite + Tailwind (Fase 4)
│   ├── projector/     # Projeção pública (Fase 5)
│   └── stage-return/  # Retorno de palco (Fase 5)
├── web/               # Vistas browser /live, portal (Fase 7)
├── themes/            # Aparência (theme.json + assets)
├── locales/           # i18n do sistema
├── install/           # Payload primeira instalação → ~/livepraise
├── shared/            # Tipos TS partilhados
├── resources/         # Ícones e assets de build
└── v0.0.8/            # Legado completo (sem evolução)
```

## Requisitos

- **Node.js** ≥ 22.5 (SQLite via módulo built-in `node:sqlite`, alinhado ao Electron 42)
- **npm** 10+

### Linux (partição NTFS / externa)

Se `npm run dev` falhar com erro de `chrome-sandbox` / SUID, o script `dev` já define `ELECTRON_DISABLE_SANDBOX=1` e `--no-sandbox` (apenas desenvolvimento). Em ext4 nativo com sandbox configurado (`chmod 4755` no `chrome-sandbox`), pode remover esses flags localmente.

## Desenvolvimento

```bash
npm install
npm run dev          # compila server + electron e abre splash (Linux/NTFS: usa --no-sandbox em dev)
npm run dev:server   # só o servidor HTTP (porta 3000)
npm run smoke:fase2  # bootstrap + CRUD + persistência
npm run smoke:fase3  # WebSocket live + paridade 8 ações + latência ≤500ms
npm run smoke:fase4  # UI operador Vue 3 + /operator + projeção louvor
npm run smoke:fase8  # instalação limpa + 6 ações socket + latência ≤500ms
npm run typecheck
npm run build        # server + electron + operator
npm run smoke:cad112 # valida openapi.yaml + /api/docs
```

## API HTTP (OpenAPI)

| Recurso | URL (servidor activo) |
|---------|------------------------|
| Especificação | [`openapi.yaml`](openapi.yaml) na raiz do repo |
| YAML servido | `GET /api/docs/openapi.yaml` |
| Swagger UI | `GET /api/docs` (CDN unpkg) |
| WebSocket | `ws://localhost:3000/ws/live` (ver `x-websocket` na spec) |

Autenticação: `Authorization: Bearer <token>` após `POST /api/auth/login`. Rotas de operador aceitam sessão ou pedidos de `localhost` sem token.

### Segurança — `/api/users` e bypass loopback (M13)

`/api/users` (listar, criar, editar utilizadores) usa o mesmo middleware `requireOperatorAccess` que aprovações e chrome-tabs:

| Origem do pedido | Autenticação |
|------------------|--------------|
| Socket **loopback** (`127.0.0.1`, `::1`) | Sem token — UI Electron local (`UsersPanel`) |
| **LAN** ou remoto (IP não loopback) | Bearer com papel `operator` obrigatório |

**Decisão (CAD-128):** manter bypass só no Electron/loopback; não exigir token em `127.0.0.1` (quebra bootstrap e menu Configurações → Utilizadores).

**Risco residual:** num PC partilhado na igreja, qualquer processo *local* pode gerir utilizadores via `http://127.0.0.1:<porta>/api/users` sem credenciais. Mitigação operacional: conta Windows/Linux dedicada ao operador, rede LAN confiável, trocar password bootstrap após instalação. Pedidos vindos da rede LAN **já exigem** token operador.

Regressão: `npm run smoke:cad128`.

## Release (Fase 8 — CA-R02, CA-R03)

Builds multi-plataforma via [electron-builder](https://www.electron.build/) (`electron-builder.yml`):

| Comando | Artefacto |
|---------|-----------|
| `npm run dist:win` | Instalador NSIS Windows x64 |
| `npm run dist:linux` | AppImage Linux x64 |
| `npm run dist:snap` | Snap Linux |
| `npm run dist:mac` | DMG macOS (x64 + arm64) |
| `npm run dist:all` | Win + Linux + macOS (CI) |

Saída em `release-builds/`. Ícones em `resources/icon/` (legado `v0.0.8/app/icon/`).

### Auto-update (CA-R03)

Em builds empacotados (`app.isPackaged`):

1. `electron-updater` verifica releases GitHub (`cadimos/livepraise`) ao iniciar.
2. Download e instalação em **segundo plano** (`autoDownload`, `autoInstallOnAppQuit`).
3. **Fallback:** em erro de rede/download, notificação nativa orienta instalação manual a partir do release.

Em desenvolvimento (`npm run dev`), o updater fica inactivo. API exposta no preload: `livepraise.onUpdateStatus`, `checkForUpdates`, `installUpdate`.

### Persistência SQLite

O servidor usa **`node:sqlite`** (`DatabaseSync`) — módulo nativo do Node 22+, sem dependências nativas npm. Compatível com Electron 42; `electron-builder` não precisa de `electron-rebuild` para SQLite.

### Publicar release

```bash
# Token GitHub com permissão repo (releases)
export GH_TOKEN=...
npm run build
npm run dist:linux -- --publish always   # ou dist:win / dist:mac
```

Publicação usa `publish` em `electron-builder.yml` (provider `github`). Versão segue `package.json`.

### Smoke de release

```bash
npm run smoke:fase8
```

Valida bootstrap (instalação limpa), health `fase-8-release`, 6 ações WebSocket e latência LAN ≤500 ms.

## Legado

Para executar a versão histórica:

```bash
cd v0.0.8
npm install
npm start
```

## Documentação

- Escopo: `Escopos/livepraise/escopo.md` (Cadimos)
- Wiki histórica: [GitHub Wiki](https://github.com/cadimos/livepraise/wiki)

## Licença

MIT — ver [LICENSE](LICENSE).
