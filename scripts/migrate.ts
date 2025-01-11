import { config } from 'dotenv';
import path from 'path';
import { createAdapter } from '../server/db';
import { runMigrations } from '../server/db/migrations';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

async function migrate() {
  console.log('Starting migration process...');
  try {
    const adapter = await createAdapter({ autoMigrate: false });
    console.log('Database adapter created');
    
    await runMigrations(adapter.getDatabase());
    console.log('Migrations completed successfully');
    
    await adapter.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 