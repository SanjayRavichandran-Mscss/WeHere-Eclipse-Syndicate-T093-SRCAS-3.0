// routes/support.js

const express = require('express');

const {
  getNearbyResources,
  getPlaceDetails,
} = require('../controllers/supportController');

const router = express.Router();


// GET /api/resources/nearby
router.get(
  '/nearby',
  getNearbyResources
);


// GET /api/resources/place-details/:placeId
router.get(
  '/place-details/:placeId',
  getPlaceDetails
);


module.exports = router;