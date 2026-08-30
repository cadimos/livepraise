#!/usr/bin/env node
/**
 * Regressão: filtro de cifras não pode apagar letra que começa por A–G.
 */
import {
  isProjectionChordLine,
  stripChordsForProjection,
  stripChordsFromHtml,
} from '../dist/shared/projection-chords.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const LETRA = [
  'E ao Teu falar',
  'A cem bilhões de estrelas brilho dás',
  'E se tudo existe pra Te exaltar, eu também',
  'A vida e a Ciência o som de Tua voz seguirão',
  'A alegria do Senhor é a nossa força',
  'Deus de promessas',
  'Bilhões de falhas deixam de existir',
  'Cada estrela, um sinal do Teu perdão',
  'Foi por mim',
  'Grande é o Senhor',
];

for (const line of LETRA) {
  assert(!isProjectionChordLine(line), `letra preservada: ${line}`);
}

const CIFRAS = [
  'C  G/B  Am7  F',
  'E',
  'F#m7',
  'Cmaj7 Dm7 G7 Cmaj7',
  'Bb/D',
  'Csus4 Cadd9',
  'C7(b5) A7(#9)',
  'C6/9',
  'Am | F | C | G',
];

for (const line of CIFRAS) {
  assert(isProjectionChordLine(line), `cifra removida: ${line}`);
}

assert(!isProjectionChordLine(''), 'linha vazia não é cifra');
assert(!isProjectionChordLine('   '), 'linha em branco não é cifra');

const verso = [
  'E ao Teu falar',
  'A cem bilhões de estrelas brilho dás',
  'Planetas nascem com o Teu soprar',
  'Se as estrelas Te adoram, eu também',
].join('\n');

assert(
  stripChordsForProjection(verso) === verso,
  'verso sem cifras mantém as 4 linhas',
);

const comCifra = ['C   G   Am   F', 'E ao Teu falar', 'Planetas nascem'].join('\n');
assert(
  stripChordsForProjection(comCifra) === 'E ao Teu falar\nPlanetas nascem',
  'remove só a linha de cifra',
);

const html = '<div class="content"><span>E ao Teu falar<br />C G Am<br />Planetas nascem</span></div>';
const strippedHtml = stripChordsFromHtml(html);
assert(strippedHtml.includes('E ao Teu falar'), 'html preserva letra');
assert(strippedHtml.includes('Planetas nascem'), 'html preserva última linha');
assert(!strippedHtml.includes('C G Am'), 'html remove cifra');

console.log('projection-chords.test: OK');
