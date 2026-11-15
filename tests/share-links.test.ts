import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildGroupUrl, buildHostUrl, buildParticipantUrl, displayUrl, parseNames, readTokenFromHash} from '../src/lib/share-links';

const origin = 'https://amigosecreto.gr1618.io';

test('tokens travel in the #fragment, never in the path or query', () => {
  assert.equal(buildGroupUrl(origin, 'abc123def456'), `${origin}/g/abc123def456`);
  assert.equal(buildHostUrl(origin, 'abc123def456', 'hosttoken'), `${origin}/g/abc123def456/manage#hosttoken`);
  assert.equal(buildParticipantUrl(origin, 'abc123def456', 'mytoken'), `${origin}/g/abc123def456/me#mytoken`);
});

test('readTokenFromHash strips the # and survives bad encoding', () => {
  assert.equal(readTokenFromHash('#abc'), 'abc');
  assert.equal(readTokenFromHash(''), '');
  assert.equal(readTokenFromHash('#%E0%A4%A'), '');
});

test('displayUrl drops the protocol', () => {
  assert.equal(displayUrl(`${origin}/g/x`), 'amigosecreto.gr1618.io/g/x');
});

test('parseNames splits lines, commas and semicolons, trims and drops duplicates', () => {
  assert.deepEqual(parseNames('Ana\nBeto, Carla;  Dani  \n\nana\nBeto'), ['Ana', 'Beto', 'Carla', 'Dani']);
  assert.deepEqual(parseNames('  Maria   Clara  '), ['Maria Clara']);
  assert.deepEqual(parseNames(' , \n'), []);
});
