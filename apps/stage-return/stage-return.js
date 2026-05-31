/** Client retorno de palco — HTML+CSS+JS (CA-R10, CA-R20). */
function wsUrl() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/ws/live`;
}
function byId(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Elemento #${id} não encontrado`);
    return el;
}
function applyAction(action) {
    const content = byId('conteudo');
    switch (action.acao) {
        case 'viewMusicaRetorno':
        case 'viewBibliaRetorno':
            content.innerHTML = action.valor;
            break;
        case 'removeConteudo':
            content.innerHTML = '';
            break;
        case 'atualizar':
            location.reload();
            break;
        default:
            return;
    }
    const badge = byId('last-action');
    badge.textContent = `${action.acao} @ ${new Date().toLocaleTimeString()}`;
}
function connect() {
    const socket = new WebSocket(wsUrl());
    socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'join', role: 'stage-return', name: 'Retorno' }));
    });
    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'live-action') {
            applyAction(message.action);
        }
        if (message.type === 'joined') {
            const last = message.state.lastAction;
            if (last)
                applyAction(last);
        }
    });
    socket.addEventListener('close', () => {
        setTimeout(connect, 1500);
    });
    return socket;
}
connect();
export {};
