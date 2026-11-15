import assert from 'node:assert/strict';
import {test} from 'node:test';
import {amountToInput, parseAmount} from '../src/lib/amount';

test('parseAmount reads what people type on a phone', () => {
  assert.equal(parseAmount('100'), 100);
  assert.equal(parseAmount('100,50'), 100.5);
  assert.equal(parseAmount('100.5'), 100.5);
  assert.equal(parseAmount('1.250,00'), 1250);
  assert.equal(parseAmount('1,250.00'), 1250);
  assert.equal(parseAmount('1.250'), 1250);
  assert.equal(parseAmount('R$ 80'), 80);
});

test('parseAmount returns null for empty, zero or unreadable input', () => {
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('abc'), null);
  assert.equal(parseAmount('0'), null);
});

test('amountToInput writes the amount back in the person’s language', () => {
  assert.equal(amountToInput(null, 'pt-BR'), '');
  assert.equal(amountToInput(100, 'pt-BR'), '100');
  assert.equal(amountToInput(100.5, 'pt-BR'), '100,5');
  assert.equal(amountToInput(1250, 'en'), '1250');
});
