// Server only: what a link preview (WhatsApp, Telegram, iMessage) shows for /g/<slug>.
// Used by the group layout's metadata and by the image at /api/og/<slug>.
// Only the group's details: never participant names, never the result.

import {cacheLife} from 'next/cache';
import type {Locale} from '@/i18n/locales';
import {getGroup, RpcError} from './api';

export type GroupPreview = {
  title: string;
  exchangeDate: string | null;
  budget: number | null;
  currency: string;
  /** The organizer's language: the preview is the same for the whole group. */
  locale: Locale;
};

// Slugs are 12 random [a-z0-9] characters; anything else is not worth a database call.
const SLUG_PATTERN = /^[a-z0-9]{8,32}$/;

async function loadGroupPreview(slug: string): Promise<GroupPreview | null> {
  'use cache';
  // Previews are cached by the apps for days anyway; a few minutes here spares the database.
  cacheLife('minutes');
  try {
    const group = await getGroup(slug);
    return {title: group.title, exchangeDate: group.exchangeDate, budget: group.budget, currency: group.currency, locale: group.locale};
  } catch (error) {
    if (error instanceof RpcError && error.message === 'group_not_found') return null;
    throw error; // not cached: the next request tries again
  }
}

/** null when the group does not exist or the database can't be reached: callers fall back to the app's preview. */
export async function getGroupPreview(slug: string): Promise<GroupPreview | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  try {
    return await loadGroupPreview(slug);
  } catch {
    return null;
  }
}
