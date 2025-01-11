import { Database } from 'sqlite';
import { Pool } from 'pg';

export async function up(db: Database | Pool) {
  console.log('Running content metadata migration...');
  
  if ('run' in db) {
    console.log('SQLite: Adding content columns');
    try {
      await db.exec('ALTER TABLE messages ADD COLUMN content_type TEXT DEFAULT "text"');
      await db.exec('ALTER TABLE messages ADD COLUMN content_metadata TEXT');
      console.log('Added content columns');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.log('Columns might already exist:', errorMessage);
    }
  } else {
    console.log('PostgreSQL: Adding content columns');
    await db.query(`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE messages ADD COLUMN content_type TEXT DEFAULT 'text';
          ALTER TABLE messages ADD COLUMN content_metadata JSONB;
        EXCEPTION 
          WHEN duplicate_column THEN 
            NULL;
        END;
      END 
      $$;
    `);
  }
  console.log('Content metadata migration completed');
}

export async function down(db: Database | Pool) {
  if ('run' in db) {
    // SQLite - Note: SQLite doesn't support DROP COLUMN in older versions
    await db.exec(`
      CREATE TABLE messages_new (
        id TEXT PRIMARY KEY,
        room_id TEXT,
        content TEXT,
        sender_username TEXT,
        sender_model TEXT,
        timestamp TEXT,
        FOREIGN KEY(room_id) REFERENCES rooms(id)
      );
      INSERT INTO messages_new SELECT id, room_id, content, sender_username, sender_model, timestamp FROM messages;
      DROP TABLE messages;
      ALTER TABLE messages_new RENAME TO messages;
    `);
  } else {
    // PostgreSQL
    await db.query(`
      ALTER TABLE messages 
        DROP COLUMN IF EXISTS content_type,
        DROP COLUMN IF EXISTS content_metadata;
    `);
  }
} 