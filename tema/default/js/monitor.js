let urlSocket = document.documentURI.split('//');
if (urlSocket[0] == 'file:') {
    urlSocket = 'http://localhost:3000';
    user = 'Monitor';
} else {
    endereco = urlSocket[1].split('/');
    urlSocket = urlSocket[0] + '//' + endereco[0];
    user = 'Monitor_Remoto';
}
//Teclado
const KEY_DOWN = 40;
const KEY_UP = 38;
const KEY_LEFT = 37;
const KEY_RIGHT = 39;

const KEY_END = 35;
const KEY_BEGIN = 36;

const KEY_BACK_TAB = 8;
const KEY_TAB = 9;
const KEY_SH_TAB = 16;
const KEY_ENTER = 13;
const KEY_ESC = 27;
const KEY_SPACE = 32;
const KEY_DEL = 46;

const KEY_ALT = 18;
const KEY_CTRL = 17;
const KEY_SHIFT = 16;

const KEY_A = 65;
const KEY_B = 66;
const KEY_C = 67;
const KEY_D = 68;
const KEY_E = 69;
const KEY_F = 70;
const KEY_G = 71;
const KEY_H = 72;
const KEY_I = 73;
const KEY_J = 74;
const KEY_K = 75;
const KEY_L = 76;
const KEY_M = 77;
const KEY_N = 78;
const KEY_O = 79;
const KEY_P = 80;
const KEY_Q = 81;
const KEY_R = 82;
const KEY_S = 83;
const KEY_T = 84;
const KEY_U = 85;
const KEY_V = 86;
const KEY_W = 87;
const KEY_X = 88;
const KEY_Y = 89;
const KEY_Z = 90;

const KEY_PF1 = 112;
const KEY_PF2 = 113;
const KEY_PF3 = 114;
const KEY_PF4 = 115;
const KEY_PF5 = 116;
const KEY_PF6 = 117;
const KEY_PF7 = 118;
const KEY_PF8 = 119;
//Analisa se está sendo digitado algo
var typingTimer; //timer identifier
var doneTypingInterval = 500; //time in ms
let stop_color = false;
//Muda cores da animacao
function color_animate(tempo) {
    if (stop_color == false) {
        let r = Math.floor(Math.random() * 256);
        let g = Math.floor(Math.random() * 256);
        let b = Math.floor(Math.random() * 256);
        let r2 = Math.floor(Math.random() * 256);
        let g2 = Math.floor(Math.random() * 256);
        let b2 = Math.floor(Math.random() * 256);
        let r3 = Math.floor(Math.random() * 256);
        let g3 = Math.floor(Math.random() * 256);
        let b3 = Math.floor(Math.random() * 256);
        $('.tree').css('fill', 'url(#gradient)');
        $('#inicio_gradiente').attr('stop-color', 'rgb(' + r + ',' + g + ',' + b + ')');
        $('#meio_gradiente').attr('stop-color', 'rgb(' + r2 + ',' + g2 + ',' + b2 + ')');
        $('#fim_gradiente').attr('stop-color', 'rgb(' + r3 + ',' + g3 + ',' + b3 + ')');
        setTimeout(() => color_animate(tempo), tempo);
    }
}
//Paro a cor
function parar_cor() {
    stop_color = true;
    return true;
}
//Fecho o loading
function fechar_loandig() {
    $('#loading').css('display', 'none');
}
//Converte em ISO-8859-1
function iso_encode(str) {
    str = str.replace(/\'/g, '&apos;');
    str = str.replace(/\"/g, '&quot;');
    return str;
}
//Remove Quebra de Linha Substituindo por <br />
function nl2br(str) {
    if (typeof str === 'undefined' || str === null) {
        return ''
    }
    var breakTag = `<br />`;
    return (str + '').replace(/(\r\n|\n\r|\r|\n)/g, breakTag)
}
//Congela a tela, permitindo alterações apenas na do operador
function congelar(acao) {
    s = $('#freeze').val();
    if (acao == 'freeze') {
        if (s == 'congelar') {
            $('#button_freeze').html('<i class="fas fa-snowflake"></i> Descongelar');
            $('#freeze').val('descongelar');
        } else {
            $('#button_freeze').html('<i class="fas fa-snowflake"></i> Congelar');
            $('#freeze').val('congelar');
        }
    } else {
        if (s == 'congelar') {
            return true;
        } else {
            return false;
        }
    }
}
//Remove o Conteudo da Tela
function removeConteudo() {
    $('.titulo').html('');
    $('.content').html('');
    $('.rodape').html('');
    $('.alert').html('');
    if (congelar('valida') == true) {
        let text = {
            acao: 'removeConteudo',
            valor: 'remove'
        }
        socket.emit("send", JSON.stringify(text));
    }
}
//Inicia o sistema
setTimeout(() => loanding(), 200);
async function loanding() {
    $('#current_loading').html('Iniciando Animaçao');
    color_animate(2000);
    $('#current_loading').html('Carregando Músicas');
    let mus = await catMusicas();
    $('#current_loading').html('Carregando Biblias');
    let bib = await catBiblias();
    $('#current_loading').html('Carregando Background Rápido');
    let bg = await lista_background_rapido();
    $('#current_loading').html('Carregando Imagens');
    let img = await catImagens();
    $('#current_loading').html('Carregando Vídeos');
    let vid = await catVideos();
    if (
        mus == true &&
        bib == true &&
        bg == true &&
        img == true &&
        vid == true
    ) {
        parar_cor();
        fechar_loandig()
    }
}
//Lista as Categorias de Musicas
async function catMusicas() {
    $('#cat_musica').html('');
    $.ajax({
        type: "GET",
        url: urlSocket + '/musica/categoria',
        dataType: "json",
        success: function (data) {
            if (data.status == 'Sucesso') {
                t_rows = data.items.length;
                data.items.forEach(result => {
                    $('#cat_musica').append(`<option value="${result.id}">${result.nome}</option>`);
                });
                lista_musica();
            }
        }
    });
    return true;
}
//Lista as Musicas
function lista_musica() {
    cat = $('#cat_musica').val();
    if (cat != '' && cat != null) {
        $('#list_music').html('');
        let modelo = `
       <div class="card" id="music[id_musica]">
      <div class="card-header" id="head[id_musica]">
        <a class="card-link" data-toggle="collapse" href="#musica[id_musica]">
            [nome_musica] ([artista_musica])
        </a>
        <span class="acoes_item">
          <a href="javascript:void(0);" data-toggle="modal" data-target="#new_music" data-whatever="[id_musica]"><i class="fas fa-edit"></i></a>
          <a href="javascript:void(0);" onclick="adicionar_musica('[id_musica]')"><i class="fas fa-check-circle"></i></a>
          <a href="javascript:void(0);" onclick="remover_musica('[id_musica]')"><i class="fas fa-trash"></i></a>
        </span>
      </div>
      <div id="musica[id_musica]" class="collapse" data-parent="#list_music">
        <div class="card-body">
            <ul id="verso[id_musica]"></ul>
        </div>
      </div>
    </div>
    `;
        $.ajax({
            type: "GET",
            url: urlSocket + '/musica/categoria/' + cat,
            dataType: "json",
            success: function (data) {
                if (data.status == 'Sucesso') {
                    t_rows = data.items.length;
                    data.items.forEach(musica => {
                        item = modelo.replace(/\[id_musica\]/g, musica.id);
                        item = item.replace(/\[nome_musica\]/g, musica.nome);
                        item = item.replace(/\[artista_musica\]/g, musica.artista);
                        $('#list_music').append(item);
                        lista_musica_verso(musica.id, musica.nome, musica.artista);
                    });
                }
            }
        });
        return true;
    } else {
        setTimeout(() => lista_musica(), 200);
    }
}
function lista_musica_verso(id, nome, artista) {
    $.ajax({
        type: "GET",
        url: urlSocket + '/musica/verso/' + id,
        dataType: "json",
        success: function (data) {
            if (data.status == 'Sucesso') {
                t_rows = data.items.length;
                data.items.forEach(row => {
                    verse = row.verso;
                    verse = verse.replace(/<br \/>/g, "\n");
                    modelo_item = `<li class="verso_musica" onclick='viewMusica("verso_${row.musica}_${row.id}","${nome} (${artista})","BR");' id="verso_${row.musica}_${row.id}">${verse}</li>`;
                    $('#verso' + row.musica).append(modelo_item);
                })
            }
        }
    });
    return true;
}
//Exibir Musica
function viewMusica(id, nome, br) {
    $('.conteudo').html('');
    txt = $('#' + id).html();
    txt = iso_encode(txt);
    if (br == 'BR') {
        txt = nl2br(txt);
    }
    let modelo = `
    <div class="titulo"></div>
    <div class="content"><span>${txt}</span></div>
    <div class="rodape">${nome}</div>`;
    $('.conteudo').append(modelo);
    $('.content').textfill({
        maxFontPixels: 0
    });
    $('.content').css('text-align', 'center');
    $('.rodape').css('font-size', '20px');
    if (congelar('valida') == true) {
        let text={
            acao:'viewMusica',
            valor:btoa(modelo)
        }
        socket.emit("send", JSON.stringify(text));
    }
}
//Lista as Biblias Disponiveis
async function catBiblias() {
    $('#cat_biblia').html('');
    $.ajax({
        type: "GET",
        url: urlSocket + '/biblias',
        dataType: "json",
        success: function (data) {
            if (data.status == 'successo') {
                let b = 0;
                data.biblias.forEach(biblias => {
                    $('#cat_biblia').append(`<option value="${biblias.arquivo}">${biblias.nome}</option>`);
                    if (b == 0) {
                        lista_biblia();
                    }
                    b++;
                });
            }
        }
    });
    return true;
}
//Lista a Biblia Selecionada
function lista_biblia() {
    cat = $('#cat_biblia').val();
    let modelo = `<button class="collaps_livro" id="ancora_biblia_[id_livro]">[nome_livro]</button>
    <div class="content_biblia" id="biblia_[id_livro]">
    </div>`;
    $('#list_biblia').html('');
    $.ajax({
        type: "GET",
        url: urlSocket + '/biblias/livros/' + cat,
        dataType: "json",
        success: function (data) {
            if (data.status == 'Sucesso') {
                let tot = 0;
                data.items.forEach(result => {
                    item = modelo.replace(/\[id_livro\]/g, result.id);
                    item = item.replace(/\[nome_livro\]/g, result.nome);
                    $('#list_biblia').append(item);
                    lista_capitulos(result.id);
                    if (tot == 65) {
                        dropLivros()
                    }
                    tot++;
                });
            }
        }
    });
    return true;
}
//Menu Drop Livros
function dropLivros() {
    var coll = document.getElementsByClassName("collaps_livro");
    var l;

    for (l = 0; l < coll.length; l++) {
        coll[l].addEventListener("click", function () {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = 'fit-content';
            }
        });
    }
}
//Lista os capitulos do livro
function lista_capitulos(id) {
    cat = $('#cat_biblia').val();
    let modelo = `<button class="collaps_capitulo" id="biblia_[id_livro]_[id_capitulo]" onclick="lista_versiculo('${cat}',[id_livro],[id_capitulo])"><i class="fas fa-bible"></i> [id_capitulo]</button>
    <div class="content_biblia" id="collapse_[id_livro]_[id_capitulo]">
        <ul id="versiculo"></ul>
    </div>`;
    $.ajax({
        type: "GET",
        url: urlSocket + '/biblias/capitulo/' + cat + '/' + id,
        dataType: "json",
        success: function (data) {
            if (data.status == 'Sucesso') {
                let t_rows = data.items[0].capitulos
                for (let i = 0; i < t_rows; i++) {
                    capitulos = i + 1;
                    item = modelo.replace(/\[id_livro\]/g, id);
                    items = item.replace(/\[id_capitulo\]/g, capitulos);
                    $('#biblia_' + id).append(items);
                    if (i == (t_rows - 1) && id == 66) {
                        dropCapitulos()
                    }
                }
            }
        }
    });
    return true;
}
function dropCapitulos() {
    //Menu Drop Capitulos
    var coll_cap = document.getElementsByClassName("collaps_capitulo");
    var c;

    for (c = 0; c < coll_cap.length; c++) {
        coll_cap[c].addEventListener("click", function () {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = 'fit-content';
            }
        });
    }
}
//Funçao de Listar os Versiculos por demanda
function lista_versiculo(cat, livro, capitulo) {
    cat_selecionado = $('#cat_biblia').val();
    if (cat != cat_selecionado) {
        cat = cat_selecionado;
    }
    modelo_versiculo = `<a name="versiculo_[id_livro]_[id_capitulo]_[id_versiculo]"></a><li onclick="viewBiblia('versiculo_[id_livro]_[id_capitulo]_[id_versiculo]','[nome_livro]','BR');" id="versiculo_[id_livro]_[id_capitulo]_[id_versiculo]" class="versiculo">[texto]</li>`;
    modelo_versiculo = modelo_versiculo.replace(/\[id_livro\]/g, livro);
    modelo_versiculo = modelo_versiculo.replace(/\[id_capitulo\]/g, capitulo);
    sessionStorage.setItem('capitulo', 'carregando');
    $.ajax({
        type: "GET",
        url: urlSocket + '/biblias/versiculo/' + cat + '/' + livro + '/' + capitulo,
        dataType: "json",
        success: function (data) {
            if (data.status == 'Sucesso') {
                $('#collapse_' + livro + '_' + capitulo + ' #versiculo').html('');
                data.items.forEach(result => {
                    versiculo = modelo_versiculo.replace(/\[id_versiculo\]/g, result.versiculo);
                    versiculo = versiculo.replace(/\[texto\]/g, (result.texto));
                    versiculo = versiculo.replace(/\[nome_livro\]/g, data.livro);
                    $('#collapse_' + livro + '_' + capitulo + ' #versiculo').append(versiculo);
                    if (i == (t_rows - 1)) {
                        sessionStorage.setItem('capitulo', 'ok');
                    }
                });
            }
        }
    });
}
//Exibir Biblia
function viewBiblia(id, nome, br) {
    cat = $('#cat_biblia').val();
    $('.conteudo').html('');
    let itens = id.split('_');
    let capitulo = itens[2];
    let versiculo = itens[3];
    let txt = $('#' + id).html();
    if (br == 'BR') {
        txt = nl2br(txt);
    }
    let modelo = `
    <div class="titulo">${nome} ${capitulo}:${versiculo}</div>
    <div class="content"><span>${txt}</span></div>
    <div class="rodape"></div>`;
    $('.conteudo').append(modelo);
    $('.content').textfill({ maxFontPixels: CalculaLinhas(5, '.content') });
    $('.content').css('text-align', 'left');
    $('.titulo').css('font-size', '20px');
    $.each($('.versiculo'), function () {
        $(this).removeClass('ativo');
    });
    $('#' + id).addClass('ativo');
    if (congelar('valida') == true) {
        let text={
            acao:'viewBiblia',
            valor:btoa(modelo)
        }
        socket.emit("send", JSON.stringify(text));
    }
}
//Calcula quantidade de linhas para biblia
function CalculaLinhas(quant, div) {
    let largura = $(div).innerWidth();
    let altura = $(div).innerHeight();
    carcteres_linha = 50;
    font = ((altura / quant) - (largura / carcteres_linha)) - quant;
    return font;
}
//Listagem Background Rápido
async function lista_background_rapido() {
    let modelo = `<div class="col-xs-1 col-sm-1 col-md-1 col-lg-1 background-rapido">
        <a href="javascript:void(0)" onclick="backgroundRapido('[url64]')">
            <img src="[url]" class="img-responsive" alt="Responsive image">
        </a>
      </div>`;
    $('#background-rapido').html('');
    $.ajax({
        type: "GET",
        url: urlSocket + '/background-rapido',
        dataType: "json",
        success: function (data) {
            if (data.status == 'Sucesso') {
                t_rows = data.items.length;
                result = data.items;
                for (let i = 0; i < t_rows; i++) {
                    inicial = result[i].inicial;
                    if (result[i].url.indexOf("base64") > 0) {
                        url_img = result[i].url;
                    } else {
                        url_img = urlSocket + '/' + result[i].url;
                    }
                    if (inicial == 'S') {
                        $('#preview img').attr('src', url_img);
                    }
                    item_back = modelo.replace(/\[url\]/g, url_img);
                    item_back = item_back.replace(/\[url64\]/g, btoa(url_img));
                    item_rapido = decodeURI(item_back);
                    $('#background-rapido').append(item_rapido);
                }
            }
        }
    });
    return true;
}
// Troca o Fundo Removendo o Texto
function backgroundRapido(url) {
    $('#video').css('display', 'none');
    $('#preview img').css('display', 'block');
    $("#preview img").fadeOut(150, function () {
        $("#preview img").attr('src', atob(url));
    }).fadeIn(200);
    if (congelar('valida') == true) {
        let text={
            acao: 'background',
            valor: url
        }
        socket.emit("send", JSON.stringify(text));
    }
    setTimeout(() => removeConteudo(), 200);
    if ($('#player').length) {
        let player = document.getElementById("player");
        player.pause();
    }
}
//Lista a Categoria das Imagens
async function catImagens() {
    $('#cat_imagens').html('');
    $.ajax({
        type: "GET",
        url: urlSocket + '/imagem/categoria',
        dataType: "json",
        success: function (data) {
            if (data.status == 'successo') {
                let img = 0;
                data.imagens.forEach(result => {
                    option = result.replace('Dados/imagens/', '');
                    $('#cat_imagens').append(`<option value="${option}">${option}</option>`);
                    if (img == 0) {
                        lista_imagem(option);
                    }
                    img++;
                });
            }
        }
    });
    return true;
}
//Lista Imagens
function lista_imagem(dir) {
    $('#preview-imagens').html('');
    $.ajax({
        type: "GET",
        url: urlSocket + '/imagem/categoria/' + dir,
        dataType: "json",
        success: function (data) {
            if (data.status == 'successo') {
                t_rows = data.imagens.length;
                result = data.imagens;
                for (i = 0; i < t_rows; i++) {
                    img = result[i];
                    imag = encodeURI(img);
                    url_img = urlSocket + '/' + imag
                    $('#preview-imagens').append('<li><img src="' + url_img + '" onclick="background(\'' + btoa(url_img) + '\')"></li>')
                }
            }
        }
    });
    return true;
}
//Troca o Fundo da Tela
function background(url) {
    $('#video').css('display', 'none');
    $('#preview img').css('display', 'block');
    $("#preview img").fadeOut(150, function () {
        $("#preview img").attr('src', atob(url));
    }).fadeIn(200);
    if (congelar('valida') == true) {
        let text={
            acao: 'background',
            valor: url
        }
        socket.emit("send", JSON.stringify(text));
    }
    if ($('#player').length) {
        let player = document.getElementById("player");
        player.pause();
    }
}
//Lista as Categorias de Videos
async function catVideos() {
    $('#cat_videos').html('');
    $.ajax({
        type: "GET",
        url: urlSocket + '/video/categoria',
        dataType: "json",
        success: function (data) {
            if (data.status == 'successo') {
                let v = 0;
                data.videos.forEach(result => {
                    option = result.replace('Dados/videos/', '');
                    $('#cat_videos').append('<option value="' + option + '">' + option + '</option>');
                    if (v == 0) {
                        lista_video(option);
                    }
                    v++;
                });
            }
        }
    });
    return true;
}
//Thumbs dos videos
function lista_video(dir) {
    $('#preview-videos').html('');
    $.ajax({
        type: "GET",
        url: urlSocket + '/video/categoria/' + dir,
        dataType: "json",
        success: function (data) {
            if (data.status == 'successo') {
                let vid = 0;
                data.videos.forEach(result => {
                    video = urlSocket + '/' + result.video;
                    thumb = urlSocket + '/' + result.thumb;
                    $('#preview-videos').append('<li><img id="video' + vid + '" src="' + thumb + '" onclick="viewVideo(\'' + btoa(video) + '\')"></li>');
                });
            }
        }
    });
    return true;
}
//Visualiza o Video
function viewVideo(url) {
    $('#preview img').css('display', 'none');
    $('#video').css('display', 'block');
    if (congelar('valida') == true) {        
        let text={
            acao: 'video',
            valor: url
        }
        socket.emit("send", JSON.stringify(text));
    }
    $('#video').html('');
    $('#video').append('<video id="player" controls loop="true" autoplay><source src="' + atob(url) + '" type="video/mp4"></video>');
    let player = document.getElementById("player");
    setTimeout(() => play_video(), 200);
}
function play_video() {
    player.play();
    player.volume = 0;
}
//Ajustar tela
function ajustarTela(hide){
    tm=$('#conf_tela #tamanho_tela').val();
    lg=$('#conf_tela #largura').val();
    if(lg==''){
        lg=0;
    }
    at=$('#conf_tela #altura').val();
    if(at==''){
        at=0;
    }
        $.ajax({
        type: "GET",
        url: urlSocket+'/display/'+tm+'/'+lg+'/'+at,
        dataType: "json",
        success: function(data) {
        }
    });
    let text={};
    if(tm=='personalizado'){
        vl=btoa(lg+'x'+at)
        text={
            acao: 'ajustarTela',
            valor: vl
        }
    }else{
        text={
            acao: 'ajustarTela',
            valor: btoa(tm)
        }
    }
    socket.emit("send", JSON.stringify(text));
    if(hide){
        $('#conf_tela').modal('hide');
    }
}
//Faço a busca da musica quando para de digitar
$('#busca_musica').keyup(function() {
    clearTimeout(typingTimer);
    if ($('#busca_musica').val) {
        typingTimer = setTimeout(buscaMusica, doneTypingInterval);
    }
});
//Busca Musica
function buscaMusica(submit){
    if(!submit){
      buscaMusicaLocal();
    }else{
      buscaMusicaOnline();
    }
}
//Busca Musica local
function buscaMusicaLocal(){
    cat=$('#cat_musica').val();
    busca=$("#busca_musica").val();
    if(busca.length<3){
      lista_musica();
    }else	if(cat!=''){
        buscarMusica(busca);
        /*
        $('#list_music').html('');
        let modelo=`
       <div class="card" id="music[id_musica]">
        <div class="card-header" id="head[id_musica]">
            <a class="card-link" data-toggle="collapse" href="#musica[id_musica]">
                [nome_musica] ([artista_musica])
            </a>
            <span class="acoes_item">
            <a href="javascript:void(0);" data-toggle="modal" data-target="#new_music" data-whatever="[id_musica]"><i class="fas fa-edit"></i></a>
            <a href="javascript:void(0);" onclick="adicionar_musica('[id_musica]')"><i class="fas fa-check-circle"></i></a>
            <a href="javascript:void(0);" onclick="remover_musica('[id_musica]')"><i class="fas fa-trash"></i></a>
            </span>
        </div>
        <div id="musica[id_musica]" class="collapse" data-parent="#list_music">
            <div class="card-body">
                <ul id="verso[id_musica]"></ul>
            </div>
        </div>
        </div>
        `;
        $.ajax({
            type: "GET",
            url: urlSocket+'/busca/musica/'+busca,
            dataType: "json",
            success: function(data) {
                if(data.status=='successo'){
                    t_rows=data.data.length;
                    result=data.data;
                    for(i=0;i<t_rows;i++){
                        musica=result[i];
                        item=modelo.replace(/\[id_musica\]/g,musica.id);
                        item=item.replace(/\[nome_musica\]/g,musica.nome);
                        item=item.replace(/\[artista_musica\]/g,musica.artista);
                        $('#list_music').append(item);
                        lista_musica_verso(musica.id,musica.nome,musica.artista);
                    }
                }
            }
        });
        */
    }
}
function buscarMusica(texto) {
    // Remove acentos e transforma tudo em minúsculas
    texto = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    titulos=document.querySelectorAll("#list_music .card-link");
    listaVerso=document.querySelectorAll("#list_music .card-body li");
    for (let i = 0; i < titulos.length; i++) {
        let titulo = titulos[i];
        // Remove acentos e transforma tudo em minúsculas para comparação
        let tituloTexto = titulo.textContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
        let tituloId= titulo.hash.replace(/\D/g,'');
        if (tituloTexto.includes(texto)) {
            document.querySelector(`#music${tituloId}`).style='';
        }else{
            document.querySelector(`#music${tituloId}`).style='display:none';
        }
    }
    for (let v = 0; v < listaVerso.length; v++) {
        let listVerso=listaVerso[v];
        let tituloVerso=listVerso.getAttribute('onclick').split(',')[1].replaceAll('"','').trim();
        let versoTexto=listVerso.textContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
        let musicaId=listVerso.getAttribute('onclick').split('verso_')[1].split('_')[0];
        if (versoTexto.includes(texto)) {
            document.querySelector(`#music${musicaId}`).style='';
            console.log('Musica: ',tituloVerso)
        }
    }

}
    /*
    // Obtém todos os elementos <li> com a classe "versiculo"
    let versiculos = document.querySelectorAll(".collaps_livro");
    let encontrado=0;
    let idLocalizado=0;
    // Percorre os versículos e verifica se o texto buscado está presente
    for (var i = 0; i < versiculos.length; i++) {
      let versiculo = versiculos[i];
      
      // Remove acentos e transforma tudo em minúsculas para comparação
      let versiculoTexto = versiculo.textContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      
      // Verifica se o texto buscado está presente no versículo
        if (versiculoTexto.includes(texto)) {
            if(encontrado==0){
                idLocalizado=versiculo.nextSibling.nextSibling.id;
                if(!versiculo.classList.value.includes('active')){
                    encontrado++;
                    versiculo.click();
                }
            }else if(versiculo.classList?.value.includes('active')){
                versiculo.classList?.remove('active');
            }
        }else{
            if(versiculo.classList?.value.includes('active')){
                versiculo.classList?.remove('active');
            }
        }
    }
    return idLocalizado;
    */
/*

//Faço a busca na biblia quando para de digitar
$('#busca_biblia').keyup(function() {
    clearTimeout(typingTimer);
    if ($('#busca_biblia').val) {
        typingTimer = setTimeout(buscaBiblia, doneTypingInterval);
    }
});
//Remove o ativo dos versiculos
function LimpaBiblia(){
    $.each($('.versiculo'), function () {
      $(this).removeClass('ativo');
    })
}
//Atualizar e Regarregar Janelas
function atualizar(vl){
    let txt='ok';
    if(vl!=txt){
      let text = '{"funcao":[' +'{"nome":"atualizar","valor":"'+btoa(txt)+'" }]}';
      socket.emit("send", text);
    }
    local=location.href.replace(location.hash,'');
    setTimeout(() => location.href=local,100);
}


//Adiciona a Música na Programação
function adicionar_musica(id){
    verse=$('#verso'+id).html();
    verse=verse.replace(/verso_/g,"item_verso_");
    verse=verse.replace(/'BR'/g,"");
    verse=nl2br(verse);
    data='<ul id="item_verso'+id+'">'+verse+'</ul>';
    titulo=$('#head'+id+' a').html();
    chromeTabs.addTab({
      title: titulo,
      conteudo: data
    });
    setTimeout(() => slideAtivo(),700);
}


//Busca Musica Online
function buscaMusicaOnline(){
    busca=$("#busca_musica").val();
    if(busca.length<3){
      lista_musica();
    }else{
      $('#list_music').html('');
      let modelo_web=`
       <div class="card" id="music[id_musica]">
        <div class="card-header" id="head[id_musica]">
            <a class="card-link" data-toggle="collapse" href="#musica[id_musica]">
                [nome_musica] ([artista_musica])
            </a>
            <span class="acoes_item">
                <a href="javascript:void(0);" onclick='adicionar_musica_salvar("[id_musica]","[nome_musica]","[artista_musica]","[compositor_musica]")'><i class="fas fa-check-circle"></i></a>
            </span>
        </div>
        <div id="musica[id_musica]" class="collapse" data-parent="#list_music">
            <div class="card-body">
                <ul id="verso[id_musica]"></ul>
            </div>
        </div>
        </div>
        `;
      $('#list_music').append('<div class="alert alert-info" role="alert" id="alerta_pesquisa_musica">Procurando Música na Internet</div>');
      $.ajax({
        type: "GET",
        url: "https://livepraise.teraidc.com.br/busca/musicas/"+encodeURI(busca),
        dataType: "json",
        error: function(erro){
          $('#alerta_pesquisa_musica').remove();
          $('#list_music').append('<div class="alert alert-danger" role="alert" id="alerta_erro_musica">Houve um erro ao Buscar a música na internet. Verifique sua conexão e tente novamente!</div>');
          $('#alerta_erro_musica').fadeOut(10000,function(){
            $(this).remove();
          });
        },
        success: function(data) {
          $('#alerta_pesquisa_musica').remove();
          $('#list_music').append('<div class="alert alert-success" role="alert" id="alerta_sucesso_musica">Localizado Músicas na Internet</div>');
          $('#alerta_sucesso_musica').fadeOut(2000,function(){
            $(this).remove();
          });
            t_resultado=data.resultado.length;
          for(i=0;i<t_resultado;i++){    
            result=data.resultado[i];
            item=modelo_web.replace(/\[id_musica\]/g,'api'+result.id);
            item=item.replace(/\[nome_musica\]/g,result.nome);
            item=item.replace(/\[artista_musica\]/g,result.artista.trim());
            item=item.replace(/\[compositor_musica\]/g,result.compositor.trim());
            $('#list_music').append(item);
            t_verso=result.versos.length;
            for(v=0;v<t_verso;v++){
              verse=result.versos[v];
              verse=verse.replace(/<br \/>/g,"\n");
              let modelo_item=`<li class="verso_musica" onclick='viewMusica("verso_api${result.id}_${v}","${result.nome} (${result.artista})","BR");' id="verso_api${result.id}_${v}">${verse}</li>`;
                $('#verso'+'api'+result.id).append(modelo_item);
            }
          }
        }
      });
    }
}
function salvar_musica(id){
    cat=1;
    nome=$('#new_music #nome').val();
    nome=iso_encode(nome);
    if(nome==''){
        alert('O nome da Música é Obrigatória!');
    }
    artista=$('#new_music #artista').val();
    artista=iso_encode(artista);
    if(artista==''){
        alert('O nome do Artista é Obrigatória!');
    }
    compositor=$('#new_music #compositor').val();
    compositor=iso_encode(compositor);
    letra=$('#new_music #letra').val();
    letra=iso_encode(letra);
    if(letra==''){
        alert('A letra da Música é Obrigatória!');
    }
    if(nome!='' && artista!='' && letra!=''){
        letra=nl2br(letra);
        versos=letra.split("<br /><br />");
        t_versos=versos.length;
        if(id==0){
            dados={
                cat:cat,
                nome:nome,
                artista:artista,
                compositor:compositor
            }
            $.ajax({
                type: "POST",
                url: urlSocket+'/add/musica/',
                data: dados,
                dataType: "json",
                success: function(data) {
                    if(data.status=='successo'){
                        id_musica=data.id;
                        for(i=0;i<t_versos;i++){
                            if(versos[i]!=''){
                                v=versos[i]
                                v=iso_encode(v);
                                adicionar_verso(id_musica,v);
                                $('#new_music').modal('hide')
                            }
                        } 
                    }
                }
            });
        }
    }
}
function adicionar_musica_salvar(id,nome,artista,compositor){
    cat=1;
    versos=$('#verso'+id+' li');
    t_versos=versos.length;
    nome=iso_encode(nome);
    artista=iso_encode(artista);
    compositor=iso_encode(compositor);
    dados={
        cat:cat,
        nome:nome,
        artista:artista,
        compositor:compositor
    }
    $.ajax({
        type: "POST",
        url: urlSocket+'/add/musica/',
        data: dados,
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                id_musica=data.id;
                for(i=0;i<t_versos;i++){
                    v=$(versos[i]).html();
                    v=iso_encode(v);
                    adicionar_verso(id_musica,v);
                } 
            }
        }
    });
  adicionar_musica(id);
}
function adicionar_verso(musica,verso){
    dados={
        musica:musica,
        verso:verso
    }
    $.ajax({
        type: "POST",
        url: urlSocket+'/add/musica/verso',
        data: dados,
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                id_verso=data.id;
            }
        }
    });
}
//Remover musica
function remover_musica(id,conf){
  rand=Math.floor(Math.random() * 1000000);
  if(conf!=true){
    $.confirm({
      title: 'Deseja Realmente Remover?',
      content: `<form action="" class="formName">
      <div class="form-group">
      <label>Digite o Código a seguir para Excluir: ${rand}</label>
      <input type="text" placeholder="Código" class="codigo form-control" required />
      </div>
      </form>
      `,
      buttons: {
          formSubmit: {
              text: 'Excluir',
              btnClass: 'btn-red',
              action: function () {
                  var cod = this.$content.find('.codigo').val();
                  if(!cod || cod!=rand){
                      $.alert('Código incorreto! Tente novamente');
                      return false;
                  }else{
                    $("#music"+id).remove();
                    /*
                    db.serialize(function() {
                      db.run("DELETE FROM `musica` WHERE `id`='"+id+"'");
                      lista_musica();
                    });
                    * /
                  }
              }
          },
          cancel: {
            text: 'Cancelar',
            action: function () {}
          }
      },
      onContentReady: function () {
          // bind to events
          var jc = this;
          this.$content.find('form').on('submit', function (e) {
              // if the user submits the form by pressing enter in the field.
              e.preventDefault();
              jc.$$formSubmit.trigger('click'); // reference the button and click it
          });
      }
    });
  }
}



function checkVersiculo(id){
    let cap= sessionStorage.getItem('capitulo');
    if (cap=='ok') {
        console.log(document.querySelector(id+' ul').getBoundingClientRect().height+'px')
    }else{
        setTimeout(() => {
            checkVersiculo(id)
        }, 100);
    }
}


function buscarLivro(texto) {
    // Remove acentos e transforma tudo em minúsculas
    texto = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    // Obtém todos os elementos <li> com a classe "versiculo"
    let versiculos = document.querySelectorAll(".collaps_livro");
    let encontrado=0;
    let idLocalizado=0;
    // Percorre os versículos e verifica se o texto buscado está presente
    for (var i = 0; i < versiculos.length; i++) {
      let versiculo = versiculos[i];
      
      // Remove acentos e transforma tudo em minúsculas para comparação
      let versiculoTexto = versiculo.textContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      
      // Verifica se o texto buscado está presente no versículo
        if (versiculoTexto.includes(texto)) {
            if(encontrado==0){
                idLocalizado=versiculo.nextSibling.nextSibling.id;
                if(!versiculo.classList.value.includes('active')){
                    encontrado++;
                    versiculo.click();
                }
            }else if(versiculo.classList?.value.includes('active')){
                versiculo.classList?.remove('active');
            }
        }else{
            if(versiculo.classList?.value.includes('active')){
                versiculo.classList?.remove('active');
            }
        }
    }
    return idLocalizado;
  }
  
  // Exemplo de uso: buscar o texto "ceu" desconsiderando a acentuação
// Busco na biblia
function buscaBiblia(){
    cat=$('#cat_biblia').val();
    texto=$('#busca_biblia').val();
    if(texto.length>1){
        let busca=texto.split(' ');
        let tBusca=busca.length-1;
        let primeiro=parseInt(busca[0].substr(0,1));
        let livro='';
        let capitulo=0;
        let versiculo=0;
        if(!isNaN(primeiro)){
            livro=`${primeiro} ${busca[1]}`
            tBusca=tBusca-1;
        }else{
            livro=busca[0];
        }
        let idLivro=buscarLivro(livro);
        location.href=`#ancora_${idLivro}`;
        document.querySelector("#busca_biblia").focus();
        if(tBusca>0){
            if(tBusca==2){
                capitulo=busca[1];
                versiculo=busca[2];
            }else{
                let capVer=busca[tBusca];
                if(capVer.includes(':')){
                    let capB=capVer.split(':');
                    capitulo=capB[0];
                    versiculo=capB[1];
                }else{
                    capitulo=capVer;
                }
            }
            
            if(capitulo!=0){
                let divcapitulo=document.querySelector(`#${idLivro}_${capitulo}`);
                if(!divcapitulo.classList.value.includes('active')){
                    divcapitulo.click();
                }
                location.href=`#${idLivro}_${capitulo}`;
                document.querySelector("#busca_biblia").focus();
            }
            if(versiculo!=0){
                let newBiblia=idLivro.replace('biblia','versiculo');
                let divversiculo=document.querySelector(`#${newBiblia}_${capitulo}_${versiculo}`);
                if(!divversiculo.classList?.value.includes('active')){
                    divversiculo.click();
                }
                location.href=`#${newBiblia}_${capitulo}_${versiculo}`;
                document.querySelector("#busca_biblia").focus();
            }
        }
    }
}

/* Chrome Tabs * /
//Tabs List
$('#navegacao a').click(function (e) {
    e.preventDefault()
    $(this).tab('show')
});
var el = document.querySelector('.chrome-tabs')
var chromeTabs = new ChromeTabs()
chromeTabs.init(el, {
    tabOverlapDistance: 14,
    minWidth: 45,
    maxWidth: 243
})
  
//el.addEventListener('activeTabChange', ({ detail }) => console.log('Active tab changed', detail.tabEl))
//el.addEventListener('tabAdd', ({ detail }) => console.log('Tab added', detail.tabEl))
//el.addEventListener('tabRemove', ({ detail }) => console.log('Tab removed', detail.tabEl))
  
if(document.querySelector('button[data-remove-tab]')){
    document.querySelector('button[data-remove-tab]').addEventListener('click', function(){
      chromeTabs.removeTab(el.querySelector('.chrome-tab-current'))
    });
}

function slideAtivo(){
    if(!$('.chrome-conteudo-show ul').length){
      setTimeout(() => slideAtivo(),200);
    }else{
      currenteId=document.querySelector(".chrome-conteudo-show ul").id;
      header = document.getElementById(currenteId);
      btns = header.getElementsByClassName("item_verso_musica");
      for (i = 0; i < btns.length; i++) {
        current = document.getElementsByClassName("ativo");
        btns[i].addEventListener("click", function() {
  
          if (current.length > 0) {
            current[0].className = current[0].className.replace(" ativo", "");
          }
          this.className += " ativo";
        });
      }
    }
}
var pressedCtrl = false; //variável de controle
$(document).keyup(function (e) {  //O evento Kyeup é acionado quando as teclas são soltas
  if(e.which == KEY_CTRL) pressedCtrl=false; //Quando qualuer tecla for solta é preciso informar que Crtl não está pressionada
  })
$(document).keydown(function (e) { //Quando uma tecla é pressionada
  if(e.which == KEY_CTRL) pressedCtrl = true; //Informando que Crtl está acionado
  if((e.which == KEY_ENTER|| e.keyCode == KEY_ENTER) && pressedCtrl == true) { //Reconhecendo tecla Enter
    alert('O comando Crtl+Enter foi acionado')
    }
  if(e.which == KEY_LEFT || e.keyCode == KEY_LEFT || e.which == KEY_RIGHT || e.keyCode == KEY_RIGHT){
    if(!$('#busca_musica').is(':focus') || $('#busca_musica').val()==''){
      //percorre todo sequencia atual
      let proximo = 1;
      let index = 1;
      $.each($('.chrome-conteudo-show .item_verso_musica'), function () {
        if($(this).hasClass('ativo')) {
          switch (e.keyCode) {
            case KEY_RIGHT:
              proximo += index;
              break;
            case KEY_LEFT:
              proximo = index - 1;
              break;
          }
        }
        index++;
      });
      index = 1;
      // VERIFICA SE O RETORNO É MAIOR QUE O NUMERO TOTAL DE DIVS E RETORNA FALSO PARA A NAVEGACAO NÃO SAIR DE DAS DIVS
      if(proximo > $('.chrome-conteudo-show .item_verso_musica').length || proximo < 1) {
          return false;
      // VERIFICA SE O RETORNO É MENOR QUE 1 E RETORNA FALSO PARA A NAVEGAÇÃO NÃO SAIR DAS DIVS
      }
      // PERCORRE TODAS AS DIVS ITEMS PARA ATRIBUIR A CLASSE SELECTED NA DIV QUE O CURSOR DEVE IR SETADO NA VARIAVEL PROXIMO
      $.each($('.chrome-conteudo-show .item_verso_musica'), function () {
          $(this).removeClass('ativo');
          if (index === proximo) {
              $(this).addClass('ativo');
              $(this).trigger('click');
          }
          index++;
      })
    }
  }
  if(e.which == KEY_UP || e.keyCode == KEY_UP || e.which == KEY_DOWN || e.keyCode == KEY_DOWN){
    if(!$('#busca_musica').is(':focus') || $('#busca_musica').val()==''){
      //percorre todo sequencia atual
      let proximo = 1;
      let index = 1;
      $("#busca_biblia").blur();
      $.each($('.versiculo'), function () {
        if($(this).hasClass('ativo')) {
          switch (e.keyCode) {
            case KEY_DOWN:
              proximo += index;
              break;
            case KEY_UP:
              proximo = index - 1;
              break;
          }
        }
        index++;
      });
      index = 1;
      // VERIFICA SE O RETORNO É MAIOR QUE O NUMERO TOTAL DE DIVS E RETORNA FALSO PARA A NAVEGACAO NÃO SAIR DE DAS DIVS
      if(proximo > $('.versiculo').length || proximo < 1) {
          return false;
      // VERIFICA SE O RETORNO É MENOR QUE 1 E RETORNA FALSO PARA A NAVEGAÇÃO NÃO SAIR DAS DIVS
      }
      // PERCORRE TODAS AS DIVS ITEMS PARA ATRIBUIR A CLASSE SELECTED NA DIV QUE O CURSOR DEVE IR SETADO NA VARIAVEL PROXIMO
      $.each($('.versiculo'), function () {
          $(this).removeClass('ativo');
          if (index === proximo) {
              $(this).addClass('ativo');
              $(this).trigger('click');
          }
          index++;
      })
    }
  }
});
*/
var socket = io.connect(urlSocket);
socket.emit("join", user);
ready = true;
socket.on("chat", function (client, msg) {
    if (ready) {
        /*
    obj = JSON.parse(msg);
    fn=obj.funcao[0].nome;
    vl=obj.funcao[0].valor;
    vl=atob(vl);
    console.log('Função: '+fn+' e Valor: '+vl);
    switch(fn){
        case 'texto':
            texto(vl);
        break;

        case 'removeConteudo':
            removeConteudo();
        break;

        case 'atualizar':
            atualizar();
        break;

        case 'viewMusica':
            viewMusica(vl);
        break;

        case 'viewBiblia':
            viewBiblia(vl);
        break;

        case 'background':
            background(vl);
        break;
    }
    */
    }
});