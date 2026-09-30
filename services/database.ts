import type { SQLiteDatabase } from 'expo-sqlite';

import type { PantryItem, ScannedItem } from '@/types/pantry';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pantry_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity TEXT NOT NULL,
      dateAddedTimestamp INTEGER NOT NULL,
      expiryTimestamp INTEGER NOT NULL,
      isConsumed INTEGER DEFAULT 0
    );
  `);
}

type PantryItemRow = {
  id: number;
  name: string;
  quantity: string;
  dateAddedTimestamp: number;
  expiryTimestamp: number;
  isConsumed: number;
};

function rowToPantryItem(row: PantryItemRow): PantryItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
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

export async function insertScannedItems(db: SQLiteDatabase, items: ScannedItem[]) {
  const now = Date.now();
  for (const item of items) {
    const expiryTimestamp = now + item.estimated_shelf_life_days * DAY_MS;
    await db.runAsync(
      'INSERT INTO pantry_items (name, quantity, dateAddedTimestamp, expiryTimestamp, isConsumed) VALUES (?, ?, ?, ?, 0)',
      [item.name, item.quantity, now, expiryTimestamp]
    );
  }
}

export async function markConsumed(db: SQLiteDatabase, id: number) {
  await db.runAsync('UPDATE pantry_items SET isConsumed = 1 WHERE id = ?', [id]);
}

export async function deletePantryItem(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM pantry_items WHERE id = ?', [id]);
}
