import type { SQLiteDatabase } from 'expo-sqlite';

import type { PantryItem, ScannedItem } from '@/types/pantry';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pantry_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'item',
      dateAddedTimestamp INTEGER NOT NULL,
      expiryTimestamp INTEGER NOT NULL,
      isConsumed INTEGER DEFAULT 0
    );
  `);
}

type PantryItemRow = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  dateAddedTimestamp: number;
  expiryTimestamp: number;
  isConsumed: number;
};

function rowToPantryItem(row: PantryItemRow): PantryItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    dateAddedTimestamp: row.dateAddedTimestamp,
    expiryTimestamp: row.expiryTimestamp,
    isConsumed: row.isConsumed !== 0,
  };
}

export async function getAllItems(db: SQLiteDatabase): Promise<PantryItem[]> {
  const rows = await db.getAllAsync<PantryItemRow>(
    'SELECT * FROM pantry_items WHERE isConsumed = 0 ORDER BY expiryTimestamp ASC'
  );
  return rows.map(rowToPantryItem);
}

export async function getExpiringItems(
  db: SQLiteDatabase,
  withinHours = 72
): Promise<PantryItem[]> {
  const cutoff = Date.now() + withinHours * 60 * 60 * 1000;
  const rows = await db.getAllAsync<PantryItemRow>(
    'SELECT * FROM pantry_items WHERE isConsumed = 0 AND expiryTimestamp <= ? ORDER BY expiryTimestamp ASC',
    [cutoff]
  );
  return rows.map(rowToPantryItem);
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

export async function insertItem(
  db: SQLiteDatabase,
  item: { name: string; quantity: number; unit: string; expiryTimestamp: number }
): Promise<number> {
  const now = Date.now();
  const result = await db.runAsync(
    'INSERT INTO pantry_items (name, quantity, unit, dateAddedTimestamp, expiryTimestamp, isConsumed) VALUES (?, ?, ?, ?, ?, 0)',
    [item.name, item.quantity, item.unit, now, item.expiryTimestamp]
  );
  return result.lastInsertRowId;
}

export async function incrementQuantity(db: SQLiteDatabase, id: number, amount: number) {
  await db.runAsync('UPDATE pantry_items SET quantity = quantity + ? WHERE id = ?', [amount, id]);
}

export async function updateItem(
  db: SQLiteDatabase,
  id: number,
  item: { name: string; quantity: number; unit: string; expiryTimestamp: number }
) {
  await db.runAsync(
    'UPDATE pantry_items SET name = ?, quantity = ?, unit = ?, expiryTimestamp = ? WHERE id = ?',
    [item.name, item.quantity, item.unit, item.expiryTimestamp, id]
  );
}

export async function getItemById(db: SQLiteDatabase, id: number): Promise<PantryItem | null> {
  const row = await db.getFirstAsync<PantryItemRow>('SELECT * FROM pantry_items WHERE id = ?', [
    id,
  ]);
  return row ? rowToPantryItem(row) : null;
}

export async function markConsumed(db: SQLiteDatabase, id: number) {
  await db.runAsync('UPDATE pantry_items SET isConsumed = 1 WHERE id = ?', [id]);
}

export async function deletePantryItem(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM pantry_items WHERE id = ?', [id]);
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/** Heuristic match for "is this the same product already in the pantry?" */
export function findMatchingItem(items: PantryItem[], name: string): PantryItem | null {
  const normalized = normalizeName(name);
  if (!normalized) return null;

  const exact = items.find((item) => normalizeName(item.name) === normalized);
  if (exact) return exact;

  return (
    items.find((item) => {
      const itemNormalized = normalizeName(item.name);
      return itemNormalized.includes(normalized) || normalized.includes(itemNormalized);
    }) ?? null
  );
}
