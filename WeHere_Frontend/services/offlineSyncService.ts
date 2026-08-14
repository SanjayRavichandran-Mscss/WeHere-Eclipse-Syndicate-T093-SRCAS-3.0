import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDB, initDatabase, isDatabaseInitialized } from './database';

const API_BASE_URL = ' http://192.168.137.1:5000/api';

export interface EmergencyContact {
  id?: number;
  user_id?: number;
  contact_name: string;
  contact_number: string;
  country_code: string;
  status?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  data?: any;
}

// Initialize the database with a check
let dbInitPromise: Promise<any> | null = null;

export const initializeOfflineDB = async () => {
  try {
    if (!dbInitPromise) {
      console.log('🔄 Creating database initialization promise...');
      dbInitPromise = initDatabase();
    }
    const result = await dbInitPromise;
    console.log('✅ Database initialization promise resolved');
    return result;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    dbInitPromise = null; // Reset so we can retry
    throw error;
  }
};

// Ensure database is initialized before any operation
const ensureDatabase = async () => {
  try {
    if (!isDatabaseInitialized()) {
      console.log('🔄 Database not initialized, initializing now...');
      await initializeOfflineDB();
    }
    console.log('✅ Database ready');
    return getDB();
  } catch (error) {
    console.error('❌ Failed to ensure database:', error);
    throw error;
  }
};

// Get local contacts for a user
export const getLocalContacts = async (userId: number): Promise<EmergencyContact[]> => {
  try {
    console.log(`📂 Getting local contacts for user ${userId}...`);
    const db = await ensureDatabase();
    const result = await db.getAllAsync(
      `SELECT id, contact_name, contact_number, country_code, created_at, updated_at 
       FROM sos_emergency_contact 
       WHERE user_id = ? AND status = 1 
       ORDER BY created_at DESC`,
      [userId]
    );
    console.log(`✅ Found ${result.length} contacts`);
    return result as EmergencyContact[];
  } catch (error) {
    console.error('❌ Failed to get local contacts:', error);
    return [];
  }
};

// Store contacts locally (bulk)
export const storeContactsLocally = async (userId: number, contacts: EmergencyContact[]): Promise<void> => {
  try {
    console.log(`💾 Storing ${contacts.length} contacts locally...`);
    const db = await ensureDatabase();
    
    // Begin transaction
    await db.execAsync('BEGIN TRANSACTION;');
    
    try {
      // Soft delete all existing contacts for this user
      await db.runAsync(
        'UPDATE sos_emergency_contact SET status = 0 WHERE user_id = ?',
        [userId]
      );
      
      // Insert new contacts
      for (const contact of contacts) {
        await db.runAsync(
          `INSERT INTO sos_emergency_contact 
            (user_id, contact_name, contact_number, country_code, status, created_at, updated_at) 
           VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId, contact.contact_name, contact.contact_number, contact.country_code]
        );
      }
      
      await db.execAsync('COMMIT;');
      console.log(`✅ Stored ${contacts.length} contacts locally for user ${userId}`);
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  } catch (error) {
    console.error('❌ Failed to store contacts locally:', error);
    throw error;
  }
};

// Sync contacts with server
export const syncContacts = async (userId: number): Promise<SyncResult> => {
  try {
    console.log('🔄 Starting sync for user:', userId);
    
    // Ensure database is initialized
    await ensureDatabase();
    
    // Get last sync timestamp
    const lastSyncKey = `last_sync_${userId}`;
    const lastSync = await AsyncStorage.getItem(lastSyncKey);
    const timestamp = lastSync || new Date(0).toISOString();
    
    // Get local contacts
    const localContacts = await getLocalContacts(userId);
    
    // Sync with server
    const response = await fetch(`${API_BASE_URL}/offline/contacts/${userId}/sync`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contacts: localContacts.map(c => ({
          id: c.id,
          contact_name: c.contact_name,
          contact_number: c.contact_number,
          country_code: c.country_code,
        })),
        lastSyncTimestamp: timestamp,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📡 Sync response received');
    
    if (data.success) {
      // Store updated contacts locally
      await storeContactsLocally(userId, data.data.contacts);
      
      // Update last sync timestamp
      await AsyncStorage.setItem(lastSyncKey, data.data.syncTimestamp);
      console.log('✅ Sync completed successfully');
      
      return {
        success: true,
        message: 'Sync completed successfully',
        data: data.data,
      };
    } else {
      console.error('❌ Sync failed:', data.message);
      return {
        success: false,
        message: data.message || 'Sync failed',
      };
    }
  } catch (error) {
    console.error('❌ Sync error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Sync failed',
    };
  }
};

// Add or update a contact locally
export const upsertLocalContact = async (
  userId: number,
  contact: EmergencyContact
): Promise<EmergencyContact> => {
  try {
    console.log(`💾 Upserting contact for user ${userId}...`);
    const db = await ensureDatabase();
    let contactId = contact.id;
    
    if (contactId) {
      // Update existing contact
      await db.runAsync(
        `UPDATE sos_emergency_contact SET 
          contact_name = ?, 
          contact_number = ?, 
          country_code = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [contact.contact_name, contact.contact_number, contact.country_code, contactId, userId]
      );
      console.log('✅ Contact updated locally:', contactId);
    } else {
      // Insert new contact
      const result = await db.runAsync(
        `INSERT INTO sos_emergency_contact 
          (user_id, contact_name, contact_number, country_code, status) 
         VALUES (?, ?, ?, ?, 1)`,
        [userId, contact.contact_name, contact.contact_number, contact.country_code]
      );
      contactId = result.lastInsertRowId;
      console.log('✅ New contact inserted locally:', contactId);
    }
    
    return {
      ...contact,
      id: contactId,
    };
  } catch (error) {
    console.error('❌ Failed to upsert contact:', error);
    throw error;
  }
};

// Delete a contact locally (soft delete)
export const deleteLocalContact = async (userId: number, contactId: number): Promise<void> => {
  try {
    console.log(`🗑️ Deleting contact ${contactId} for user ${userId}...`);
    const db = await ensureDatabase();
    await db.runAsync(
      'UPDATE sos_emergency_contact SET status = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [contactId, userId]
    );
    console.log('✅ Contact soft-deleted locally:', contactId);
  } catch (error) {
    console.error('❌ Failed to delete contact:', error);
    throw error;
  }
};

// Sync a single contact immediately (for real-time updates)
export const syncSingleContact = async (userId: number, contactId: number): Promise<SyncResult> => {
  try {
    console.log(`🔄 Syncing single contact ${contactId}...`);
    await ensureDatabase();
    
    const response = await fetch(`${API_BASE_URL}/offline/contacts/${userId}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Update local contact with latest server data
      const db = getDB();
      const serverContact = data.data;
      
      await db.runAsync(
        `UPDATE sos_emergency_contact SET 
          contact_name = ?, 
          contact_number = ?, 
          country_code = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [serverContact.contact_name, serverContact.contact_number, serverContact.country_code, contactId, userId]
      );
      
      return {
        success: true,
        message: 'Contact synced successfully',
        data: serverContact,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Sync failed',
      };
    }
  } catch (error) {
    console.error('❌ Sync single contact error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Sync failed',
    };
  }
};

// Get sync status for a user
export const getSyncStatus = async (userId: number): Promise<any> => {
  try {
    console.log(`📊 Getting sync status for user ${userId}...`);
    await ensureDatabase();
    
    const lastSyncKey = `last_sync_${userId}`;
    const lastSync = await AsyncStorage.getItem(lastSyncKey);
    const localContacts = await getLocalContacts(userId);
    
    return {
      lastSync: lastSync || 'Never synced',
      localCount: localContacts.length,
      isSynced: !!lastSync,
    };
  } catch (error) {
    console.error('❌ Failed to get sync status:', error);
    return {
      lastSync: 'Never synced',
      localCount: 0,
      isSynced: false,
    };
  }
};

// Force full sync (download all contacts from server)
export const forceFullSync = async (userId: number): Promise<SyncResult> => {
  try {
    console.log('🔄 Starting full sync for user:', userId);
    
    await ensureDatabase();
    
    // Clear local sync timestamp to force full sync
    const lastSyncKey = `last_sync_${userId}`;
    await AsyncStorage.removeItem(lastSyncKey);
    
    // Perform sync
    return await syncContacts(userId);
  } catch (error) {
    console.error('❌ Full sync failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Full sync failed',
    };
  }
};

// Export database for debugging
export const exportDatabase = async (): Promise<string> => {
  try {
    console.log('📤 Exporting database...');
    const db = await ensureDatabase();
    const contacts = await db.getAllAsync('SELECT * FROM sos_emergency_contact');
    console.log(`✅ Exported ${contacts.length} contacts`);
    return JSON.stringify(contacts, null, 2);
  } catch (error) {
    console.error('❌ Failed to export database:', error);
    return '[]';
  }
};