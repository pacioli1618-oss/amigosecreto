// Everything AmigoSecreto keeps on the device, in one versioned place. No component touches
// localStorage directly.
//
// A device can be the host of a group, a participant in it, or both (the host who also takes
// part). The two tokens are kept separately: the host token manages the group, the participant
// token opens "who I drew". Both exist only here; the server keeps just their hashes.
//
// Browser only. Do not import from Server Components.

import {isThemeChoice, THEME_STORAGE_KEY, type ThemeChoice} from './theme';

const STORAGE_KEY = 'amigosecreto';
const STORE_VERSION = 1;

export type StoredGroup = {
  slug: string;
  title: string;
  exchangeDate: string | null;
  hostToken?: string;
  participantToken?: string;
  lastOpenedAt: string;
};

export type DeviceStore = {
  version: typeof STORE_VERSION;
  /** Anonymous identity of this device, sent to the RPCs as p_device_id. */
  deviceId: string;
  /** Groups by slug. */
  groups: Record<string, StoredGroup>;
};

function createEmptyStore(): DeviceStore {
  return {version: STORE_VERSION, deviceId: crypto.randomUUID(), groups: {}};
}

// When the format changes, bump STORE_VERSION and convert the previous version here.
function migrateStore(raw: unknown): DeviceStore | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<DeviceStore>;
  if (data.version === STORE_VERSION && typeof data.deviceId === 'string' && data.groups) {
    return data as DeviceStore;
  }
  return null;
}

// localStorage may be missing or throw (private mode, WhatsApp's in-app browser):
// then the app keeps working in this tab's memory only.
let memoryStore: DeviceStore | null = null;

export function readStore(): DeviceStore {
  if (memoryStore) return memoryStore;
  try {
    const parsed = migrateStore(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null'));
    memoryStore = parsed ?? createEmptyStore();
    if (!parsed) writeStore(memoryStore);
  } catch {
    memoryStore = createEmptyStore();
  }
  return memoryStore;
}

function writeStore(store: DeviceStore) {
  memoryStore = store;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // No persistence available: keep going in memory.
  }
  listeners.forEach((listener) => listener());
}

const listeners = new Set<() => void>();

/** Calls back when this tab or another tab changes the store. Returns the unsubscribe function. */
export function subscribeToStore(listener: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    memoryStore = null; // another tab wrote: read again
    listener();
  };
  listeners.add(listener);
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

export function getDeviceId(): string {
  return readStore().deviceId;
}

export function getStoredGroup(slug: string): StoredGroup | undefined {
  return readStore().groups[slug];
}

/** Saves or updates a group in "My groups". Never drops a token this device already has. */
export function rememberGroup(group: Omit<StoredGroup, 'lastOpenedAt'>) {
  const store = readStore();
  const previous = store.groups[group.slug];
  const next: StoredGroup = {
    ...previous,
    ...group,
    hostToken: group.hostToken ?? previous?.hostToken,
    participantToken: group.participantToken ?? previous?.participantToken,
    lastOpenedAt: new Date().toISOString(),
  };
  writeStore({...store, groups: {...store.groups, [group.slug]: next}});
}

/** Refreshes what "My groups" shows without touching the tokens. */
export function updateStoredGroup(slug: string, patch: Partial<Pick<StoredGroup, 'title' | 'exchangeDate'>>) {
  const store = readStore();
  const previous = store.groups[slug];
  if (!previous) return;
  const changed = (Object.keys(patch) as (keyof typeof patch)[]).some((key) => previous[key] !== patch[key]);
  if (!changed) return;
  writeStore({...store, groups: {...store.groups, [slug]: {...previous, ...patch}}});
}

/** Drops the participant token only (e.g. the host removed this person, or the link is invalid). */
export function forgetParticipantToken(slug: string) {
  const store = readStore();
  const previous = store.groups[slug];
  if (!previous?.participantToken) return;
  const next = {...previous};
  delete next.participantToken;
  if (!next.hostToken) {
    forgetGroup(slug);
    return;
  }
  writeStore({...store, groups: {...store.groups, [slug]: next}});
}

export function forgetGroup(slug: string) {
  const store = readStore();
  const groups = {...store.groups};
  delete groups[slug];
  writeStore({...store, groups});
}

/** "My groups", most recent first. */
export function listMyGroups(): StoredGroup[] {
  return Object.values(readStore().groups).sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

// Theme choice (src/lib/theme.ts). Its own key, read before the first paint by the inline script.

export function readThemeChoice(): ThemeChoice {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(value) ? value : 'auto';
  } catch {
    return 'auto';
  }
}

/** "auto" removes the key: the device decides again. */
export function writeThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === 'auto') window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Nothing to do: this browser can't keep the choice, so the device setting stays in charge.
  }
}
