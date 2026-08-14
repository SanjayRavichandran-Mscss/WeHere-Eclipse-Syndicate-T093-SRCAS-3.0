const { db } = require('../config/db');

// Health check endpoint for offline sync
exports.healthCheck = async (req, res) => {
  try {
    await db.query('SELECT 1');
    
    return res.status(200).json({
      success: true,
      status: 'healthy',
      message: 'Offline sync service is running',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      message: 'Database connection failed',
      error: err.message,
    });
  }
};

// Get all emergency contacts for offline sync
exports.getEmergencyContactsForSync = async (req, res) => {
  const { userId } = req.params;

  try {
    const [contacts] = await db.query(
      `SELECT id, user_id, contact_name, contact_number, country_code, 
              created_at, updated_at, status 
       FROM sos_emergency_contact 
       WHERE user_id = ? AND status = 1`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: contacts,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching contacts for sync:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts for sync',
      error: err.message,
    });
  }
};

// Sync emergency contacts (for insert/update/delete)
exports.syncEmergencyContacts = async (req, res) => {
  const { userId } = req.params;
  const { contacts, lastSyncTimestamp } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required',
    });
  }

  try {
    let updatedContacts = [];
    let newContacts = [];
    let deletedContacts = [];

    // ================================================================
    // STEP 1: Get ALL existing contacts for this user
    // ================================================================
    const [existingContacts] = await db.query(
      `SELECT id, contact_number, status FROM sos_emergency_contact WHERE user_id = ?`,
      [userId]
    );
    
    // Create maps for quick lookup
    const phoneToIdMap = {};
    const phoneToStatusMap = {};
    const idToPhoneMap = {};
    
    existingContacts.forEach(c => {
      phoneToIdMap[c.contact_number] = c.id;
      phoneToStatusMap[c.contact_number] = c.status;
      idToPhoneMap[c.id] = c.contact_number;
    });

    // ================================================================
    // STEP 2: If no contacts sent, return existing
    // ================================================================
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      console.log('⚠️ No contacts in sync request, returning existing contacts');
      const [currentContacts] = await db.query(
        `SELECT id, user_id, contact_name, contact_number, country_code, 
                created_at, updated_at, status 
         FROM sos_emergency_contact 
         WHERE user_id = ? AND status = 1
         ORDER BY id DESC`,
        [userId]
      );
      
      return res.status(200).json({
        success: true,
        message: 'No contacts to sync',
        data: {
          contacts: currentContacts,
          updated: [],
          deleted: [],
          new: [],
          syncTimestamp: new Date().toISOString(),
        },
      });
    }

    // ================================================================
    // STEP 3: Track which contacts are in the request
    // ================================================================
    const requestPhoneNumbers = new Set();
    const requestContactIds = new Set();

    for (const contact of contacts) {
      const cleanNumber = contact.contact_number.replace(/[\s\-()]/g, '');
      requestPhoneNumbers.add(cleanNumber);
      if (contact.id) {
        requestContactIds.add(contact.id);
      }
    }

    // ================================================================
    // STEP 4: Process each contact (UPDATE or INSERT)
    // ================================================================
    for (const contact of contacts) {
      const cleanNumber = contact.contact_number.replace(/[\s\-()]/g, '');
      
      // Check if this phone number exists in database
      const existingId = phoneToIdMap[cleanNumber];
      
      if (existingId) {
        // ================================================================
        // Contact EXISTS - UPDATE it (never insert duplicate)
        // ================================================================
        console.log(`🔄 Updating existing contact: ID ${existingId} (${contact.contact_name})`);
        await db.query(
          `UPDATE sos_emergency_contact SET 
            contact_name = ?, 
            contact_number = ?, 
            country_code = ?,
            status = 1,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND user_id = ?`,
          [contact.contact_name, cleanNumber, contact.country_code, existingId, userId]
        );
        
        updatedContacts.push({
          id: existingId,
          ...contact,
          contact_number: cleanNumber
        });
      } else {
        // ================================================================
        // Contact DOES NOT EXIST - INSERT it
        // ================================================================
        console.log(`➕ Inserting new contact: ${contact.contact_name}`);
        const [result] = await db.query(
          `INSERT INTO sos_emergency_contact 
            (user_id, contact_name, contact_number, country_code, status) 
           VALUES (?, ?, ?, ?, 1)`,
          [userId, contact.contact_name, cleanNumber, contact.country_code]
        );
        
        newContacts.push({
          id: result.insertId,
          ...contact,
          contact_number: cleanNumber
        });
      }
    }

    // ================================================================
    // STEP 5: Handle SOFT DELETES
    // ONLY delete contacts that are ACTIVE and NOT in the request
    // ================================================================
    const [activeContacts] = await db.query(
      `SELECT id, contact_number FROM sos_emergency_contact WHERE user_id = ? AND status = 1`,
      [userId]
    );
    
    const idsToDelete = [];

    for (const activeContact of activeContacts) {
      // Check if this contact is in the request
      const isInRequestByPhone = requestPhoneNumbers.has(activeContact.contact_number);
      const isInRequestById = requestContactIds.has(activeContact.id);
      
      // ONLY delete if NOT found in request by BOTH phone number AND ID
      if (!isInRequestByPhone && !isInRequestById) {
        idsToDelete.push(activeContact.id);
      }
    }

    // Soft delete contacts that are truly missing from the request
    if (idsToDelete.length > 0) {
      console.log(`🗑️ Soft-deleting ${idsToDelete.length} contacts (not in sync request)`);
      const placeholders = idsToDelete.map(() => '?').join(',');
      await db.query(
        `UPDATE sos_emergency_contact SET status = 0, updated_at = CURRENT_TIMESTAMP 
         WHERE id IN (${placeholders}) AND user_id = ?`,
        [...idsToDelete, userId]
      );
      deletedContacts = idsToDelete;
    } else {
      console.log('✅ No contacts to delete');
    }

    // ================================================================
    // STEP 6: Get the current state of all active contacts
    // ================================================================
    const [currentContacts] = await db.query(
      `SELECT id, user_id, contact_name, contact_number, country_code, 
              created_at, updated_at, status 
       FROM sos_emergency_contact 
       WHERE user_id = ? AND status = 1
       ORDER BY id DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Sync completed successfully',
      data: {
        contacts: currentContacts,
        updated: updatedContacts,
        deleted: deletedContacts,
        new: newContacts,
        syncTimestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Error syncing contacts:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to sync contacts',
      error: err.message,
    });
  }
};

// Get only updates since a specific timestamp (for incremental sync)
exports.getContactsSince = async (req, res) => {
  const { userId } = req.params;
  const { timestamp } = req.query;

  try {
    if (!timestamp) {
      const [contacts] = await db.query(
        `SELECT id, user_id, contact_name, contact_number, country_code, 
                created_at, updated_at, status 
         FROM sos_emergency_contact 
         WHERE user_id = ? AND status = 1`,
        [userId]
      );
      return res.status(200).json({
        success: true,
        data: contacts,
        fullSync: true,
      });
    }

    const [contacts] = await db.query(
      `SELECT id, user_id, contact_name, contact_number, country_code, 
              created_at, updated_at, status 
       FROM sos_emergency_contact 
       WHERE user_id = ? AND updated_at > ?`,
      [userId, timestamp]
    );

    return res.status(200).json({
      success: true,
      data: contacts,
      fullSync: false,
      syncTimestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching contacts since timestamp:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
      error: err.message,
    });
  }
};

// Trigger sync for a single contact (when updated/inserted)
exports.triggerSync = async (req, res) => {
  const { userId } = req.params;
  const { contactId } = req.body;

  try {
    const [contact] = await db.query(
      `SELECT id, user_id, contact_name, contact_number, country_code, 
              created_at, updated_at, status 
       FROM sos_emergency_contact 
       WHERE id = ? AND user_id = ? AND status = 1`,
      [contactId, userId]
    );

    if (contact.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: contact[0],
      message: 'Sync trigger successful',
    });
  } catch (err) {
    console.error('Error triggering sync:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger sync',
      error: err.message,
    });
  }
};

// Soft delete a single contact (called when user explicitly deletes)
exports.softDeleteContact = async (req, res) => {
  const { userId } = req.params;
  const { contactId } = req.body;

  if (!contactId) {
    return res.status(400).json({
      success: false,
      message: 'Contact ID is required',
    });
  }

  try {
    // Check if contact exists and belongs to user
    const [existing] = await db.query(
      'SELECT id FROM sos_emergency_contact WHERE id = ? AND user_id = ? AND status = 1',
      [contactId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found or already deleted',
      });
    }

    // Soft delete the contact
    await db.query(
      `UPDATE sos_emergency_contact SET status = 0, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [contactId, userId]
    );

    // Get updated active contacts
    const [currentContacts] = await db.query(
      `SELECT id, user_id, contact_name, contact_number, country_code, 
              created_at, updated_at, status 
       FROM sos_emergency_contact 
       WHERE user_id = ? AND status = 1
       ORDER BY id DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Contact deleted successfully',
      data: {
        deletedId: contactId,
        contacts: currentContacts
      },
    });
  } catch (err) {
    console.error('Error deleting contact:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete contact',
      error: err.message,
    });
  }
};

// Reactivate all contacts for a user (emergency recovery)
exports.reactivateAllContacts = async (req, res) => {
  const { userId } = req.params;

  try {
    // First, delete duplicate entries (keep the latest one)
    await db.query(
      `DELETE FROM sos_emergency_contact 
       WHERE user_id = ? AND id NOT IN (
         SELECT * FROM (
           SELECT MAX(id) 
           FROM sos_emergency_contact 
           WHERE user_id = ? 
           GROUP BY contact_number
         ) AS tmp
       )`,
      [userId, userId]
    );

    // Then reactivate all remaining contacts
    await db.query(
      `UPDATE sos_emergency_contact SET status = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [userId]
    );

    const [contacts] = await db.query(
      `SELECT id, user_id, contact_name, contact_number, country_code, 
              created_at, updated_at, status 
       FROM sos_emergency_contact 
       WHERE user_id = ? AND status = 1
       ORDER BY id DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'All contacts reactivated and duplicates removed successfully',
      data: contacts,
    });
  } catch (err) {
    console.error('Error reactivating contacts:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to reactivate contacts',
      error: err.message,
    });
  }
};

// Clean duplicate entries (utility function)
exports.cleanDuplicates = async (req, res) => {
  const { userId } = req.params;

  try {
    // Find and remove duplicates, keeping the latest one
    const [result] = await db.query(
      `DELETE FROM sos_emergency_contact 
       WHERE user_id = ? AND id NOT IN (
         SELECT * FROM (
           SELECT MAX(id) 
           FROM sos_emergency_contact 
           WHERE user_id = ? 
           GROUP BY contact_number
         ) AS tmp
       )`,
      [userId, userId]
    );

    const [contacts] = await db.query(
      `SELECT id, user_id, contact_name, contact_number, country_code, 
              created_at, updated_at, status 
       FROM sos_emergency_contact 
       WHERE user_id = ? AND status = 1
       ORDER BY id DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Duplicates cleaned successfully',
      data: contacts,
    });
  } catch (err) {
    console.error('Error cleaning duplicates:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to clean duplicates',
      error: err.message,
    });
  }
};

// Simple sync by ID (preferred method - use this!)
exports.syncById = async (req, res) => {
  const { userId } = req.params;
  const { contacts } = req.body;

  if (!userId || !contacts || !Array.isArray(contacts)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request: userId and contacts array are required',
    });
  }

  try {
    let updatedContacts = [];
    let newContacts = [];
    let deletedContacts = [];

    // Get all existing contacts for this user
    const [existingContacts] = await db.query(
      `SELECT id, contact_number, status FROM sos_emergency_contact WHERE user_id = ?`,
      [userId]
    );
    
    const existingIds = new Set(existingContacts.map(c => c.id));
    const requestIds = new Set(contacts.filter(c => c.id).map(c => c.id));

    // ================================================================
    // 1. Process updates and inserts
    // ================================================================
    for (const contact of contacts) {
      const cleanNumber = contact.contact_number.replace(/[\s\-()]/g, '');
      
      if (contact.id) {
        // Check if contact exists with this ID
        const [existing] = await db.query(
          'SELECT id FROM sos_emergency_contact WHERE id = ? AND user_id = ?',
          [contact.id, userId]
        );

        if (existing.length > 0) {
          // UPDATE by ID
          console.log(`🔄 Updating contact by ID: ${contact.id}`);
          await db.query(
            `UPDATE sos_emergency_contact SET 
              contact_name = ?, 
              contact_number = ?, 
              country_code = ?,
              status = 1,
              updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`,
            [contact.contact_name, cleanNumber, contact.country_code, contact.id, userId]
          );
          updatedContacts.push(contact);
        } else {
          // ID provided but doesn't exist - check by phone number
          const [byPhone] = await db.query(
            'SELECT id FROM sos_emergency_contact WHERE user_id = ? AND contact_number = ?',
            [userId, cleanNumber]
          );

          if (byPhone.length > 0) {
            // UPDATE by phone number
            console.log(`🔄 Updating contact by phone: ${byPhone[0].id}`);
            await db.query(
              `UPDATE sos_emergency_contact SET 
                contact_name = ?, 
                contact_number = ?, 
                country_code = ?,
                status = 1,
                updated_at = CURRENT_TIMESTAMP
               WHERE id = ? AND user_id = ?`,
              [contact.contact_name, cleanNumber, contact.country_code, byPhone[0].id, userId]
            );
            updatedContacts.push({ ...contact, id: byPhone[0].id });
          } else {
            // INSERT new
            console.log(`➕ Inserting new contact: ${contact.contact_name}`);
            const [result] = await db.query(
              `INSERT INTO sos_emergency_contact 
                (user_id, contact_name, contact_number, country_code, status) 
               VALUES (?, ?, ?, ?, 1)`,
              [userId, contact.contact_name, cleanNumber, contact.country_code]
            );
            newContacts.push({ ...contact, id: result.insertId });
          }
        }
      } else {
        // No ID - check by phone number
        const [byPhone] = await db.query(
          'SELECT id FROM sos_emergency_contact WHERE user_id = ? AND contact_number = ?',
          [userId, cleanNumber]
        );

        if (byPhone.length > 0) {
          // UPDATE by phone number
          console.log(`🔄 Updating contact by phone (no ID): ${byPhone[0].id}`);
          await db.query(
            `UPDATE sos_emergency_contact SET 
              contact_name = ?, 
              contact_number = ?, 
              country_code = ?,
              status = 1,
              updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`,
            [contact.contact_name, cleanNumber, contact.country_code, byPhone[0].id, userId]
          );
          updatedContacts.push({ ...contact, id: byPhone[0].id });
        } else {
          // INSERT new
          console.log(`➕ Inserting new contact: ${contact.contact_name}`);
          const [result] = await db.query(
            `INSERT INTO sos_emergency_contact 
              (user_id, contact_name, contact_number, country_code, status) 
             VALUES (?, ?, ?, ?, 1)`,
            [userId, contact.contact_name, cleanNumber, contact.country_code]
          );
          newContacts.push({ ...contact, id: result.insertId });
        }
      }
    }

    // ================================================================
    // 2. Handle soft deletes
    // ================================================================
    const [activeContacts] = await db.query(
      `SELECT id FROM sos_emergency_contact WHERE user_id = ? AND status = 1`,
      [userId]
    );
    
    const activeIds = activeContacts.map(c => c.id);
    const idsToDelete = activeIds.filter(id => !requestIds.has(id));

    if (idsToDelete.length > 0) {
      console.log(`🗑️ Soft-deleting ${idsToDelete.length} contacts`);
      const placeholders = idsToDelete.map(() => '?').join(',');
      await db.query(
        `UPDATE sos_emergency_contact SET status = 0, updated_at = CURRENT_TIMESTAMP 
         WHERE id IN (${placeholders}) AND user_id = ?`,
        [...idsToDelete, userId]
      );
      deletedContacts = idsToDelete;
    }

    // ================================================================
    // 3. Get final contacts
    // ================================================================
    const [currentContacts] = await db.query(
      `SELECT id, user_id, contact_name, contact_number, country_code, 
              created_at, updated_at, status 
       FROM sos_emergency_contact 
       WHERE user_id = ? AND status = 1
       ORDER BY id DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Sync completed successfully',
      data: {
        contacts: currentContacts,
        updated: updatedContacts,
        deleted: deletedContacts,
        new: newContacts,
        syncTimestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Error in syncById:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to sync contacts',
      error: err.message,
    });
  }
};