# Live Praise

![version](https://shields.io/github/package-json/v/cadimos/livepraise)

Software desktop open-source (MIT) para projeção de louvores, passagens bíblicas, imagens e vídeos em cultos — operador local com pré-visualização multi-saída, retorno de palco, ecrãs externos e controlo remoto.

**Versão actual:** `1.0.0-alpha.1` — ver [`CHANGELOG.md`](CHANGELOG.md) para novidades e migração.

## Funcionalidades

- Fila de projeção com abas (louvor, Bíblia, imagens, vídeos, slides em branco) e drag-and-drop.
- Multi-monitor: operador, projetor, retorno de palco; papéis configuráveis por ecrã.
- Pré-visualização por destino de saída (projetor, retorno, live, vocal, stage, player).
- Tipografia de projeção configurável por perfil (fonte, textfill, sombra).
- Fundos rápidos, congelar ecrã, timer de culto e alerta no rodapé.
- Importação para fila: ficheiro local, YouTube e URL HTTP(S).
- Autenticação local, utilizadores com papéis, controlo remoto web e fila de aprovações.
- Backup e restore selectivo do ambiente (`~/livepraise`).
- Auto-update via GitHub Releases em builds empacotados.

## Estrutura do repositório

```
livepraise/
├── electron/          # Processo principal Electron (splash, monitores)
├── server/            # HTTP + WebSocket
├── core/              # Lógica de sistema (projeção, auth, temas, segurança)
├── apps/
│   ├── operator/      # Vue 3 + Vite + Tailwind
│   ├── projector/     # Projeção pública
│   └── stage-return/  # Retorno de palco
├── web/               # Portal, /live, /remote, ecrãs externos
├── themes/            # Temas (theme.json + assets)
├── locales/           # Traduções
├── install/           # Payload da primeira instalação → ~/livepraise
├── shared/            # Tipos e utilitários TS partilhados
└── resources/         # Ícones e assets de build
```

## Requisitos

- **Node.js** ≥ 22.5 (`node:sqlite` built-in, alinhado ao Electron 42)
- **npm** 10+

### Linux (partição NTFS / externa)

Se `npm run dev` falhar com erro de `chrome-sandbox` / SUID, o script `dev` já define `ELECTRON_DISABLE_SANDBOX=1` e `--no-sandbox` (apenas desenvolvimento). Em ext4 nativo com sandbox configurado (`chmod 4755` no `chrome-sandbox`), pode remover esses flags localmente.

## Desenvolvimento

```bash
npm install
npm run dev          # compila e abre o Electron (Linux/NTFS: --no-sandbox em dev)
npm run dev:server   # só o servidor HTTP (porta 3000)
npm run typecheck
npm run build        # server + electron + operator + projetor + stage-return
```

Regressão entre versões (release / CI): [`scripts/README.md`](scripts/README.md) — `npm run smoke:release`.

## Instalação

Baixe os instaladores na página **[GitHub Releases](https://github.com/cadimos/livepraise/releases)** (secção *Assets* da versão desejada). Os nomes dos ficheiros incluem a versão; substitua `<versão>` nos exemplos pelo nome real do download.

Em builds empacotados, o Live Praise verifica actualizações no GitHub ao iniciar (`electron-updater`). A instalação manual abaixo aplica-se à primeira instalação ou quando preferir actualizar à mão.

### Windows — instalador NSIS (`.exe`)

1. Descarregue `Live Praise Setup <versão>.exe`.
2. Execute o instalador (duplo clique). Se o Windows SmartScreen avisar, escolha **Mais informações** → **Executar mesmo assim** (builds sem assinatura de código).
3. Siga o assistente (pasta de instalação, atalho no menu Iniciar).
4. Abra **Live Praise** pelo menu Iniciar ou pelo atalho no ambiente de trabalho.

Desinstalação: **Definições → Aplicações → Live Praise → Desinstalar**, ou **Adicionar ou remover programas**.

### macOS — imagem de disco (`.dmg`)

1. Descarregue o `.dmg` adequado ao seu Mac:
   - **Apple Silicon (M1/M2/M3…):** ficheiro `arm64` ou *Apple Silicon*, se existir em separado.
   - **Intel:** ficheiro `x64` ou *Intel*, se existir em separado.
2. Abra o `.dmg` e arraste **Live Praise** para a pasta **Aplicações**.
3. Na primeira execução, se o macOS bloquear: **Definições do Sistema → Privacidade e segurança → Abrir mesmo assim**.

Desinstalação: mova **Live Praise** de **Aplicações** para o Lixo.

### Linux — AppImage (qualquer distro recente)

1. Descarregue `Live Praise-<versão>.AppImage`.
2. Torne o ficheiro executável e execute:

```bash
chmod +x "Live Praise-<versão>.AppImage"
./"Live Praise-<versão>.AppImage"
```

3. (Opcional) Integrar no menu de aplicações com [AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher) ou movendo o ficheiro para `~/Applications` / `~/.local/bin`.

Requisito usual: `libfuse2` (Ubuntu/Debian: `sudo apt install libfuse2`).

### Linux — Debian / Ubuntu / Mint (`.deb`)

```bash
sudo dpkg -i live-praise_<versão>_amd64.deb
# Se faltar dependência:
sudo apt-get install -f
```

Desinstalação: `sudo apt remove live-praise`

### Linux — Fedora / RHEL / openSUSE (`.rpm`)

```bash
# Fedora / RHEL 8+
sudo dnf install ./live-praise-<versão>.x86_64.rpm

# openSUSE
sudo zypper install ./live-praise-<versão>.x86_64.rpm
```

Desinstalação: `sudo dnf remove live-praise` ou equivalente no gestor de pacotes.

### Linux — Arch / Manjaro (`.pacman`)

```bash
sudo pacman -U ./live-praise-<versão>.pacman
```

Actualizações posteriores: descarregue o novo `.pacman` e repita o comando, ou use `-U` sobre o pacote mais recente.

### Linux — Flatpak (`.flatpak`)

Requer [Flatpak](https://flatpak.org/setup/) instalado.

```bash
flatpak install --user "Live Praise-<versão>.flatpak"
flatpak run com.cadimos.livepraise
```

Se o ficheiro tiver outro nome, use o caminho exacto do asset do release. Desinstalação: `flatpak uninstall com.cadimos.livepraise`.

### Linux — Snap (`.snap`)

Requer `snapd` instalado e activo.

```bash
sudo snap install live-praise_<versão>_amd64.snap --dangerous
```

O flag `--dangerous` é necessário para instalar um snap descarregado directamente (fora da Snap Store). Desinstalação: `sudo snap remove live-praise`.

---

**Dados da aplicação:** na primeira execução, o conteúdo (músicas, imagens, base de dados, temas) é criado em `~/livepraise`. Backup e restore estão em Configurações → Backup / Restore (admin).

## API HTTP (OpenAPI)

| Recurso | URL (servidor activo) |
|---------|------------------------|
| Especificação | [`openapi.yaml`](openapi.yaml) na raiz do repo |
| YAML servido | `GET /api/docs/openapi.yaml` |
| Swagger UI | `GET /api/docs` (CDN unpkg) |
| WebSocket | `ws://localhost:3000/ws/live` (ver `x-websocket` na spec) |
| Health | `GET /health` |

Autenticação: `Authorization: Bearer <token>` após `POST /api/auth/login`. Rotas de operador aceitam sessão ou pedidos de `localhost` sem token.

### Segurança — `/api/users` e bypass loopback

`/api/users` usa o middleware `requireOperatorAccess`:

| Origem do pedido | Autenticação |
|------------------|--------------|
| Socket **loopback** (`127.0.0.1`, `::1`) | Sem token — UI Electron local |
| **LAN** ou remoto | Bearer com papel `operator` ou `admin` |

**Risco residual:** num PC partilhado, qualquer processo local pode gerir utilizadores via `http://127.0.0.1:<porta>/api/users` sem credenciais. Mitigação: conta dedicada ao operador, rede LAN confiável, trocar password bootstrap após instalação.

Papéis detalhados: [`docs/auth-roles.md`](docs/auth-roles.md).

## Release

Builds multi-plataforma via [electron-builder](https://www.electron.build/) (`electron-builder.yml`):

| Comando | Artefacto |
|---------|-----------|
| `npm run dist:all` | Win + Linux (+ DMG no Mac; snap/flatpak no Linux se instalados) |
| `npm run dist:win` | Instalador NSIS Windows x64 |
| `npm run dist:linux` | AppImage + `.deb` + `.rpm` + `.pacman` Linux x64 |
| `npm run dist:linux-appimage` | Só AppImage |
| `npm run dist:linux-deb` | Só `.deb` |
| `npm run dist:linux-rpm` | Só `.rpm` |
| `npm run dist:linux-pacman` | Só `.pacman` |
| `npm run dist:flatpak` | Flatpak (requer `flatpak-builder`) |
| `npm run dist:snap` | Snap Linux |
| `npm run dist:mac` | DMG macOS (x64 + arm64) |

> O DMG macOS só é gerado num **Mac** (`dist:mac` ou workflow CA-R40 macOS). Para release completo nos três SO, use os workflows GHA ou `dist:all` / `dist:mac` em cada plataforma.

Saída em `release-builds/`. Ícones em `resources/icon/`.

### Auto-update

Em builds empacotados (`app.isPackaged`):

1. `electron-updater` verifica releases GitHub (`cadimos/livepraise`) ao iniciar.
2. Download e instalação em **segundo plano** (`autoDownload`, `autoInstallOnAppQuit`).
3. **Fallback:** em erro de rede/download, notificação nativa orienta instalação manual a partir do release.

Em desenvolvimento (`npm run dev`), o updater fica inactivo.

### Persistência SQLite

O servidor usa **`node:sqlite`** (`DatabaseSync`) — módulo nativo do Node 22+, sem `electron-rebuild` para SQLite.

### Publicar release

```bash
export GH_TOKEN=...
npm run build
npm run dist:linux -- --publish always   # ou dist:win / dist:mac
```

Versão e notas seguem `package.json` e [`CHANGELOG.md`](CHANGELOG.md).

### Smoke de release

```bash
npm run smoke:release
```

Valida bootstrap, pipeline de vídeo, health, acções WebSocket e latência LAN. Detalhes em [`scripts/README.md`](scripts/README.md).

## Documentação

- [`CHANGELOG.md`](CHANGELOG.md) — histórico de versões
- [`INVENTARIO-FUNCOES.md`](INVENTARIO-FUNCOES.md) — backlog conhecido
- [`docs/auth-roles.md`](docs/auth-roles.md) — papéis de utilizador
- [GitHub Wiki](https://github.com/cadimos/livepraise/wiki)

## Licença

MIT — ver [LICENSE](LICENSE).
