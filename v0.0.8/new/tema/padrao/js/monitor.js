function teste(){
    alert('teste');
}
let protocolo=document.location.protocol;
let porta=3000;
//Listo a URL de Conexão
urlSocket= protocolo=='file:' ? 'http://localhost:3000' : `${document.location.protocol}//${document.location.hostname}:${porta}`
/*Listo as Biblias*/
function catBiblias(){
  $('#cat_biblia').html('');
  $.ajax({
      type: "GET",
      url: urlSocket+'/lista/biblias',
      dataType: "json",
      success: function(data) {
          if(data.status=='successo'){
              t_rows=data.biblias.length;
              result=data.biblias;
              for(i=0;i<t_rows;i++){
                  option=result[i].nome;
                  id=result[i].arquivo
                  $('#cat_biblia').append('<option value="'+id+'">'+option+'</option>');
                  if(i==0){
                      lista_biblia();
                  }
              }
          }
      }
  });
  return true;
}
//Lista a Biblia Selecionada
function lista_biblia(){
  cat=$('#cat_biblia').val();
  let modelo=`<button class="collaps_livro">[nome_livro]</button>
  <div class="content" id="biblia_[id_livro]">
  </div>`;
  $('#list_biblia').html('');
  $.ajax({
      type: "GET",
      url: urlSocket+'/livros/biblia/'+cat,
      dataType: "json",
      success: function(data) {
          if(data.status=='successo'){
              t_rows=data.data.length;
              result=data.data;
              for(i=0;i<t_rows;i++){
                  item=modelo.replace(/\[id_livro\]/g,result[i].id);
                  item=item.replace(/\[nome_livro\]/g,result[i].nome);
                  $('#list_biblia').append(item);
                  lista_capitulos(result[i].id);
              }
          }
      }
  });
  drop();
  return true;
}
function lista_capitulos(id){
  cat=$('#cat_biblia').val();
  let modelo=`<button class="collaps_capitulo" onclick="lista_versiculo('${cat}',[id_livro],[id_capitulo])"><i class="fas fa-bible"></i> [id_capitulo]</button>
  <div class="content" id="collapse_[id_livro]_[id_capitulo]">
      <ul id="versiculo"></ul>
  </div>`;
  $.ajax({
      type: "GET",
      url: urlSocket+'/capitulo/biblia/'+cat+'/'+id,
      dataType: "json",
      success: function(data) {
          if(data.status=='successo'){
              let t_rows=data.data[0].capitulos
              for(i=0;i<t_rows;i++){
                capitulos=i+1;
                item=modelo.replace(/\[id_livro\]/g,id);
                items=item.replace(/\[id_capitulo\]/g,capitulos);
                $('#biblia_'+id).append(items);
              }
          }
      }
  });
  return true;
}
//Funçao de Listar os Versiculos por demanda
function lista_versiculo(cat,livro,capitulo){
  cat_selecionado=$('#cat_biblia').val();
  if(cat!=cat_selecionado){
      cat=cat_selecionado;
  }
  modelo_versiculo=`<a name="versiculo_[id_livro]_[id_capitulo]_[id_versiculo]"></a><li onclick="viewBiblia('versiculo_[id_livro]_[id_capitulo]_[id_versiculo]','[local_biblia]','BR');" id="versiculo_[id_livro]_[id_capitulo]_[id_versiculo]" class="versiculo">[texto]</li>`;
  modelo_versiculo=modelo_versiculo.replace(/\[id_livro\]/g,livro);
  modelo_versiculo=modelo_versiculo.replace(/\[id_capitulo\]/g,capitulo);
  $.ajax({
      type: "GET",
      url: urlSocket+'/versiculo/biblia/'+cat+'/'+livro+'/'+capitulo,
      dataType: "json",
      success: function(data) {
          if(data.status=='successo'){
              t_rows=data.data.length;
              result=data.data;
              $('#collapse_'+livro+'_'+capitulo+' #versiculo').html('');
              for(i=0;i<t_rows;i++){
                  versiculo=modelo_versiculo.replace(/\[id_versiculo\]/g,result[i].versiculo);
                  versiculo=versiculo.replace(/\[texto\]/g,(result[i].texto));
                  versiculo=versiculo.replace(/\[local_biblia\]/g,livro+'-'+capitulo+'-'+result[i].versiculo);
                  $('#collapse_'+livro+'_'+capitulo+' #versiculo').append(versiculo);
              }
          }
      }
  });
}
//Iniciações
catBiblias();
/* Chrome Tabs */
//Tabs List
$('#navegacao a').click(function (e) {
    e.preventDefault();
    console.log(this);
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
function drop(){
  setTimeout(() => {
    //Menu Drop Livros
    var coll = document.getElementsByClassName("collaps_livro");
    var l;

    for (l = 0; l < coll.length; l++) {
      coll[l].addEventListener("click", function() {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.maxHeight){
          content.style.maxHeight = null;
        } else {
          //content.style.maxHeight = content.scrollHeight + "px";
          content.style.maxHeight='100%';
        } 
      });
    }
    //Menu Drop Capitulos
    var coll_cap = document.getElementsByClassName("collaps_capitulo");
    var c;

    for (c = 0; c < coll_cap.length; c++) {
        coll_cap[c].addEventListener("click", function() {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.maxHeight){
          content.style.maxHeight = null;
        } else {
          //content.style.maxHeight = content.scrollHeight + "px";
          content.style.maxHeight='100%';
        } 
      });
    }
  }, 1000);
}