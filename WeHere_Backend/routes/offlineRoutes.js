const express = require('express');
const router = express.Router();
const offlineController = require('../controllers/offlineController');

// Health check
router.get('/health', offlineController.healthCheck);

// Get all contacts for a user (full sync)
router.get('/contacts/:userId', offlineController.getEmergencyContactsForSync);

// Get contacts updated since a specific timestamp (incremental sync)
router.get('/contacts/:userId/since', offlineController.getContactsSince);

// Sync contacts (batch sync - insert/update/delete)
router.post('/contacts/:userId/sync', offlineController.syncEmergencyContacts);

// Trigger sync for a single contact
router.post('/contacts/:userId/trigger', offlineController.triggerSync);
// Add this route
router.post('/contacts/:userId/sync-by-id', offlineController.syncById);

module.exports = router;