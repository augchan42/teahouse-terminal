import { Database } from 'sqlite';
import { Pool } from 'pg';

export async function up(db: Database | Pool) {
  if ('run' in db) {
    // SQLite
    await db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT CHECK(status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
        error_message TEXT,
        batch INTEGER,
        duration_ms INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        topic TEXT,
        tags TEXT,
        created_at TEXT,
        message_count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_id TEXT REFERENCES rooms(id),
        content TEXT,
        sender_username TEXT,
        sender_model TEXT,
        timestamp TEXT
      );

      CREATE TABLE IF NOT EXISTS participants (
        room_id TEXT,
        username TEXT,
        model TEXT,
        PRIMARY KEY (room_id, username),
        FOREIGN KEY (room_id) REFERENCES rooms(id)
      );
    `);
  } else {
    // PostgreSQL
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status TEXT CHECK(status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
        error_message TEXT,
        batch INTEGER,
        duration_ms INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        topic TEXT,
        tags JSONB,
        created_at TIMESTAMP WITH TIME ZONE,
        message_count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_id TEXT REFERENCES rooms(id),
        content TEXT,
        sender_username TEXT,
        sender_model TEXT,
        timestamp TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS participants (
        room_id TEXT,
        username TEXT,
        model TEXT,
        PRIMARY KEY (room_id, username),
        FOREIGN KEY (room_id) REFERENCES rooms(id)
      );
    `);
  }
}

export async function down(db: Database) {
  await db.exec(`
    DROP TABLE IF EXISTS participants;
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS rooms;
  `);
} 