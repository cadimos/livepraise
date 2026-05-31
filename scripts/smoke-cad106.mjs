#!/usr/bin/env node
/**
 * Smoke CAD-106: pesquisa Bíblia por referência (parse + resolução de livro).
 */
import {
  parseBibleReference,
  findBookByReference,
} from '../dist/shared/bible-reference.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sampleBooks = [
  { id: 40, nome: 'Mateus' },
  { id: 43, nome: 'João' },
  { id: 18, nome: 'Jó' },
  { id: 19, nome: 'Salmos' },
  { id: 62, nome: '1 João' },
  { id: 29, nome: 'Joel' },
  { id: 32, nome: 'Jonas' },
];

const mat51 = parseBibleReference('mat 5 1');
assert(mat51?.bookQuery === 'mat', 'mat 5 1 → livro mat');
assert(mat51?.chapter === 5 && mat51?.verse === 1, 'mat 5 1 → cap 5 v 1');

const jo316 = parseBibleReference('jo 3 16');
assert(jo316?.bookQuery === 'jo' && jo316?.chapter === 3 && jo316?.verse === 16, 'jo 3 16');

const cartas = parseBibleReference('1 jo 3 16');
assert(cartas?.bookQuery === '1 jo' && cartas?.chapter === 3 && cartas?.verse === 16, '1 jo 3 16');

const mat5 = parseBibleReference('mat 5');
assert(mat5?.bookQuery === 'mat' && mat5?.chapter === 5 && mat5?.verse === undefined, 'mat 5 parcial');

assert(parseBibleReference('a') === null, 'referência curta ignorada');

const mateus = findBookByReference(sampleBooks, 'mat');
assert(mateus?.nome === 'Mateus', 'mat → Mateus');

const jo = findBookByReference(sampleBooks, 'jo');
assert(jo?.nome === 'Jó', 'jo → Jó (paridade monitor.js, não Joel/Jonas/João)');

const joaoFull = findBookByReference(sampleBooks, 'joao 3');
assert(joaoFull?.nome === 'João', 'joao → João');

const primeiroJoao = findBookByReference(sampleBooks, '1 jo');
assert(primeiroJoao?.nome === '1 João', '1 jo → 1 João');

console.log('smoke-cad106: OK');
