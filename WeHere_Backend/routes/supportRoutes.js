// routes/support.js
const express = require('express');
const {
  getNearbyResources,
  getPlaceDetails,
  getNearbyUsers,
  createSupportRequest,
  getSupportRequestsForVolunteer,
  respondToSupportRequest,
} = require('../controllers/supportController');

const router = express.Router();

router.get('/nearby', getNearbyResources);
router.get('/place-details/:placeId', getPlaceDetails);
router.get('/nearby-users/:userId', getNearbyUsers);

router.post('/request', createSupportRequest);

// NEW
router.get('/requests/:volunteerId', getSupportRequestsForVolunteer);
router.patch('/request/:id/respond', respondToSupportRequest);

module.exports = router;