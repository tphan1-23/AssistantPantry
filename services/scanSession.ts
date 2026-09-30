import type { ScannedItem } from '@/types/pantry';

// Transient in-memory handoff between the Scan screen and the Review screen.
// Never persisted; the JS runtime stays alive across Expo Router navigation
// within a single app session, so a module-level variable is sufficient.
let pendingScan: ScannedItem[] | null = null;

export function setPendingScan(items: ScannedItem[]) {
  pendingScan = items;
}

export function takePendingScan(): ScannedItem[] | null {
  const items = pendingScan;
  pendingScan = null;
  return items;
}
