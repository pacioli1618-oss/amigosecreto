// RPC responses (snake_case jsonb) → view types (camelCase). Framework-free and unit-tested
// against real responses in tests/fixtures/. Components only ever see the view types.

import type {Locale} from '@/i18n/locales';

// ---------------------------------------------------------------------------
// Raw shapes, exactly as the as_* functions return them
// ---------------------------------------------------------------------------

export type RawGroupView = {
  slug: string;
  title: string;
  exchange_date: string | null;
  budget: number | null;
  currency: string;
  notes: string | null;
  locale: string;
  drawn_at: string | null;
  participant_names: string[];
};

export type RawHostParticipant = {
  id: string;
  name: string;
  invite_token: string | null;
  has_opened: boolean;
  has_wishes: boolean;
  has_revealed: boolean;
};

export type RawExclusion = {id: string; participant_a_id: string; participant_b_id: string};

export type RawHostGroupView = RawGroupView & {
  participants: RawHostParticipant[];
  exclusions: RawExclusion[];
};

export type RawRecipient = {name: string; wishes: string | null};

export type RawParticipantView = {
  group: RawGroupView;
  me: {id: string; name: string; wishes: string | null};
  has_revealed: boolean;
  recipient: RawRecipient | null;
};

export type RawCreatedGroup = {slug: string; host_token: string; participant_token: string | null};

export type RawAddedParticipant = {id: string; name: string; participant_token: string};

export type RawJoinedGroup = {participant_id: string; participant_token: string};

// ---------------------------------------------------------------------------
// View types
// ---------------------------------------------------------------------------

export type GroupView = {
  slug: string;
  title: string;
  /** YYYY-MM-DD, a wall-clock date (format in UTC). */
  exchangeDate: string | null;
  budget: number | null;
  currency: string;
  notes: string | null;
  locale: Locale;
  drawnAt: string | null;
  isDrawn: boolean;
  participantNames: string[];
};

export type HostParticipant = {
  id: string;
  name: string;
  /** Present when the host typed the name: the personal link can be sent again. */
  inviteToken: string | null;
  isSelfJoined: boolean;
  hasOpened: boolean;
  hasWishes: boolean;
  hasRevealed: boolean;
};

export type Exclusion = {id: string; participantAId: string; participantBId: string};

export type HostGroupView = GroupView & {participants: HostParticipant[]; exclusions: Exclusion[]};

export type Recipient = {name: string; wishes: string | null};

export type ParticipantView = {
  group: GroupView;
  me: {id: string; name: string; wishes: string | null};
  hasRevealed: boolean;
  recipient: Recipient | null;
};

export type CreatedGroup = {slug: string; hostToken: string; participantToken: string | null};

export type AddedParticipant = {id: string; name: string; participantToken: string};

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

const knownLocales = ['pt-BR', 'es', 'en'] as const;

export function toGroupView(raw: RawGroupView): GroupView {
  return {
    slug: raw.slug,
    title: raw.title,
    exchangeDate: raw.exchange_date,
    budget: raw.budget === null ? null : Number(raw.budget),
    currency: raw.currency,
    notes: raw.notes,
    locale: (knownLocales as readonly string[]).includes(raw.locale) ? (raw.locale as Locale) : 'pt-BR',
    drawnAt: raw.drawn_at,
    isDrawn: raw.drawn_at !== null,
    participantNames: raw.participant_names ?? [],
  };
}

export function toHostGroupView(raw: RawHostGroupView): HostGroupView {
  return {
    ...toGroupView(raw),
    participants: (raw.participants ?? []).map((participant) => ({
      id: participant.id,
      name: participant.name,
      inviteToken: participant.invite_token,
      isSelfJoined: participant.invite_token === null,
      hasOpened: participant.has_opened,
      hasWishes: participant.has_wishes,
      hasRevealed: participant.has_revealed,
    })),
    exclusions: (raw.exclusions ?? []).map((exclusion) => ({
      id: exclusion.id,
      participantAId: exclusion.participant_a_id,
      participantBId: exclusion.participant_b_id,
    })),
  };
}

export function toRecipient(raw: RawRecipient): Recipient {
  return {name: raw.name, wishes: raw.wishes};
}

export function toParticipantView(raw: RawParticipantView): ParticipantView {
  return {
    group: toGroupView(raw.group),
    me: {id: raw.me.id, name: raw.me.name, wishes: raw.me.wishes},
    hasRevealed: raw.has_revealed,
    recipient: raw.recipient ? toRecipient(raw.recipient) : null,
  };
}

export function toCreatedGroup(raw: RawCreatedGroup): CreatedGroup {
  return {slug: raw.slug, hostToken: raw.host_token, participantToken: raw.participant_token};
}

export function toAddedParticipants(raw: RawAddedParticipant[]): AddedParticipant[] {
  return raw.map((participant) => ({id: participant.id, name: participant.name, participantToken: participant.participant_token}));
}
