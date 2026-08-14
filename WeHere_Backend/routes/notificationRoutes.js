const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// 1. Test – always first
router.get('/test', notificationController.test);

// 2. Ambulance alert notifications
router.get(
  '/ambulance-alerts/:userId',
  notificationController.getAmbulanceAlertNotifications
);

router.patch(
  '/ambulance-alerts/:id/received',
  notificationController.markAmbulanceAlertReceived
);

// 3. SOS Broadcast notifications
router.get(
  '/sos-broadcasts/:userId',
  notificationController.getSOSBroadcastNotifications
);

router.patch(
  '/sos-broadcasts/:broadcastId/received',
  notificationController.markSOSBroadcastReceived
);

// 4. SOS Broadcast Help (I will help button)
router.patch(
  '/sos-broadcasts/:broadcastId/help',
  notificationController.markSOSBroadcastHelp
);

router.get(
  '/sos-broadcasts/:broadcastId/helpers',
  notificationController.getSOSBroadcastHelpers
);



router.get(
  '/connection-requests/:userId',
  notificationController.getConnectionRequests
);


router.post('/respond', notificationController.respondToRequest);


module.exports = router;