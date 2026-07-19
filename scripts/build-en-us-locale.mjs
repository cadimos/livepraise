#!/usr/bin/env node
/**
 * Gera locales/en-US.json a partir de pt-BR.json (paridade de chaves).
 * Traduções manuais — executar após alterar chaves em pt-BR.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PT = path.join(ROOT, 'locales/pt-BR.json');
const EN = path.join(ROOT, 'locales/en-US.json');
const INSTALL = path.join(ROOT, 'install/locales/en-US.json');

/** @param {unknown} value */
function translateValue(value) {
  if (typeof value !== 'string') return value;
  const map = {
    'Software de projeção para igrejas': 'Church projection software',
    'Operador': 'Operator',
    'A iniciar…': 'Starting…',
    '{count} monitor(es) detectado(s)': '{count} monitor(s) detected',
    'WebSocket conectado': 'WebSocket connected',
    'Reconectando…': 'Reconnecting…',
    'Login necessário (portal)': 'Login required (portal)',
    'Imagens': 'Images',
    'Vídeos': 'Videos',
    'Músicas': 'Songs',
    'Bíblias': 'Bibles',
    'Tema': 'Theme',
    'Idioma': 'Language',
    'Tema e idioma': 'Theme and language',
    'Preferências de aparência do operador (também disponíveis na barra de estado).':
      'Operator appearance preferences (also available in the status bar).',
    'Tamanho da interface': 'Interface size',
    'Escala tipográfica global do operador (100–125%).':
      'Global operator typography scale (100–125%).',
    '{percent} por cento': '{percent} percent',
    'Tipografia de projeção': 'Projection typography',
    'Configure fonte, tamanho e sombra do texto projectado para cada destino. Alterações aplicam-se aos clientes de projeção em cerca de um segundo.':
      'Configure font, size and shadow of projected text for each output. Changes apply to projection clients within about one second.',
    'Projetor': 'Projector',
    'Retorno palco': 'Stage return',
    'Live': 'Live',
    'Vocal': 'Vocal',
    'Palco': 'Stage',
    'Player': 'Player',
    'Fonte': 'Font',
    'Tamanho': 'Size',
    'Auto-ajuste': 'Auto-fit',
    'Sombra no texto': 'Text shadow',
    'Origem da fonte': 'Font source',
    'Fontes do Live Praise': 'Live Praise fonts',
    'Fontes do sistema': 'System fonts',
    'Fontes do sistema dependem do equipamento que projecta. Tablets ou PCs remotos podem não ter a mesma fonte instalada.':
      'System fonts depend on the projecting device. Tablets or remote PCs may not have the same font installed.',
    'Família tipográfica': 'Font family',
    'Estilo': 'Style',
    'Normal': 'Normal',
    'Negrito': 'Bold',
    'Itálico': 'Italic',
    'Negrito itálico': 'Bold italic',
    'Tamanho mínimo': 'Minimum size',
    'Tamanho máximo': 'Maximum size',
    'px': 'px',
    'Na saída real o texto cresce até ao máximo que couber na área útil.':
      'On real output the text grows up to the largest size that fits the usable area.',
    'O mínimo não pode ser maior que o máximo.':
      'Minimum cannot be greater than maximum.',
    'Auto-ajustar texto para caber': 'Auto-fit text to area',
    'Reduz ou aumenta a fonte para evitar scroll e corte. Desligado usa o tamanho máximo fixo.':
      'Shrinks or grows the font to avoid scroll and clipping. Off uses fixed maximum size.',
    'Usar sombra no texto': 'Use text shadow',
    'Texto plano, sem contorno ou sombra.': 'Flat text, no outline or shadow.',
    'Camadas de sombra': 'Shadow layers',
    'Camada {index}': 'Layer {index}',
    'Deslocamento horizontal': 'Horizontal offset',
    'Deslocamento vertical': 'Vertical offset',
    'Desfoque': 'Blur',
    'Cor': 'Color',
    'Adicionar camada': 'Add layer',
    'Remover última camada': 'Remove last layer',
    'Restaurar padrão': 'Restore default',
    'Modo avançado (CSS)': 'Advanced mode (CSS)',
    'Apenas para utilizadores experientes. CSS inválido será ignorado.':
      'For experienced users only. Invalid CSS will be ignored.',
    'Não foi possível aplicar este CSS. Verifique a sintaxe.':
      'Could not apply this CSS. Check the syntax.',
    'Prévia': 'Preview',
    'Texto de exemplo': 'Sample text',
    'Louvor longo': 'Long worship',
    'Bíblia': 'Bible',
    'Notas curtas': 'Short notes',
    'Prévia: o texto cabe nesta área. Em {destination} a fonte pode ser maior.':
      'Preview: text fits in this area. On {destination} the font may be larger.',
    'Senhor, eu sei que Tu és fiel': 'Lord, I know You are faithful',
    'Em cada estação do meu caminho\nTu estás comigo, não me deixas só\nQuando a noite cai e o medo vem\nTua luz dissipa toda escuridão':
      'In every season of my journey\nYou are with me, You never leave me alone\nWhen night falls and fear comes\nYour light dispels all darkness',
    'Exemplo de louvor (Artista)': 'Worship sample (Artist)',
    'Salmos 23:1': 'Psalm 23:1',
    'O Senhor é o meu pastor; nada me faltará.': 'The Lord is my shepherd; I shall not want.',
    'Intervalo — 5 min': 'Break — 5 min',
    'Tipografia guardada.': 'Typography saved.',
    'Não foi possível guardar. Tente novamente.': 'Could not save. Please try again.',
    'Louvor e estofres': 'Worship and stanzas',
    'Como os versos longos são divididos na fila de projeção e na lista do painel Músicas.':
      'How long verses are split in the projection queue and Songs panel list.',
    'Linhas máximas por estofre': 'Maximum lines per stanza',
    'linhas': 'lines',
    'Versos com mais linhas são divididos em blocos (padrão 4). Ex.: 8 linhas → dois blocos de 4; 9 linhas → 4+5. Não altera a letra guardada na base de dados. Remova e volte a adicionar músicas já na fila para aplicar um novo valor.':
      'Verses with more lines are split into blocks (default 4). E.g. 8 lines → two blocks of 4; 9 lines → 4+5. Does not change lyrics stored in the database. Remove and re-add songs already in the queue to apply a new value.',
    'Bíblia e pesquisa': 'Bible and search',
    'Histórico de referências recentes no campo de pesquisa do painel Bíblia.':
      'Recent reference history in the Bible panel search field.',
    'Guardar histórico de pesquisa': 'Save search history',
    'Itens no histórico': 'History items',
    'referências': 'references',
    'Quantidade máxima de referências recentes mostradas como atalhos (padrão 5).':
      'Maximum recent references shown as shortcuts (default 5).',
    'Limpar histórico': 'Clear history',
    'Utilizadores': 'Users',
    'Contas para acesso remoto e operador local. Alterações de senha ou papel invalidam sessões activas.':
      'Accounts for remote access and local operator. Password or role changes invalidate active sessions.',
    'Nome de utilizador': 'Username',
    'Senha': 'Password',
    'Nova senha': 'New password',
    'Deixe em branco para manter': 'Leave blank to keep',
    'Papel': 'Role',
    'Conta activa': 'Active account',
    'inactivo': 'inactive',
    'Editar': 'Edit',
    'Guardar': 'Save',
    'A guardar…': 'Saving…',
    'Cancelar': 'Cancel',
    'Criar utilizador': 'Create user',
    'Novo utilizador': 'New user',
    'Utilizador criado.': 'User created.',
    'Utilizador actualizado.': 'User updated.',
    'Nenhum utilizador registado.': 'No users registered.',
    'Remoto': 'Remote',
    'Administrador': 'Administrator',
    'Erro ao carregar utilizadores': 'Error loading users',
    'Erro ao guardar utilizador': 'Error saving user',
    'Utilizador e senha são obrigatórios': 'Username and password are required',
    'Fila de aprovação': 'Approval queue',
    'Pedidos remotos aguardando confirmação do operador.':
      'Remote requests awaiting operator confirmation.',
    'Fila de aprovação remota': 'Remote approval queue',
    'Nenhum pedido pendente.': 'No pending requests.',
    'Aprovar': 'Approve',
    'Rejeitar': 'Reject',
    'Backup e restauração': 'Backup and restore',
    'Exporte ou importe o ambiente Live Praise (base de dados, mídia, temas e preferências). Apenas administradores. Use ao mudar de computador ou recuperar após uma falha.':
      'Export or import the Live Praise environment (database, media, themes and preferences). Administrators only. Use when moving computers or recovering after a failure.',
    'Gerar backup…': 'Create backup…',
    'Restaurar de ficheiro…': 'Restore from file…',
    'Gerar backup': 'Create backup',
    'Restaurar ambiente': 'Restore environment',
    'Escolha o que incluir no ficheiro .zip. Itens desmarcados não entram no backup.':
      'Choose what to include in the .zip file. Unchecked items are not included in the backup.',
    'Seleccione um backup (.zip) gerado por este sistema. Só pode restaurar grupos que existam nesse ficheiro.':
      'Select a backup (.zip) generated by this system. You can only restore groups present in that file.',
    'Restaurar substitui os dados seleccionados neste computador. Confirme que o ficheiro veio de uma fonte de confiança.':
      'Restore replaces selected data on this computer. Confirm the file came from a trusted source.',
    'Dados sensíveis no backup': 'Sensitive data in backup',
    'Este ficheiro contém dados da sua igreja. Se incluir a base de dados, também leva nomes de utilizadores e credenciais (palavras-passe encriptadas). Guarde-o num local seguro, apenas em dispositivos de confiança, e elimine-o quando já não for necessário. Não envie por e-mail nem armazene em nuvem pública sem encriptação adicional.':
      'This file contains your church data. If the database is included, it also carries usernames and credentials (encrypted passwords). Store it securely, only on trusted devices, and delete it when no longer needed. Do not email it or store in public cloud without additional encryption.',
    'Este backup não está protegido por palavra-passe. Qualquer pessoa com acesso ao ficheiro pode tentar recuperar contas de operador.':
      'This backup is not password-protected. Anyone with access to the file may attempt to recover operator accounts.',
    'Seleccionar todos': 'Select all',
    'Limpar selecção': 'Clear selection',
    'A gerar backup…': 'Creating backup…',
    'A processar: {group}': 'Processing: {group}',
    'Grupo {current} de {total}: {group}': 'Group {current} of {total}: {group}',
    'Escolher ficheiro .zip…': 'Choose .zip file…',
    'Continuar': 'Continue',
    'Voltar': 'Back',
    'A restaurar…': 'Restoring…',
    'Fechar': 'Close',
    'Reiniciar aplicação': 'Restart application',
    'Backup concluído': 'Backup complete',
    'O ficheiro foi guardado com sucesso.': 'File saved successfully.',
    'Tamanho: {size} · Grupos: {groups}': 'Size: {size} · Groups: {groups}',
    'Restauro concluído': 'Restore complete',
    'Os grupos seleccionados foram aplicados.': 'Selected groups were applied.',
    'Backup de {date} · Versão {appVersion} · {groupCount} grupos no ficheiro':
      'Backup from {date} · Version {appVersion} · {groupCount} groups in file',
    'Não incluído neste backup': 'Not included in this backup',
    'Após restaurar a base de dados, todos os operadores terão de iniciar sessão novamente.':
      'After restoring the database, all operators must sign in again.',
    'Substituir dados existentes?': 'Replace existing data?',
    'Os seguintes grupos já existem neste computador e serão substituídos: {groups}.':
      'The following groups already exist on this computer and will be replaced: {groups}.',
    'Compreendo que os dados seleccionados serão substituídos':
      'I understand selected data will be replaced',
    'Substituir e restaurar': 'Replace and restore',
    'Por segurança, todas as sessões foram terminadas. Inicie sessão novamente antes de continuar a operar.':
      'For security, all sessions were ended. Sign in again before continuing to operate.',
    'Manutenção: backup ou restauro em curso. Algumas acções estão temporariamente indisponíveis.':
      'Maintenance: backup or restore in progress. Some actions are temporarily unavailable.',
    'Base de dados (louvor, utilizadores, Bíblia, sistema)':
      'Database (worship, users, Bible, system)',
    'Inclui contas de operador e credenciais encriptadas.':
      'Includes operator accounts and encrypted credentials.',
    'Imagens locais': 'Local images',
    'Pode aumentar bastante o tamanho do ficheiro.': 'May significantly increase file size.',
    'Vídeos locais': 'Local videos',
    'Ficheiros grandes — a geração pode demorar vários minutos.':
      'Large files — generation may take several minutes.',
    'Temas personalizados': 'Custom themes',
    'Traduções personalizadas': 'Custom translations',
    'Configuração de monitores': 'Monitor configuration',
    'Fundo de projeção guardado': 'Saved projection background',
    'Ficheiros de Bíblia': 'Bible files',
    'Registo local de erros': 'Local error log',
    'Pode conter detalhes técnicos sensíveis. Desmarcado por defeito.':
      'May contain sensitive technical details. Unchecked by default.',
    'Preferências do operador (filas, painéis, atalhos)':
      'Operator preferences (queues, panels, shortcuts)',
    'Estado guardado neste computador, não na pasta livepraise.':
      'State saved on this computer, not in the livepraise folder.',
    'Não foi possível concluir a operação. Tente novamente.':
      'Could not complete the operation. Please try again.',
    'Espaço em disco insuficiente para criar o backup.':
      'Insufficient disk space to create backup.',
    'Sem permissão para escrever no destino escolhido.':
      'No permission to write to the chosen destination.',
    'Ficheiro inválido ou manifesto em falta.': 'Invalid file or missing manifest.',
    'Este backup é de uma versão mais recente do Live Praise. Actualize a aplicação antes de restaurar.':
      'This backup is from a newer Live Praise version. Update the app before restoring.',
    'Confirme a substituição dos dados existentes.':
      'Confirm replacement of existing data.',
    'Seleccione pelo menos um grupo.': 'Select at least one group.',
    'Logs de erro': 'Error logs',
    'Erros recentes do servidor e falhas de API na interface do operador.':
      'Recent server errors and API failures in the operator interface.',
    'Nenhum erro registado.': 'No errors recorded.',
    'Actualizar': 'Refresh',
    'A actualizar…': 'Refreshing…',
    'Limpar logs': 'Clear logs',
    'Limpar todos os registos de erro? Esta acção não pode ser desfeita.':
      'Clear all error records? This action cannot be undone.',
    'Ver detalhe': 'View detail',
    'Ocultar detalhe': 'Hide detail',
    'Overlay de debug nos monitores': 'Debug overlay on monitors',
    'Quando activo, mostra no rodapé dos monitores de projeção e dos dispositivos ligados pela rede a última acção recebida (ex.: mudança de música às 17:08:38).':
      'When active, shows the last received action in the footer of projection monitors and network-connected devices (e.g. song change at 5:08:38 PM).',
    'Atalhos de teclado': 'Keyboard shortcuts',
    'Redefina as combinações abaixo. Se duas ações usarem a mesma tecla, o sistema avisa na hora. As alterações ficam guardadas neste computador, como as outras preferências do operador.':
      'Redefine the combinations below. If two actions use the same key, the system warns immediately. Changes are saved on this computer like other operator preferences.',
    'Ação': 'Action',
    'Contexto': 'Context',
    'Combinação': 'Combination',
    'Ações': 'Actions',
    'Redefinir': 'Redefine',
    'Limpar': 'Clear',
    'Padrão': 'Default',
    'Restaurar todos os padrões': 'Restore all defaults',
    'Pressione a nova combinação…': 'Press the new combination…',
    'Esc para cancelar': 'Esc to cancel',
    'Global': 'Global',
    'Abrir Sobre': 'Open About',
    'Versículo anterior': 'Previous verse',
    'Próximo versículo': 'Next verse',
    'Verso anterior (música)': 'Previous stanza (song)',
    'Próximo verso (música)': 'Next stanza (song)',
    'Limpar tela': 'Clear screen',
    'Congelar / descongelar': 'Freeze / unfreeze',
    'Recarregar dados': 'Reload data',
    'Prévia local': 'Local preview',
    'Pré-visualizações por saída de projeção': 'Previews per projection output',
    'Rascunho': 'Draft',
    'Fluxo sugerido: escolha a categoria, depois a música e o verso — em poucos cliques. As preferências são guardadas automaticamente neste computador.':
      'Suggested flow: choose category, then song and stanza — in a few clicks. Preferences are saved automatically on this computer.',
    'À espera do estado desta saída…': 'Waiting for this output state…',
    'Projetor 2': 'Projector 2',
    'Retorno de palco': 'Stage return',
    'Playlist / fila de projeção': 'Playlist / projection queue',
    'Fila vazia — arraste itens dos painéis ou crie uma fila em branco (+)':
      'Empty queue — drag items from panels or create a blank queue (+)',
    'Fechar aba': 'Close tab',
    'Sem itens nesta fila': 'No items in this queue',
    'Não foi possível importar a playlist.': 'Could not import playlist.',
    'Música não encontrada nesta base — letra do ficheiro mantida; pode remover a aba (×).':
      'Song not found in this database — file lyrics kept; you may remove the tab (×).',
    'Nova fila': 'New queue',
    'Fila {n}': 'Queue {n}',
    'Arraste versos, Bíblia, imagens ou vídeos para esta fila — ou solte numa aba acima.':
      'Drag stanzas, Bible, images or videos to this queue — or drop on a tab above.',
    'Arrastar para a fila de projeção': 'Drag to projection queue',
    'Música': 'Song',
    'Imagem': 'Image',
    'Vídeo': 'Video',
    'Em branco': 'Blank',
    'Remover da fila': 'Remove from queue',
    'Remover «{label}» da fila': 'Remove «{label}» from queue',
    'Online': 'Online',
    'A descarregar…': 'Downloading…',
    'Tentativa {attempt}/{max}…': 'Attempt {attempt}/{max}…',
    'A preparar vídeo…': 'Preparing video…',
    'Download indisponível': 'Download unavailable',
    'Tentar download de novo': 'Retry download',
    'Descarregar para biblioteca local': 'Download to local library',
    'Usar online': 'Use online',
    'Adicionar à fila': 'Add to queue',
    'Escolha como importar imagens ou vídeos para esta fila.':
      'Choose how to import images or videos into this queue.',
    'Imagens ou vídeos do computador': 'Images or videos from computer',
    'Importar vídeo do YouTube': 'Import YouTube video',
    'URL de imagem ou vídeo': 'Image or video URL',
    'Os ficheiros são copiados para a biblioteca local. Vídeos não-MP4 são convertidos automaticamente.':
      'Files are copied to the local library. Non-MP4 videos are converted automatically.',
    'Cole o link directo do ficheiro (PNG, JPG, MP4…). O servidor descarrega para a biblioteca local. Não use links com login ou páginas web. Evite URLs com palavras-passe ou tokens na query.':
      'Paste the direct file link (PNG, JPG, MP4…). The server downloads to the local library. Do not use login links or web pages. Avoid URLs with passwords or tokens in the query.',
    'URL da mídia': 'Media URL',
    'Ficheiro importado para a biblioteca local. O item já está na fila.':
      'File imported to local library. Item is already in the queue.',
    'Item adicionado com link remoto. Se a projeção falhar, o servidor do ficheiro pode bloquear o browser (CORS) — prefira importação local quando possível.':
      'Item added with remote link. If projection fails, the file server may block the browser (CORS) — prefer local import when possible.',
    'O item foi adicionado à fila. Feche quando tiver lido o resultado acima.':
      'Item was added to the queue. Close when you have read the result above.',
    'Pré-visualização da mídia importada': 'Imported media preview',
    'Escolher ficheiros': 'Choose files',
    'A enviar…': 'Uploading…',
    'O vídeo entra na fila de imediato. O download local tenta uma vez se o vídeo estiver protegido; se o download começar e for interrompido, repete até 3 vezes. Acompanhe o progresso no cartão da fila.':
      'Video enters the queue immediately. Local download tries once if the video is protected; if download starts and is interrupted, retries up to 3 times. Track progress on the queue card.',
    'URL do YouTube': 'YouTube URL',
    'Importar': 'Import',
    'A importar…': 'Importing…',
    'Vídeo descarregado para a biblioteca local (modo local). O item já está na fila.':
      'Video downloaded to local library (local mode). Item is already in the queue.',
    'Não foi possível descarregar; o item será reproduzido online. Registo também em Configurações → Registo de erros (fonte youtube-import).':
      'Could not download; item will play online. Also logged in Settings → Error log (source youtube-import).',
    'Adicionar': 'Add',
    'Não foi possível enviar o ficheiro.': 'Could not upload file.',
    'Não foi possível importar o vídeo.': 'Could not import video.',
    'Indique a URL do YouTube.': 'Enter the YouTube URL.',
    'Indique a URL da imagem ou vídeo.': 'Enter the image or video URL.',
    'Não foi possível importar a partir da URL.': 'Could not import from URL.',
    'Este link é do YouTube. Use «Importar vídeo do YouTube» no menu anterior.':
      'This link is from YouTube. Use «Import YouTube video» in the previous menu.',
    'Endereço não permitido. Use um link público na internet (https://).':
      'Address not allowed. Use a public internet link (https://).',
    'O endereço não é uma imagem ou vídeo suportado.':
      'Address is not a supported image or video.',
    'Ficheiro demasiado grande (máx. 50 MB imagem, 600 MB vídeo).':
      'File too large (max. 50 MB image, 600 MB video).',
    'O download demorou demasiado. Tente outro link ou ficheiro mais pequeno.':
      'Download took too long. Try another link or smaller file.',
    'Ligação segura falhou. Confirme que o site usa HTTPS válido.':
      'Secure connection failed. Confirm the site uses valid HTTPS.',
    'Nova música': 'New song',
    'Editar música': 'Edit song',
    'A carregar…': 'Loading…',
    'Nome': 'Name',
    'Artista': 'Artist',
    'Compositor': 'Composer',
    'Letra': 'Lyrics',
    'Separe cada verso com uma linha em branco entre eles.':
      'Separate each stanza with a blank line between them.',
    'Salvar': 'Save',
    'O nome da música é obrigatório.': 'Song name is required.',
    'O artista é obrigatório.': 'Artist is required.',
    'A letra é obrigatória.': 'Lyrics are required.',
    'Não foi possível guardar a música.': 'Could not save song.',
    'Não foi possível carregar a música.': 'Could not load song.',
    'Bloco de notas': 'Notepad',
    'Texto livre para projeção…': 'Free text for projection…',
    'Projetar': 'Project',
    'Congelar': 'Freeze',
    'Descongelar': 'Unfreeze',
    'Recarregar': 'Reload',
    'Configurações': 'Settings',
    'Playlist': 'Playlist',
    'Exportar playlist…': 'Export playlist…',
    'Importar playlist…': 'Import playlist…',
    'A importar playlist…': 'Importing playlist…',
    'A fila está vazia — adicione músicas antes de exportar.':
      'Queue is empty — add songs before exporting.',
    'Ajuda': 'Help',
    'Tela projetor': 'Projector screen',
    'Manual': 'Manual',
    'Informar problema': 'Report issue',
    'Sobre': 'About',
    'Ferramentas': 'Tools',
    'Contador / Timer': 'Counter / Timer',
    'Alerta': 'Alert',
    'Contador / Timer de culto': 'Service counter / timer',
    'Escolha em cada monitor se exibe contagem progressiva (contador) ou regressiva (timer). Pode ter contador no retorno de palco e timer no projetor ao mesmo tempo.':
      'Choose per monitor whether to show count-up (counter) or count-down (timer). You can have counter on stage return and timer on projector at the same time.',
    'Activar ferramenta': 'Enable tool',
    'Duração do timer (minutos)': 'Timer duration (minutes)',
    'Iniciar': 'Start',
    'Pausar': 'Pause',
    'Repor': 'Reset',
    'Monitores e dispositivos': 'Monitors and devices',
    'Marque os ecrãs que devem mostrar o overlay. Em cada linha escolha Contador (sobe desde zero) ou Timer (desce até zero).':
      'Check screens that should show the overlay. On each row choose Counter (counts up from zero) or Timer (counts down to zero).',
    'A carregar monitores…': 'Loading monitors…',
    'Nenhum monitor de projeção ou retorno configurado. Defina papéis em Configurações → Tela projetor.':
      'No projection or return monitor configured. Set roles in Settings → Projector screen.',
    'Contador': 'Counter',
    'Timer': 'Timer',
    'Dispositivo — transmissão': 'Device — live stream',
    'Dispositivo — vocal': 'Device — vocal',
    'Dispositivo — retorno': 'Device — stage return',
    'Dispositivo — player': 'Device — player',
    'Alerta no rodapé': 'Footer alert',
    'Envia um texto rolante na barra inferior dos monitores seleccionados. O texto percorre o ecrã o número de vezes e na velocidade definidos.':
      'Sends scrolling text in the bottom bar of selected monitors. Text scrolls across the screen the set number of times at the set speed.',
    'Texto do alerta': 'Alert text',
    'Ex.: Culto de oração às 20h — sala 2': 'E.g. Prayer service at 8 PM — room 2',
    'Escreva o texto do alerta antes de enviar.': 'Enter alert text before sending.',
    'Vezes que o texto passa (padrão 3)': 'Times text scrolls (default 3)',
    'Segundos por passagem (padrão 3)': 'Seconds per pass (default 3)',
    'Cor da letra': 'Text color',
    'Cor de fundo': 'Background color',
    'Monitores': 'Monitors',
    'Todos marcados = envia para todos os ecrãs de projeção, retorno e dispositivos ligados. Desmarque para restringir.':
      'All checked = send to all projection, return and connected device screens. Uncheck to restrict.',
    'Nenhum monitor configurado. Defina papéis em Configurações → Tela projetor.':
      'No monitor configured. Set roles in Settings → Projector screen.',
    'Enviar alerta': 'Send alert',
    'Parar alerta': 'Stop alert',
    'Sobre o Live Praise': 'About Live Praise',
    'O que é': 'What it is',
    'O Live Praise é um software de projeção para igrejas e cultos. Permite exibir letras de músicas, versículos bíblicos, imagens e vídeos no projetor, com controle em tempo real pelo operador e suporte a monitor remoto via rede.':
      'Live Praise is projection software for churches and services. It displays song lyrics, Bible verses, images and videos on the projector, with real-time operator control and remote monitor support over the network.',
    'Licença e permissões de uso': 'License and usage permissions',
    'Este software é distribuído sob a licença MIT. Você pode usar, copiar, modificar, mesclar, publicar, distribuir, sublicenciar e/ou vender cópias do software, desde que o aviso de copyright e a permissão acima sejam incluídos em todas as cópias ou partes relevantes.':
      'This software is distributed under the MIT license. You may use, copy, modify, merge, publish, distribute, sublicense and/or sell copies of the software, provided the copyright notice and permission above are included in all copies or relevant portions.',
    'O software é fornecido "como está", sem garantias de qualquer tipo.':
      'The software is provided "as is", without warranties of any kind.',
    'Tecnologias principais': 'Main technologies',
    'Vue 3, TypeScript e Vite (interface do operador)':
      'Vue 3, TypeScript and Vite (operator interface)',
    'Electron (aplicação desktop)': 'Electron (desktop application)',
    'Node.js, Express 5 e WebSocket (ws) no servidor':
      'Node.js, Express 5 and WebSocket (ws) on the server',
    'SQLite (persistência local)': 'SQLite (local persistence)',
    'Tailwind CSS e vue-i18n': 'Tailwind CSS and vue-i18n',
    'Créditos e agradecimentos': 'Credits and acknowledgements',
    'conversão de vídeo e geração de miniaturas': 'video conversion and thumbnail generation',
    'descarregamento de vídeos a partir de URLs': 'downloading videos from URLs',
    'pacotes de Bíblias em português no esquema OpenLP':
      'Portuguese Bible packages in the OpenLP schema',
    'As traduções bíblicas pertencem às respectivas editoras e são usadas conforme os direitos de cada obra.':
      'Bible translations belong to their respective publishers and are used according to the rights of each work.',
    'Runtime desta instalação: Node.js {node}, Chromium {chromium}, Electron {electron}.':
      'Runtime for this installation: Node.js {node}, Chromium {chromium}, Electron {electron}.',
    'Versão do aplicativo: {version}': 'Application version: {version}',
    'Categoria': 'Category',
    'Erro ao carregar categorias de imagem': 'Error loading image categories',
    'Erro ao carregar imagens': 'Error loading images',
    'Vídeo': 'Video',
    'Falha na conversão': 'Conversion failed',
    'Erro ao carregar categorias de vídeo': 'Error loading video categories',
    'Erro ao carregar vídeos': 'Error loading videos',
    'Definir como fundo inicial': 'Set as initial background',
    'Alterar fundo rápido': 'Change quick background',
    'Substituir fundo rápido': 'Replace quick background',
    'Escolha qual atalho de fundo rápido deve passar a usar este ficheiro.':
      'Choose which quick background shortcut should use this file.',
    'Propriedades': 'Properties',
    'Mudar categoria': 'Change category',
    'Aplicar na fila': 'Apply to queue',
    'Excluir da biblioteca': 'Delete from library',
    'Excluir «{name}» da biblioteca': 'Delete «{name}» from library',
    'Excluir «{name}»? Esta ação não pode ser desfeita.':
      'Delete «{name}»? This action cannot be undone.',
    'Itens na fila que usam este ficheiro deixam de projectar até serem removidos ou substituídos.':
      'Queue items using this file stop projecting until removed or replaced.',
    'Tamanho': 'Size',
    'Modificado': 'Modified',
    'Caminho': 'Path',
    'Erro ao carregar propriedades do ficheiro': 'Error loading file properties',
    'Erro ao substituir fundo rápido': 'Error replacing quick background',
    'Erro ao definir fundo inicial': 'Error setting initial background',
    'Erro ao mover ficheiro de categoria': 'Error moving file category',
    'Seleccione ou crie uma fila (aba) antes de aplicar mídia.':
      'Select or create a queue (tab) before applying media.',
    'Não foi possível excluir o ficheiro da biblioteca.':
      'Could not delete file from library.',
    'Aguarde o processamento do vídeo terminar.': 'Wait for video processing to finish.',
    'v{version}': 'v{version}',
    '{total} monitor(es) · {projection} em projeção · {return} em retorno ({stageReturn} retorno palco)':
      '{total} monitor(s) · {projection} projecting · {return} on return ({stageReturn} stage return)',
    'IP local: {ip}': 'Local IP: {ip}',
    'sem rede': 'no network',
    'Monitores e dispositivos': 'Monitors and devices',
    'Ligue telemóveis, tablets ou outros computadores pelo browser. Os monitores ligados directamente ao computador configuram-se em Monitores.':
      'Connect phones, tablets or other computers via browser. Monitors connected directly to the computer are configured in Monitors.',
    'Nenhum dispositivo externo ligado neste momento.':
      'No external device connected at the moment.',
    'Abrir painel Monitores…': 'Open Monitors panel…',
    'Versos': 'Stanzas',
    'Carregando…': 'Loading…',
    'Selecione uma música': 'Select a song',
    'Editar música': 'Edit song',
    'Excluir música': 'Delete song',
    'Repertório de louvores (JSON)': 'Song repertoire (JSON)',
    'Exporte ou importe só músicas, categorias e versos em ficheiro JSON — útil para partilhar repertório entre igrejas. Isto é independente do backup .zip do ambiente completo.':
      'Export or import only songs, categories and stanzas as a JSON file — useful for sharing repertoire between churches. This is separate from the full-environment .zip backup.',
    'Exportar categoria': 'Export category',
    'Exportar tudo': 'Export all',
    'Importar repertório': 'Import repertoire',
    'Selecione uma categoria.': 'Select a category.',
    'Importadas {songs} músicas ({verses} versos).': 'Imported {songs} songs ({verses} stanzas).',
    'Não foi possível exportar o repertório.': 'Could not export repertoire.',
    'Não foi possível importar o ficheiro.': 'Could not import file.',
    'Excluir «{name}»? Esta ação não pode ser desfeita.':
      'Delete «{name}»? This action cannot be undone.',
    'Erro ao carregar categorias': 'Error loading categories',
    'Erro ao carregar músicas': 'Error loading songs',
    'Erro ao carregar versos': 'Error loading stanzas',
    'Não foi possível excluir a música.': 'Could not delete song.',
    'Tradução': 'Translation',
    'Livros': 'Books',
    'Capítulos': 'Chapters',
    'Versículos': 'Verses',
    'Referência (ex.: mat 5 1, 1 jo 3 16) ou nome do livro':
      'Reference (e.g. mat 5 1, 1 jo 3 16) or book name',
    'Referências recentes': 'Recent references',
    'Erro ao carregar bíblias': 'Error loading Bibles',
    'Erro ao carregar livros': 'Error loading books',
    'Erro ao carregar capítulos': 'Error loading chapters',
    'Erro ao carregar versículos': 'Error loading verses',
    'Livro não encontrado: {query}': 'Book not found: {query}',
    'Fundos rápidos': 'Quick backgrounds',
    'Inicial': 'Initial',
    'Erro ao carregar fundos rápidos': 'Error loading quick backgrounds',
    'Defina o papel de cada monitor: o operador usa o monitor principal; a projeção pública e o retorno de palco mostram conteúdos diferentes.':
      'Set each monitor role: the operator uses the primary monitor; public projection and stage return show different content.',
    'principal': 'primary',
    'Nenhum monitor detectado. Execute o Live Praise neste computador para listar os ecrãs ligados.':
      'No monitor detected. Run Live Praise on this computer to list connected screens.',
    'Guardar papéis': 'Save roles',
    'Configuração guardada. Reinicie o Live Praise para aplicar novos papéis nos monitores.':
      'Configuration saved. Restart Live Praise to apply new monitor roles.',
    'Desligado': 'Off',
    'Tamanho da tela de projeção': 'Projection screen size',
    'Escolha a proporção ou as dimensões em pixels da área de projeção no ecrã.':
      'Choose the aspect ratio or pixel dimensions of the projection area on screen.',
    'Cada monitor em «Projeção» pode ter tamanho diferente — use a engrenagem na linha do monitor. Computadores remotos em /projector aparecem na secção «Projetores remotos».':
      'Each «Projection» monitor can have a different size — use the gear on the monitor row. Remote computers at /projector appear in «Remote projectors».',
    'Configurar tamanho da projeção': 'Configure projection size',
    'Projeção — {label}': 'Projection — {label}',
    'Tamanho aplicado em {label}.': 'Size applied on {label}.',
    'Tamanho da tela': 'Screen size',
    'Largura (px)': 'Width (px)',
    'Altura (px)': 'Height (px)',
    'ex.: 1920': 'e.g. 1920',
    'ex.: 1080': 'e.g. 1080',
    'Posição na tela': 'Position on screen',
    'Centro (padrão)': 'Center (default)',
    'Topo': 'Top',
    'Personalizado (deslocamento)': 'Custom (offset)',
    'Deslocamento horizontal (px)': 'Horizontal offset (px)',
    'Deslocamento vertical (px)': 'Vertical offset (px)',
    'Conteúdo menor que a área': 'Content smaller than area',
    'Define o que fazer quando imagem ou vídeo têm resolução inferior à área de projeção.':
      'Defines what to do when image or video resolution is lower than the projection area.',
    'Estender (preencher a área)': 'Stretch (fill area)',
    'Centralizar (tamanho original)': 'Center (original size)',
    'Proporcional (ajustar sem distorcer)': 'Proportional (fit without distortion)',
    'Pré-visualizar no projetor enquanto altera (antes de aplicar)':
      'Preview on projector while changing (before applying)',
    'Aplicar tamanho': 'Apply size',
    'A aplicar…': 'Applying…',
    'Tamanho da tela guardado e enviado ao projetor.':
      'Screen size saved and sent to projector.',
    'WideScreen (16:9)': 'Widescreen (16:9)',
    'Clássico (4:3)': 'Classic (4:3)',
    'Panorâmica (7:3)': 'Panoramic (7:3)',
    'Cinema Europa (5:3)': 'European cinema (5:3)',
    'Cinema EUA (13:7)': 'US cinema (13:7)',
    'Personalizado': 'Custom',
    'Padrão (ecrã completo)': 'Default (full screen)',
    'Erro ao guardar tamanho da tela': 'Error saving screen size',
    'Não foi possível enviar ao projetor — verifique a ligação ao vivo.':
      'Could not send to projector — check live connection.',
    'Erro ao carregar monitores': 'Error loading monitors',
    'Erro ao guardar': 'Error saving',
    'Projetores remotos (/projector)': 'Remote projectors (/projector)',
    'Cada browser aberto em /projector num computador remoto aparece aqui com configuração de tela independente. Endpoints diferentes (/stage, /vocal, …) têm identificadores separados.':
      'Each browser open at /projector on a remote computer appears here with independent screen settings. Different endpoints (/stage, /vocal, …) have separate identifiers.',
    'Nenhum projetor remoto ligado. Abra http://servidor:porta/projector no computador remoto.':
      'No remote projector connected. Open http://server:port/projector on the remote computer.',
    'Projetor {id}': 'Projector {id}',
    'Dispositivos externos (browser)': 'External devices (browser)',
    'Dispositivos ligados pela rede (transmissão, vocal, retorno de palco ou músicos) aparecem aqui e na barra de estado.':
      'Network-connected devices (live, vocal, stage return or musicians) appear here and in the status bar.',
    'Nenhum dispositivo externo ligado.': 'No external device connected.',
    'Ligado': 'Connected',
    'Perfil': 'Profile',
    'Etiqueta': 'Label',
    'Mostrar cifras': 'Show chords',
    'Guardar dispositivo': 'Save device',
    'Preferências do dispositivo guardadas.': 'Device preferences saved.',
    'Transmissão (/live)': 'Live stream (/live)',
    'Vocal (/vocal)': 'Vocal (/vocal)',
    'Retorno de palco (/stage)': 'Stage return (/stage)',
    'Músicos (/player)': 'Musicians (/player)',
    'Projetor (/projector)': 'Projector (/projector)',
    'Erro ao carregar dispositivos': 'Error loading devices',
    'Erro ao guardar dispositivo': 'Error saving device',
    'Pesquisar': 'Search',
    'Pesquisar…': 'Search…',
    'Confirmar': 'Confirm',
    'Português (Brasil)': 'Portuguese (Brazil)',
    'English': 'English',
  };
  return map[value] ?? value;
}

/** @param {unknown} node */
function walk(node) {
  if (Array.isArray(node)) {
    return node.map((item) =>
      typeof item === 'string' ? translateValue(item) : walk(item),
    );
  }
  if (node && typeof node === 'object') {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] = walk(value);
    }
    return out;
  }
  return translateValue(node);
}

const pt = JSON.parse(fs.readFileSync(PT, 'utf8'));
const en = walk(pt);
en.locales = {
  meta: {
    'pt-BR': 'Portuguese (Brazil)',
    'en-US': 'English',
    'pt-PT': 'Portuguese (Portugal)',
    'es-ES': 'Spanish',
  },
};

fs.writeFileSync(EN, `${JSON.stringify(en, null, 2)}\n`);
fs.writeFileSync(INSTALL, `${JSON.stringify(en, null, 2)}\n`);
console.log('build-en-us-locale: OK');
