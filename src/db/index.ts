import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import * as schema from './schema';

function resolveDbPath() {
  const envPath = process.env.DATABASE_URL?.replace('file:', '');
  if (envPath) {
    if (path.isAbsolute(envPath)) return envPath;
    return path.resolve(/*turbopackIgnore: true*/ process.cwd(), envPath);
  }
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), './data/outline.db');
}

const dbPath = resolveDbPath();
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
