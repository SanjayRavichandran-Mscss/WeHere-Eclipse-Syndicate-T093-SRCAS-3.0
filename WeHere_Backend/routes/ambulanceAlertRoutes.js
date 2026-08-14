const express = require('express');
const router = express.Router();
const ambulanceController = require('../controllers/ambulanceAlertController');

router.get('/test', ambulanceController.test);
router.post('/create', ambulanceController.createAlert);
router.get('/active-for-me/:userId', ambulanceController.getActiveAlertsForUser);
router.get('/my-sent/:senderId', ambulanceController.getMySentAlerts);
router.patch('/:id/clear', ambulanceController.clearAlert);

// NEW – mark a user as received (status → 1)
router.patch('/:id/received', ambulanceController.markReceived);

module.exports = router;