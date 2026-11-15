import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {toHostGroupView, toParticipantView, type RawHostGroupView, type RawParticipantView} from '../src/lib/api-mappers';

// Real responses captured from the as_* RPCs (tests/fixtures/). Refresh them when an RPC changes.
const load = <T>(name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8')) as T;

test('host view: participants keep status but never a recipient', () => {
  const view = toHostGroupView(load<RawHostGroupView>('as_get_group_as_host'));
  assert.equal(view.title, 'Amigo secreto da família');
  assert.equal(view.budget, 100);
  assert.equal(view.isDrawn, true);
  assert.deepEqual(view.participants.map((participant) => participant.name), ['Luca', 'Ana', 'Beto']);
  const [luca, ana] = view.participants;
  assert.equal(luca.isSelfJoined, true);
  assert.equal(ana.isSelfJoined, false);
  assert.equal(ana.hasRevealed, true);
  assert.ok(!JSON.stringify(view).includes('recipient'));
});

test('participant view: the recipient comes back only after the reveal', () => {
  const view = toParticipantView(load<RawParticipantView>('as_open_participant'));
  assert.equal(view.me.name, 'Ana');
  assert.equal(view.hasRevealed, true);
  assert.ok(view.recipient && ['Luca', 'Beto'].includes(view.recipient.name));
  assert.equal(view.group.locale, 'pt-BR');
});
