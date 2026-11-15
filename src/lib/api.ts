// The only door between the app and the database.
//
// - Calls the public.as_* RPCs with typed arguments (database.types.ts).
// - Converts snake_case responses into camelCase view types (api-mappers.ts).
// - Throws RpcError with the fixed error code; translate it with useRpcErrorMessage().

import type {Locale} from '@/i18n/locales';
import {
  toAddedParticipants,
  toCreatedGroup,
  toGroupView,
  toHostGroupView,
  toParticipantView,
  toRecipient,
  type RawAddedParticipant,
  type RawCreatedGroup,
  type RawGroupView,
  type RawHostGroupView,
  type RawJoinedGroup,
  type RawParticipantView,
  type RawRecipient,
} from './api-mappers';
import type {Database} from './database.types';
import {supabase} from './supabase';

export type * from './api-mappers';

type Functions = Database['public']['Functions'];

/** message = the fixed error code (e.g. "group_already_drawn"); details = DETAIL, when set. */
export class RpcError extends Error {
  constructor(
    message: string,
    public readonly details: string | null = null,
  ) {
    super(message);
    this.name = 'RpcError';
  }
}

async function call<F extends keyof Functions>(fn: F, args: Functions[F]['Args']): Promise<Functions[F]['Returns']> {
  const {data, error} = await supabase.rpc(fn, args as never);
  if (error) throw new RpcError(error.message, error.details || null);
  return data as Functions[F]['Returns'];
}

// ---------------------------------------------------------------------------
// Anyone with the group link
// ---------------------------------------------------------------------------

export type CreateGroupInput = {
  title: string;
  exchangeDate?: string;
  budget?: number;
  currency?: string;
  notes?: string;
  locale?: Locale;
  deviceId?: string;
  /** When set, the host takes part in the draw too. */
  hostName?: string;
};

/** Returns the host token (and the host's participant token) once. Store them right away. */
export async function createGroup(input: CreateGroupInput) {
  const raw = await call('as_create_group', {
    p_title: input.title,
    p_exchange_date: input.exchangeDate,
    p_budget: input.budget,
    p_currency: input.currency,
    p_notes: input.notes,
    p_locale: input.locale,
    p_device_id: input.deviceId,
    p_host_name: input.hostName,
  });
  return toCreatedGroup(raw as unknown as RawCreatedGroup);
}

export async function getGroup(slug: string) {
  return toGroupView((await call('as_get_group', {p_slug: slug})) as unknown as RawGroupView);
}

export async function joinGroup(slug: string, name: string, deviceId: string) {
  const raw = (await call('as_join_group', {p_slug: slug, p_name: name, p_device_id: deviceId})) as unknown as RawJoinedGroup;
  return {participantId: raw.participant_id, participantToken: raw.participant_token};
}

// ---------------------------------------------------------------------------
// A participant's personal link
// ---------------------------------------------------------------------------

export async function openParticipant(slug: string, participantToken: string, deviceId: string) {
  const raw = await call('as_open_participant', {p_slug: slug, p_participant_token: participantToken, p_device_id: deviceId});
  return toParticipantView(raw as unknown as RawParticipantView);
}

export async function revealRecipient(slug: string, participantToken: string) {
  const raw = await call('as_reveal_recipient', {p_slug: slug, p_participant_token: participantToken});
  return toRecipient(raw as unknown as RawRecipient);
}

export async function setWishes(slug: string, participantToken: string, wishes: string) {
  await call('as_set_wishes', {p_slug: slug, p_participant_token: participantToken, p_wishes: wishes});
}

// ---------------------------------------------------------------------------
// Host link
// ---------------------------------------------------------------------------

export async function getGroupAsHost(slug: string, hostToken: string) {
  const raw = await call('as_get_group_as_host', {p_slug: slug, p_host_token: hostToken});
  return toHostGroupView(raw as unknown as RawHostGroupView);
}

export type GroupPatch = {title: string; exchangeDate: string | null; budget: number | null; notes: string | null};

export async function updateGroup(slug: string, hostToken: string, patch: GroupPatch) {
  await call('as_update_group', {
    p_slug: slug,
    p_host_token: hostToken,
    p_title: patch.title,
    p_exchange_date: patch.exchangeDate ?? undefined,
    p_budget: patch.budget ?? undefined,
    p_notes: patch.notes ?? undefined,
  });
}

export async function addParticipants(slug: string, hostToken: string, names: string[]) {
  const raw = await call('as_add_participants', {p_slug: slug, p_host_token: hostToken, p_names: names});
  return toAddedParticipants(raw as unknown as RawAddedParticipant[]);
}

export async function removeParticipant(slug: string, hostToken: string, participantId: string) {
  await call('as_remove_participant', {p_slug: slug, p_host_token: hostToken, p_participant_id: participantId});
}

export async function addExclusion(slug: string, hostToken: string, participantAId: string, participantBId: string) {
  return call('as_add_exclusion', {
    p_slug: slug,
    p_host_token: hostToken,
    p_participant_a_id: participantAId,
    p_participant_b_id: participantBId,
  });
}

export async function deleteExclusion(slug: string, hostToken: string, exclusionId: string) {
  await call('as_delete_exclusion', {p_slug: slug, p_host_token: hostToken, p_exclusion_id: exclusionId});
}

export async function drawGroup(slug: string, hostToken: string) {
  return call('as_draw', {p_slug: slug, p_host_token: hostToken});
}

export async function resetDraw(slug: string, hostToken: string) {
  await call('as_reset_draw', {p_slug: slug, p_host_token: hostToken});
}

export async function deleteGroup(slug: string, hostToken: string) {
  await call('as_delete_group', {p_slug: slug, p_host_token: hostToken});
}
