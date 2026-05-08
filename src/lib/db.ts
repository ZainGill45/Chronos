import * as SQLite from 'expo-sqlite';

import { DAY_MS } from './time';

export type Entry = {
  hourStart: number;
  word: string;
  createdAt: number;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('chronos.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS entries (
          hour_start INTEGER PRIMARY KEY,
          word       TEXT    NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function initDb(): Promise<void> {
  await getDb();
}

export async function upsertEntry(hourStart: number, word: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO entries (hour_start, word, created_at) VALUES (?, ?, ?)',
    [hourStart, word, Date.now()]
  );
}

export async function deleteEntry(hourStart: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM entries WHERE hour_start = ?', [hourStart]);
}

export async function getEntry(hourStart: number): Promise<Entry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ hour_start: number; word: string; created_at: number }>(
    'SELECT hour_start, word, created_at FROM entries WHERE hour_start = ?',
    [hourStart]
  );
  if (!row) return null;
  return { hourStart: row.hour_start, word: row.word, createdAt: row.created_at };
}

export async function getEntriesForDay(dayStart: number): Promise<Entry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ hour_start: number; word: string; created_at: number }>(
    'SELECT hour_start, word, created_at FROM entries WHERE hour_start >= ? AND hour_start < ? ORDER BY hour_start DESC',
    [dayStart, dayStart + DAY_MS]
  );
  return rows.map((r) => ({ hourStart: r.hour_start, word: r.word, createdAt: r.created_at }));
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}
