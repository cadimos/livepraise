#!/usr/bin/env node
/**
 * Gera locales/pt-PT.json a partir de pt-BR.json (paridade de chaves).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLocaleFile } from './lib/build-locale.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {Record<string, string>} */
const OVERRIDES = {
  'Conta activa': 'Conta ativa',
  'inactivo': 'inativo',
  'Utilizador actualizado.': 'Utilizador atualizado.',
  'Seleccione um backup (.zip) gerado por este sistema. Só pode restaurar grupos que existam nesse ficheiro.':
    'Selecione um backup (.zip) gerado por este sistema. Só pode restaurar grupos que existam nesse ficheiro.',
  'Restaurar substitui os dados seleccionados neste computador. Confirme que o ficheiro veio de uma fonte de confiança.':
    'Restaurar substitui os dados selecionados neste computador. Confirme que o ficheiro veio de uma fonte de confiança.',
  'Seleccionar todos': 'Selecionar todos',
  'Limpar selecção': 'Limpar seleção',
  'Os grupos seleccionados foram aplicados.': 'Os grupos selecionados foram aplicados.',
  'Compreendo que os dados seleccionados serão substituídos':
    'Compreendo que os dados selecionados serão substituídos',
  'Restauro concluído': 'Restauração concluída',
  'Este backup é de uma versão mais recente do Live Praise. Actualize a aplicação antes de restaurar.':
    'Este backup é de uma versão mais recente do Live Praise. Atualize a aplicação antes de restaurar.',
  'Seleccione pelo menos um grupo.': 'Selecione pelo menos um grupo.',
  'Actualizar': 'Atualizar',
  'A actualizar…': 'A atualizar…',
  'Limpar todos os registos de erro? Esta acção não pode ser desfeita.':
    'Limpar todos os registos de erro? Esta ação não pode ser desfeita.',
  'Quando activo, mostra no rodapé dos monitores de projeção e dos dispositivos ligados pela rede a última acção recebida (ex.: mudança de música às 17:08:38).':
    'Quando ativo, mostra no rodapé dos monitores de projeção e dos dispositivos ligados pela rede a última ação recebida (ex.: mudança de música às 17:08:38).',
  'Limpar tela': 'Limpar ecrã',
  'Salvar': 'Guardar',
  'Tela projetor': 'Ecrã do projetor',
  'Activar ferramenta': 'Ativar ferramenta',
  'Nenhum monitor de projeção ou retorno configurado. Defina papéis em Configurações → Tela projetor.':
    'Nenhum monitor de projeção ou retorno configurado. Defina papéis em Configurações → Ecrã do projetor.',
  'Envia um texto rolante na barra inferior dos monitores seleccionados. O texto percorre o ecrã o número de vezes e na velocidade definidos.':
    'Envia um texto rolante na barra inferior dos monitores selecionados. O texto percorre o ecrã o número de vezes e na velocidade definidos.',
  'Nenhum monitor configurado. Defina papéis em Configurações → Tela projetor.':
    'Nenhum monitor configurado. Defina papéis em Configurações → Ecrã do projetor.',
  'Versão do aplicativo: {version}': 'Versão da aplicação: {version}',
  'Excluir da biblioteca': 'Eliminar da biblioteca',
  'Excluir «{name}» da biblioteca': 'Eliminar «{name}» da biblioteca',
  'Excluir «{name}»? Esta ação não pode ser desfeita.': 'Eliminar «{name}»? Esta ação não pode ser desfeita.',
  'Seleccione ou crie uma fila (aba) antes de aplicar mídia.':
    'Selecione ou crie uma fila (aba) antes de aplicar mídia.',
  'Não foi possível excluir o ficheiro da biblioteca.':
    'Não foi possível eliminar o ficheiro da biblioteca.',
  'Carregando…': 'A carregar…',
  'Excluir música': 'Eliminar música',
  'Não foi possível excluir a música.': 'Não foi possível eliminar a música.',
  'Tamanho da tela de projeção': 'Tamanho do ecrã de projeção',
  'Tamanho da tela': 'Tamanho do ecrã',
  'Posição na tela': 'Posição no ecrã',
  'Tamanho da tela guardado e enviado ao projetor.':
    'Tamanho do ecrã guardado e enviado ao projetor.',
  'Erro ao guardar tamanho da tela': 'Erro ao guardar tamanho do ecrã',
  'Cada browser aberto em /projector num computador remoto aparece aqui com configuração de tela independente. Endpoints diferentes (/stage, /vocal, …) têm identificadores separados.':
    'Cada browser aberto em /projector num computador remoto aparece aqui com configuração de ecrã independente. Endpoints diferentes (/stage, /vocal, …) têm identificadores separados.',
  'Alterações de senha ou papel invalidam sessões activas.':
    'Alterações de senha ou papel invalidam sessões ativas.',
  'Manutenção: backup ou restauro em curso. Algumas acções estão temporariamente indisponíveis.':
    'Manutenção: backup ou restauração em curso. Algumas ações estão temporariamente indisponíveis.',
};

/** @param {string} value */
function applyPtPtRules(value) {
  if (OVERRIDES[value]) return OVERRIDES[value];
  return value
    .replace(/Seleccione/g, 'Selecione')
    .replace(/seleccionados/g, 'selecionados')
    .replace(/seleccionadas/g, 'selecionadas')
    .replace(/Seleccionar/g, 'Selecionar')
    .replace(/selecção/g, 'seleção')
    .replace(/Selecção/g, 'Seleção')
    .replace(/actualizado/g, 'atualizado')
    .replace(/Actualizado/g, 'Atualizado')
    .replace(/actualizar/g, 'atualizar')
    .replace(/Actualizar/g, 'Atualizar')
    .replace(/Actualize/g, 'Atualize')
    .replace(/acções/g, 'ações')
    .replace(/acção/g, 'ação')
    .replace(/Acção/g, 'Ação')
    .replace(/activos/g, 'ativos')
    .replace(/activo/g, 'ativo')
    .replace(/activa/g, 'ativa')
    .replace(/Activar/g, 'Ativar')
    .replace(/inactivo/g, 'inativo')
    .replace(/Excluir/g, 'Eliminar')
    .replace(/excluir/g, 'eliminar')
    .replace(/Carregando/g, 'A carregar')
    .replace(/aplicativo/g, 'aplicação')
    .replace(/Tela projetor/g, 'Ecrã do projetor')
    .replace(/tela de projeção/g, 'ecrã de projeção')
    .replace(/Tamanho da tela/g, 'Tamanho do ecrã')
    .replace(/Posição na tela/g, 'Posição no ecrã')
    .replace(/Limpar tela/g, 'Limpar ecrã')
    .replace(/configuração de tela/g, 'configuração de ecrã')
    .replace(/Restauro concluído/g, 'Restauração concluída');
}

buildLocaleFile({
  root: ROOT,
  code: 'pt-PT',
  translate: applyPtPtRules,
  meta: {
    'pt-BR': 'Português (Brasil)',
    'en-US': 'English',
    'pt-PT': 'Português (Portugal)',
    'es-ES': 'Español',
  },
});

console.log('build-pt-pt-locale: OK');
