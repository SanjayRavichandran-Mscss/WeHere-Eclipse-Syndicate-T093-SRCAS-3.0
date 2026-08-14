import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  // If already initialized, return the db
  if (isInitialized && db) {
    console.log('✅ Database already initialized');
    return db;
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    console.log('⏳ Database initialization already in progress, waiting...');
    return await initPromise;
  }

  // Start initialization
  console.log('🔄 Initializing database...');
  initPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync('wehere_offline.db');

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sos_emergency_contact (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          contact_name TEXT NOT NULL,
          contact_number TEXT NOT NULL,
          country_code TEXT DEFAULT '+91',
          status INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, contact_number, country_code)
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_id ON sos_emergency_contact(user_id);
        CREATE INDEX IF NOT EXISTS idx_status ON sos_emergency_contact(status);
        
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          last_sync_timestamp DATETIME,
          sync_status TEXT DEFAULT 'pending',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        );
      `);

      isInitialized = true;
      console.log('✅ Offline database initialized successfully');
      return db;
    } catch (error) {
      console.error('❌ Failed to initialize offline database:', error);
      // Reset promise so we can retry
      initPromise = null;
      throw error;
    }
  })();

  return await initPromise;
};

export const getDB = (): SQLite.SQLiteDatabase => {
  if (!db || !isInitialized) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

export const isDatabaseInitialized = (): boolean => {
  return isInitialized && db !== null;
};

// Reset database (for testing/debugging)
export const resetDatabase = async () => {
  try {
    if (db) {
      await db.closeAsync();
      db = null;
      isInitialized = false;
      initPromise = null;
    }
    console.log('🔄 Database reset successfully');
  } catch (error) {
    console.error('❌ Failed to reset database:', error);
    throw error;
  }
};

// Check if a table exists
export const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    const database = getDB();
    const result = await database.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return result.length > 0;
  } catch (error) {
    console.error(`❌ Failed to check table ${tableName}:`, error);
    return false;
  }
};

// Get database version info
export const getDatabaseInfo = async () => {
  try {
    const database = getDB();
    const tables = await database.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    return {
      initialized: isInitialized,
      tables: tables.map((t: any) => t.name),
      count: tables.length,
    };
  } catch (error) {
    console.error('❌ Failed to get database info:', error);
    return null;
  }
};