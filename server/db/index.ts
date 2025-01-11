import { DatabaseAdapter } from './types';
import { SQLiteAdapter } from './sqlite';
import { PostgresAdapter } from './postgres';
import { runMigrations } from './migrations';

export async function createAdapter(options = { autoMigrate: false }): Promise<DatabaseAdapter> {
  if (!process.env.DATABASE_TYPE) {
    console.warn('DATABASE_TYPE not set, defaulting to SQLite');
  }
  
  const adapter = process.env.DATABASE_TYPE?.toLowerCase() === 'postgres'
    ? new PostgresAdapter()
    : new SQLiteAdapter();
    
  console.log(`Initializing ${process.env.DATABASE_TYPE || 'sqlite'} adapter`);
  await adapter.initialize();
  
  return adapter;
}

export type { DatabaseAdapter };
export { SQLiteAdapter, PostgresAdapter }; 