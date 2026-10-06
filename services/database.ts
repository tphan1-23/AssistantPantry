import type { FavoriteRecipe, PantryItem, Recipe, ScannedItem } from '@/types/pantry';
import { supabase } from '@/services/supabase';

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long a removed/used item stays restorable in History before being purged for good. */
export const HISTORY_RETENTION_MS = DAY_MS;

// Schema lives in Supabase (see supabase/schema.sql), scoped per-user via Row
// Level Security - there's no local migration step to run here any more.

type PantryItemRow = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  date_added_timestamp: number;
  expiry_timestamp: number;
  is_consumed: boolean;
  removed_at_timestamp: number | null;
  removed_reason: string | null;
};

function rowToPantryItem(row: PantryItemRow): PantryItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    dateAddedTimestamp: row.date_added_timestamp,
    expiryTimestamp: row.expiry_timestamp,
    isConsumed: row.is_consumed,
    removedAtTimestamp: row.removed_at_timestamp,
    removedReason: row.removed_reason as PantryItem['removedReason'],
  };
}

type PostgrestLikeResult<T> = { data: T | null; error: { message: string } | null };

function assertSuccess(result: PostgrestLikeResult<unknown>) {
  if (result.error) throw new Error(result.error.message);
}

/** For queries that always return data on success (selects, insert().select()). */
function unwrap<T>(result: PostgrestLikeResult<T>): T {
  assertSuccess(result);
  return result.data as T;
}

/** For queries where "no row" is a real, non-error outcome (maybeSingle()). */
function unwrapNullable<T>(result: PostgrestLikeResult<T>): T | null {
  assertSuccess(result);
  return result.data;
}

export async function getAllItems(): Promise<PantryItem[]> {
  const result = await supabase
    .from('pantry_items')
    .select('*')
    .is('removed_at_timestamp', null)
    .order('expiry_timestamp', { ascending: true });
  return unwrap(result).map(rowToPantryItem);
}

export async function getExpiringItems(withinHours = 72): Promise<PantryItem[]> {
  const now = Date.now();
  const cutoff = now + withinHours * 60 * 60 * 1000;
  // Lower bound excludes items that have already expired - this is meant to
  // be a "use it soon" list (e.g. recipe generation), not a "this is already
  // spoiled" list. Already-expired items still show up fine elsewhere, e.g.
  // the Pantry tab's own "Expired" label via PantryItemCard.
  const result = await supabase
    .from('pantry_items')
    .select('*')
    .is('removed_at_timestamp', null)
    .gte('expiry_timestamp', now)
    .lte('expiry_timestamp', cutoff)
    .order('expiry_timestamp', { ascending: true });
  return unwrap(result).map(rowToPantryItem);
}

/** Computes an expiry timestamp for a scanned item: prefer a real printed date, else an estimate. */
export function expiryTimestampForScannedItem(item: ScannedItem, now = Date.now()): number {
  if (item.expiry_date) {
    const parsed = new Date(`${item.expiry_date}T00:00:00`).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }
  const days = item.estimated_shelf_life_days ?? 7;
  return now + days * DAY_MS;
}

export async function insertItem(item: {
  name: string;
  quantity: number;
  unit: string;
  expiryTimestamp: number;
}): Promise<number> {
  const result = await supabase
    .from('pantry_items')
    .insert({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      date_added_timestamp: Date.now(),
      expiry_timestamp: item.expiryTimestamp,
    })
    .select('id')
    .single();
  return unwrap(result).id;
}

export async function incrementQuantity(id: number, amount: number) {
  const result = await supabase.rpc('increment_item_quantity', { p_id: id, p_amount: amount });
  assertSuccess(result);
}

export async function updateItem(
  id: number,
  item: { name: string; quantity: number; unit: string; expiryTimestamp: number }
) {
  const result = await supabase
    .from('pantry_items')
    .update({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      expiry_timestamp: item.expiryTimestamp,
    })
    .eq('id', id);
  assertSuccess(result);
}

export async function getItemById(id: number): Promise<PantryItem | null> {
  const result = await supabase.from('pantry_items').select('*').eq('id', id).maybeSingle();
  const row = unwrapNullable(result);
  return row ? rowToPantryItem(row) : null;
}

export async function markConsumed(id: number) {
  const result = await supabase
    .from('pantry_items')
    .update({ is_consumed: true, removed_at_timestamp: Date.now(), removed_reason: 'used' })
    .eq('id', id);
  assertSuccess(result);
}

/** Soft-removes an item: it leaves the Pantry list but sits in History, restorable, for 24 hours. */
export async function removeItem(id: number) {
  const result = await supabase
    .from('pantry_items')
    .update({ removed_at_timestamp: Date.now(), removed_reason: 'removed' })
    .eq('id', id);
  assertSuccess(result);
}

export async function restoreItem(id: number) {
  const result = await supabase
    .from('pantry_items')
    .update({ removed_at_timestamp: null, removed_reason: null, is_consumed: false })
    .eq('id', id);
  assertSuccess(result);
}

export async function getHistoryItems(): Promise<PantryItem[]> {
  const cutoff = Date.now() - HISTORY_RETENTION_MS;
  const result = await supabase
    .from('pantry_items')
    .select('*')
    .not('removed_at_timestamp', 'is', null)
    .gte('removed_at_timestamp', cutoff)
    .order('removed_at_timestamp', { ascending: false });
  return unwrap(result).map(rowToPantryItem);
}

/** Permanently deletes anything that's sat in History past the 24-hour restore window. */
export async function purgeExpiredHistory() {
  const cutoff = Date.now() - HISTORY_RETENTION_MS;
  const result = await supabase
    .from('pantry_items')
    .delete()
    .not('removed_at_timestamp', 'is', null)
    .lt('removed_at_timestamp', cutoff);
  assertSuccess(result);
}

/** Deletes a History item right away instead of waiting out the 24-hour window. */
export async function permanentlyDeleteItem(id: number) {
  const result = await supabase.from('pantry_items').delete().eq('id', id);
  assertSuccess(result);
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents (e.g. "Bò" -> "Bo") before comparing
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Below this length, raw substring/word matching is too easy to trigger by
// coincidence (e.g. "Bo" matching inside "Bottled Water"), so such short
// names are only ever matched exactly, never fuzzily.
const MIN_FUZZY_MATCH_LENGTH = 3;

/** Heuristic match for "is this the same product already in the pantry?" */
export function findMatchingItem(items: PantryItem[], name: string): PantryItem | null {
  const normalized = normalizeName(name);
  if (!normalized) return null;

  const exact = items.find((item) => normalizeName(item.name) === normalized);
  if (exact) return exact;

  if (normalized.length < MIN_FUZZY_MATCH_LENGTH) return null;
  const scannedWords = new Set(normalized.split(' ').filter(Boolean));

  return (
    items.find((item) => {
      const itemNormalized = normalizeName(item.name);
      if (itemNormalized.length < MIN_FUZZY_MATCH_LENGTH) return false;

      const itemWords = itemNormalized.split(' ').filter(Boolean);
      // Whole-word containment only (never a raw substring match), so a
      // short word can't accidentally match inside an unrelated longer one.
      return itemWords.every((w) => scannedWords.has(w)) || [...scannedWords].every((w) => itemWords.includes(w));
    }) ?? null
  );
}

type FavoriteRecipeRow = {
  id: number;
  title: string;
  urgent_ingredients_used: string[];
  additional_ingredients: string[];
  instructions: string[];
};

function rowToFavoriteRecipe(row: FavoriteRecipeRow): FavoriteRecipe {
  return {
    id: row.id,
    title: row.title,
    urgentIngredientsUsed: row.urgent_ingredients_used,
    additionalIngredients: row.additional_ingredients,
    instructions: row.instructions,
  };
}

export async function getFavoriteRecipes(): Promise<FavoriteRecipe[]> {
  const result = await supabase
    .from('favorite_recipes')
    .select('*')
    .order('created_at', { ascending: false });
  return unwrap(result).map(rowToFavoriteRecipe);
}

export async function addFavoriteRecipe(recipe: Recipe): Promise<number> {
  const result = await supabase
    .from('favorite_recipes')
    .insert({
      title: recipe.title,
      urgent_ingredients_used: recipe.urgentIngredientsUsed,
      additional_ingredients: recipe.additionalIngredients,
      instructions: recipe.instructions,
    })
    .select('id')
    .single();
  return unwrap(result).id;
}

export async function removeFavoriteRecipe(id: number) {
  const result = await supabase.from('favorite_recipes').delete().eq('id', id);
  assertSuccess(result);
}
