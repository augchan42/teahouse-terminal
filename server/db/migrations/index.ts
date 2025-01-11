import { Database } from 'sqlite';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

export async function runMigrations(db: Database | Pool) {
  // Default to development if NODE_ENV isn't set
  const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  
  // Drop existing migrations table in development
  // if (isDevelopment) {
  //   console.log('Development mode: Dropping existing migrations table');
  //   if ('run' in db) {
  //     await db.exec('DROP TABLE IF EXISTS migrations');
  //   } else {
  //     await db.query('DROP TABLE IF EXISTS migrations');
  //   }
  // }

  // Create migrations table
  if ('run' in db) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT,
        name TEXT NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT CHECK(status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
        error_message TEXT,
        batch INTEGER DEFAULT 1,
        duration_ms INTEGER,
        PRIMARY KEY (id, executed_at)
      )
    `);
  } else {
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT,
        name TEXT NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status TEXT CHECK(status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
        error_message TEXT,
        batch INTEGER,
        duration_ms INTEGER,
        PRIMARY KEY (id, executed_at)
      )
    `);
  }

  // Get current batch number
  const lastBatch = 'run' in db
    ? await db.get('SELECT MAX(batch) as batch FROM migrations')
    : (await db.query('SELECT MAX(batch) as batch FROM migrations')).rows[0];
    
  const currentBatch = (lastBatch?.batch || 0) + 1;

  // Get all migration files
  const migrationsDir = path.join(__dirname);
  const files = await fs.readdir(migrationsDir);
  const migrationFiles = files
    .filter(f => f.endsWith('.ts') && f !== 'index.ts')
    .sort();

  // Check which migrations have been successful
  const successfulMigrations = 'run' in db 
    ? (await db.all('SELECT id FROM migrations WHERE status = ?', ['success'])).map(r => r.id)
    : (await db.query('SELECT id FROM migrations WHERE status = $1', ['success'])).rows.map(r => r.id);

  console.log('Already completed migrations:', successfulMigrations);

  // Only run migrations that haven't succeeded
  for (const file of migrationFiles) {
    const migrationId = path.parse(file).name;
    
    if (successfulMigrations.includes(migrationId)) {
      console.log(`Skipping completed migration: ${migrationId}`);
      continue;
    }

    const startTime = Date.now();
    
    try {
      // Check if migration was already successful
      const executed = 'run' in db 
        ? await db.get('SELECT id FROM migrations WHERE id = ? AND status = ? ORDER BY executed_at DESC LIMIT 1', [migrationId, 'success'])
        : (await db.query('SELECT id FROM migrations WHERE id = $1 AND status = $2 ORDER BY executed_at DESC LIMIT 1', [migrationId, 'success'])).rows[0];

      if (!executed) {
        console.log(`Running migration: ${migrationId}`);
        
        // Record migration attempt
        if ('run' in db) {
          await db.run(
            'INSERT INTO migrations (id, name, status, batch) VALUES (?, ?, ?, ?)', 
            [migrationId, file, 'pending', currentBatch]
          );
        } else {
          await db.query(
            'INSERT INTO migrations (id, name, status, batch) VALUES ($1, $2, $3, $4)', 
            [migrationId, file, 'pending', currentBatch]
          );
        }

        const migration = require(path.join(migrationsDir, file));
        await migration.up(db);
        
        // Update migration status
        const duration = Date.now() - startTime;
        if ('run' in db) {
          await db.run(
            'UPDATE migrations SET status = ?, duration_ms = ? WHERE id = ?',
            ['success', duration, migrationId]
          );
        } else {
          await db.query(
            'UPDATE migrations SET status = $1, duration_ms = $2 WHERE id = $3',
            ['success', duration, migrationId]
          );
        }
      }
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log the full error details for Postgres
      if (!('run' in db) && 'code' in (error as any)) {
        console.error('PostgreSQL Error Details:', {
          code: (error as any).code,
          detail: (error as any).detail,
          hint: (error as any).hint,
          position: (error as any).position,
          where: (error as any).where,
          schema: (error as any).schema,
          table: (error as any).table,
          column: (error as any).column,
        });
      }

      if ('run' in db) {
        await db.run(
          'UPDATE migrations SET status = ?, error_message = ?, duration_ms = ? WHERE id = ?',
          ['failed', errorMessage, duration, migrationId]
        );
      } else {
        await db.query(
          'UPDATE migrations SET status = $1, error_message = $2, duration_ms = $3 WHERE id = $4',
          ['failed', errorMessage, duration, migrationId]
        );
      }
      throw error;
    }
  }
} 