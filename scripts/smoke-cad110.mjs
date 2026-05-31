#!/usr/bin/env node
/**
 * Smoke CAD-110: `jo` → Jó antes de João; fallback João se capítulo inválido em Jó.
 */
import {
  findBookByReference,
  findBookFallbackForReference,
} from '../dist/shared/bible-reference.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sampleBooks = [
  { id: 43, nome: 'João' },
  { id: 18, nome: 'Jó' },
  { id: 29, nome: 'Joel' },
  { id: 32, nome: 'Jonas' },
];

const job = findBookByReference(sampleBooks, 'jo');
assert(job?.nome === 'Jó', 'jo → Jó');

const joa = findBookByReference(sampleBooks, 'jó');
assert(joa?.nome === 'Jó', 'jó (com acento) → Jó');

const joao = findBookByReference(sampleBooks, 'joao');
assert(joao?.nome === 'João', 'joao → João');

const noFallback = findBookFallbackForReference(sampleBooks, 'jo', job, 22, 42);
assert(noFallback === null, 'jo cap 22 válido em Jó (42 caps) → sem fallback');

const withFallback = findBookFallbackForReference(sampleBooks, 'jo', job, 43, 42);
assert(withFallback?.nome === 'João', 'jo cap 43 inválido em Jó → fallback João');

const wrongQuery = findBookFallbackForReference(sampleBooks, 'mat', job, 99, 42);
assert(wrongQuery === null, 'fallback só para query jo');

console.log('smoke-cad110: OK');
