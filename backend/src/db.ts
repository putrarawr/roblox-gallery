import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

// Ensure data and upload directories exist
const dataDir = path.dirname(config.dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(config.localUploadDir)) {
  fs.mkdirSync(config.localUploadDir, { recursive: true });
}

// Initialize SQLite database
export const db = new DatabaseSync(config.dbPath);

// Enable WAL mode for high performance concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Run schema migration according to PRD
db.exec(`
  CREATE TABLE IF NOT EXISTS screenshots (
    id TEXT PRIMARY KEY,
    image_url TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    place_id TEXT,
    place_name TEXT DEFAULT 'unknown place',
    file_size_bytes INTEGER,
    captured_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_screenshots_place_id ON screenshots(place_id);
  CREATE INDEX IF NOT EXISTS idx_screenshots_captured_at ON screenshots(captured_at DESC);
`);

export interface ScreenshotRecord {
  id: string;
  image_url: string;
  storage_key: string;
  place_id: string | null;
  place_name: string;
  file_size_bytes: number;
  captured_at: string;
}

export const dbService = {
  insertScreenshot(record: ScreenshotRecord): void {
    const stmt = db.prepare(`
      INSERT INTO screenshots (id, image_url, storage_key, place_id, place_name, file_size_bytes, captured_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.id,
      record.image_url,
      record.storage_key,
      record.place_id,
      record.place_name,
      record.file_size_bytes,
      record.captured_at
    );
  },

  getScreenshotById(id: string): ScreenshotRecord | undefined {
    const stmt = db.prepare('SELECT * FROM screenshots WHERE id = ?');
    return stmt.get(id) as ScreenshotRecord | undefined;
  },

  listScreenshots(options: {
    limit?: number;
    cursor?: string;
    placeId?: string;
  }): { items: ScreenshotRecord[]; nextCursor: string | null; totalCount: number } {
    const limit = Math.min(Math.max(options.limit || 20, 1), 100);
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.placeId && options.placeId.trim() !== '') {
      conditions.push('place_id = ?');
      params.push(options.placeId.trim());
    }

    if (options.cursor && options.cursor.trim() !== '') {
      conditions.push('captured_at < ?');
      params.push(options.cursor.trim());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count for the filter
    const countQuery = options.placeId && options.placeId.trim() !== ''
      ? 'SELECT COUNT(*) as count FROM screenshots WHERE place_id = ?'
      : 'SELECT COUNT(*) as count FROM screenshots';
    const countParams = options.placeId && options.placeId.trim() !== '' ? [options.placeId.trim()] : [];
    const countResult = db.prepare(countQuery).get(...countParams) as { count: number };
    const totalCount = countResult ? countResult.count : 0;

    // Fetch items with limit + 1 to detect hasMore
    const query = `
      SELECT * FROM screenshots
      ${whereClause}
      ORDER BY captured_at DESC
      LIMIT ?
    `;
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params) as unknown as ScreenshotRecord[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].captured_at : null;

    return {
      items,
      nextCursor,
      totalCount
    };
  },

  getUniquePlaces(): Array<{ place_id: string | null; place_name: string; count: number; latest_captured_at: string }> {
    const query = `
      SELECT 
        place_id, 
        place_name, 
        COUNT(*) as count, 
        MAX(captured_at) as latest_captured_at
      FROM screenshots
      GROUP BY COALESCE(place_id, place_name)
      ORDER BY latest_captured_at DESC
    `;
    return db.prepare(query).all() as any[];
  },

  getStats(): { totalScreenshots: number; totalPlaces: number; totalBytes: number } {
    const row = db.prepare(`
      SELECT 
        COUNT(*) as totalScreenshots,
        COUNT(DISTINCT COALESCE(place_id, place_name)) as totalPlaces,
        COALESCE(SUM(file_size_bytes), 0) as totalBytes
      FROM screenshots
    `).get() as any;

    return {
      totalScreenshots: row?.totalScreenshots || 0,
      totalPlaces: row?.totalPlaces || 0,
      totalBytes: row?.totalBytes || 0
    };
  },

  deleteScreenshot(id: string): ScreenshotRecord | undefined {
    const existing = this.getScreenshotById(id);
    if (!existing) return undefined;
    db.prepare('DELETE FROM screenshots WHERE id = ?').run(id);
    return existing;
  }
};
