import { Database } from 'sqlite';
import { Pool } from 'pg';

export async function up(db: Database | Pool) {
  if ('run' in db) {
    // SQLite - Simplified syntax
    try {
      await db.exec(`ALTER TABLE rooms ADD COLUMN display_order INTEGER DEFAULT 0;`);
    } catch (e) {
      // Column might already exist, ignore the error
    }
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_rooms_display_order ON rooms(display_order);`);
  } else {
    // PostgreSQL - Original syntax
    await db.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'rooms' AND column_name = 'display_order'
        ) THEN
          ALTER TABLE rooms ADD COLUMN display_order INTEGER DEFAULT 0;
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS idx_rooms_display_order ON rooms(display_order);
    `);
  }
} 