'use client';

import {useSyncExternalStore} from 'react';
import {getStoredGroup, readStore, subscribeToStore, type StoredGroup} from '@/lib/device-store';

/**
 * What this device knows about a group (host and participant tokens), kept in sync with the
 * device store. `null` on the server and before hydration, `undefined` when this device never
 * opened the group. Wait for `null` to pass before deciding anything.
 */
export function useStoredGroup(slug: string): StoredGroup | undefined | null {
  return useSyncExternalStore(
    subscribeToStore,
    () => getStoredGroup(slug),
    () => null,
  );
}

/** Every group this device knows. `null` on the server and before hydration. */
export function useMyGroups(): Record<string, StoredGroup> | null {
  return useSyncExternalStore(
    subscribeToStore,
    () => readStore().groups,
    () => null,
  );
}
