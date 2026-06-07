# Live Praise

![version](https://shields.io/github/package-json/v/cadimos/livepraise)

Software desktop open-source (MIT) para projeção de louvores, passagens bíblicas, imagens e vídeos em cultos — operador local com pré-visualização multi-saída, retorno de palco, ecrãs externos e controlo remoto.

**Versão actual:** `1.0.0-alpha.2` — ver [`CHANGELOG.md`](CHANGELOG.md) para novidades e migração.

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

### Para uso (após instalação)

Requisitos para correr o **instalador** (NSIS, `.deb`, AppImage, DMG, etc.) — não precisa de Node.js nem npm.

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| **Processador** | 64 bits, 2 núcleos | 4+ núcleos (conversão de vídeo com ffmpeg é pesada) |
| **Memória RAM** | 4 GB | 8 GB ou mais |
| **Disco livre** | 2 GB (app + dados iniciais em `~/livepraise`) | 10 GB+ se usar muitos vídeos/imagens locais |
| **Ecrã** | 1 monitor (só operador) | 2+ monitores (operador + projetor/retorno) |
| **Resolução (operador)** | 1024×768 (ver [detalhe abaixo](#resolução-do-monitor-do-operador)) | 1366×768 ou 1920×1080 |
| **Resolução (projetor)** | 800×600 (ver [detalhe abaixo](#resolução-do-monitor-do-projetor)) | 1024×768, 1280×720 ou 1920×1080 |
| **Rede** | Opcional (uso só local) | LAN estável se usar `/remote`, ecrãs externos ou importação por URL |

**Sistemas operativos suportados (builds oficiais):**

| SO | Versão mínima | Arquitectura |
|----|---------------|--------------|
| **Windows** | 10 ou 11 | x64 (64 bits) |
| **macOS** | 11 (Big Sur) | Intel x64 ou Apple Silicon (M1+) |
| **Linux** | Distro recente com glibc 2.31+ (ex.: Ubuntu 20.04+, Fedora 34+, Debian 11+) | x64 |

**Linux — dependências extra (consoante o formato):**

- **AppImage:** `libfuse2` (Ubuntu/Debian: `sudo apt install libfuse2`).
- **`.deb` / `.rpm` / `.pacman`:** o gestor de pacotes instala dependências GTK/NSS (ver `electron-builder.yml`).
- **Snap / Flatpak:** `snapd` ou [Flatpak](https://flatpak.org/setup/) instalados.

### Resolução do monitor do operador

A interface do operador (barra de ferramentas, painéis, coluna de pré-visualização, tabs e fila da playlist) foi optimizada para portáteis com ecrãs mais baixos. A coluna de prévias ocupa **320 px** de largura fixa (`20rem`); a fila de versos usa **21% da altura** do ecrã (`21vh`).

| Classificação | Resolução | Experiência |
|---------------|-----------|-------------|
| **Recomendada** | **1366×768** | Melhor equilíbrio em PCs antigos: painéis legíveis, barra de ferramentas numa linha na maioria dos casos |
| Aceitável | 1280×720 | Utilizável; a barra de ferramentas pode passar a duas linhas (rótulos longos em português) |
| Mínima funcional | 1024×768 | Possível com compromissos: painel Bíblia (3 colunas) apertado, mais scroll; manter escala de fonte em **100%** (Configurações → Aparência) |
| Confortável | ≥ 1440×900 | Barra numa linha, listas e pré-visualizações folgadas |
| Não recomendada | Abaixo de 1024×600 | Fila da playlist e painéis ficam demasiado comprimidos |

**Distribuição vertical aproximada (ex.: 768 px de altura):**

| Área | Altura |
|------|--------|
| Barra de ferramentas | ~32 px |
| Painéis + pré-visualizações | ~500 px |
| Tabs da playlist | ~28 px |
| Fila de versos (`21vh`) | ~161 px |
| Barra de estado | ~32 px |

**Dicas em ecrãs pequenos:** escala de interface **100%** (evitar 125% em alturas abaixo de 800 px); maximizar a janela do operador; usar scroll nos painéis e na coluna de prévias quando necessário. Não há tamanho mínimo de janela imposto pelo Electron — reduzir abaixo de 1024×768 degrada a legibilidade.

### Resolução do monitor do projetor

A saída de projeção (`/projector`, janela Electron ou browser no monitor atribuído) adapta-se ao tamanho físico do ecrã. O tamanho da **área útil** (letras, Bíblia, imagens, vídeo) configura-se em **Configurações → Ecrã do projetor** por monitor.

| Classificação | Resolução | Experiência |
|---------------|-----------|-------------|
| **Recomendada** | **1024×768** ou superior | Boa legibilidade para louvor e Bíblia na maioria dos perfis de tipografia |
| Aceitável | 1280×720 (16:9) | Área útil ampla; ideal para projetores widescreen |
| Mínima funcional | **800×600** (SVGA, 4:3) | Viável em equipamento antigo; atenção a estrofes longas (ver abaixo) |
| Confortável | ≥ 1920×1080 | Máximo de área para textfill e fundos em alta resolução |
| Não recomendada | Abaixo de 800×600 | Não testada; tipografia e vídeo podem ficar ilegíveis |

**Presets de tamanho em 800×600:**

| Preset | Área útil aproximada | Notas |
|--------|----------------------|-------|
| **Padrão** (`padrao`) | 800×600 (ecrã inteiro) | Opção mais simples em monitor SVGA |
| **4:3** | 800×600 | Encaixa exactamente na largura do monitor |
| **16:9** | 800×450 | Barras em cima/baixo; menos altura para letras |
| **Personalizado** `800×600` | 800×600 fixos | Útil quando o monitor é maior e quer área centrada |

**Louvor com muito texto:** com o auto-ajuste activo, a fonte no projetor **não desce abaixo do tamanho mínimo** do perfil (por defeito **24 px**). Em 800×600, versos muito longos podem ser cortados na zona central. Reduza o mínimo em **Configurações → Tipografia de projeção → Projetor** (ex.: 16–18 px) ou divida o verso em slides menores.

**Dicas:** atribua o monitor de projeção em **Configurações → Ecrã do projetor**; use preset **4:3** ou **padrão** em projetores SVGA; imagens e vídeo escalam à área configurada. A janela do projetor no Electron ocupa sempre o monitor completo — não há tamanho mínimo imposto pelo aplicativo.

**Notas de uso:**

- O servidor HTTP/WebSocket corre em **localhost** (porta 3000 por defeito); dispositivos na mesma rede podem aceder a `/live`, `/remote` e ecrãs externos se a firewall o permitir.
- Importação de vídeos (ficheiro, YouTube, URL) e geração de miniaturas usam **ffmpeg** já incluído no pacote — não é preciso instalar ffmpeg à parte.
- Para culto com projeção ao vivo, use SSD e evite disco quase cheio; backups em Configurações → Backup / Restore.

### Para desenvolvimento

Requisitos para clonar o repositório, compilar e correr `npm run dev` / `npm run build`.

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| **Processador** | 64 bits, 4 núcleos | 6+ núcleos |
| **Memória RAM** | 8 GB | 16 GB |
| **Disco livre** | ~5 GB (`node_modules`, `dist`, Electron, ffmpeg/yt-dlp em `vendor/`) | 15 GB+ (inclui `release-builds/` se gerar instaladores) |
| **SO** | Windows 10+, macOS 11+ ou Linux x64 (mesma família que o destino de teste) | Igual ao SO onde vai empacotar/distribuir |

**Software obrigatório:**

- **Node.js** ≥ 22.12 (`engines` em `package.json`; `node:sqlite` built-in)
- **npm** 10+
- **Git**

O `postinstall` descarrega automaticamente o binário **Electron 42**, **ffmpeg** e **yt-dlp** para o SO actual (`scripts/install-electron.mjs`, `install-ffmpeg.mjs`, `install-yt-dlp.mjs`). Use `nvm use` com o `.nvmrc` do repositório.

**Linux (desenvolvimento):**

- Ferramentas de compilação se algum módulo nativo pedir rebuild (`build-essential` no Debian/Ubuntu).
- **Partição NTFS / disco externo:** se `npm run dev` falhar com `chrome-sandbox` / SUID, o script de dev usa `--no-sandbox` só em desenvolvimento. Em ext4 com sandbox correcto (`chmod 4755` no `chrome-sandbox` do Electron), pode dispensar esse modo.

**Alternar entre Windows e Linux:**

O Electron em `node_modules/electron/dist` é **por SO**. Após clonar ou copiar o projeto de outra máquina, execute `npm install` de novo para obter o binário correcto.

**Upgrade de v0.0.8 → 1.x (dados de utilizador):**

1. Feche o Live Praise antigo antes de copiar ficheiros.
2. Copie `~/livepraise/` incluindo `dsw.bd` e, se existirem, `dsw.bd-wal` / `dsw.bd-shm`.
3. No primeiro arranque de 1.x: backup automático em `~/livepraise/backup/auto-upgrade/` e migrations incrementais.
4. Base corrompida: o app isola `dsw.bd.corrupt-*` e cria uma base nova — restaure um `dsw.bd` íntegro ou use Backup/Restore.

**Empacotamento opcional (maintainers):**

| Formato | Extra no SO de build |
|---------|----------------------|
| **Windows** (`npm run dist:win`) | Windows x64 |
| **Linux** (`npm run dist:linux`) | Linux x64; ver tabela abaixo em [Release → Dependências Linux](#dependências-de-build-no-linux-ubuntudebian) |
| **macOS** (`npm run dist:mac`) | macOS (DMG só se gera no Mac) |

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

### Dependências de build no Linux (Ubuntu/Debian)

O `npm run dist:linux` gera **AppImage, `.deb`, `.rpm` e `.pacman`** na mesma execução. O [electron-builder](https://www.electron.build/) usa `fpm`, que no Ubuntu/Debian **não traz** todas as ferramentas nativas — é preciso instalá-las no host de build:

| Pacote alvo | Ferramenta no host de build | Instalação (Ubuntu/Debian) |
|-------------|----------------------------|----------------------------|
| `.rpm` | `rpmbuild` | `sudo apt-get install rpm` |
| `.pacman` | `bsdtar` | `sudo apt-get install libarchive-tools` |
| `.deb` / AppImage | `fpm` (cache do electron-builder) | Normalmente sem pacotes extra |
| Snap | `snapcraft` | `sudo snap install snapcraft --classic` |
| Flatpak | `flatpak-builder` | `sudo apt-get install flatpak-builder` |

**Instalação recomendada** antes de `npm run dist:linux` no Ubuntu/Debian:

```bash
sudo apt-get install -y rpm libarchive-tools
which rpmbuild bsdtar   # ambos devem existir
```

Erros típicos:

| Mensagem | Solução |
|----------|---------|
| `Need executable 'rpmbuild'` | `sudo apt-get install rpm` |
| `bsdtar -czf .MTREE` / exit code **127** | `sudo apt-get install libarchive-tools` |

Alternativa: gerar só os formatos que precisa:

```bash
npm run build
npm run dist:linux-deb          # só .deb
npm run dist:linux-appimage     # só AppImage
npm run dist:linux-rpm          # só .rpm (requer rpm)
npm run dist:linux-pacman       # só .pacman (requer libarchive-tools)
```

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
