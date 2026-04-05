import dotenv from 'dotenv';
import MongoDBProvider from './MongoDBProvider.js';
import SupabaseProvider from './SupabaseProvider.js';

dotenv.config();

/** Factory: returns a DatabaseProvider based on process.env.DB_TYPE. */
function createDatabaseProvider() {
  const type = (process.env.DB_TYPE || '').toLowerCase().trim();

  if (type === 'mongodb' || type === 'mongo') {
    return new MongoDBProvider();
  }

  if (type === 'supabase') {
    return new SupabaseProvider();
  }

  throw new Error(
    `Invalid or missing DB_TYPE "${process.env.DB_TYPE}". Use "mongodb" or "supabase".`
  );
}

export { createDatabaseProvider };
