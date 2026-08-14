const express = require('express');
const router = express.Router();
const networksController = require('../controllers/networksController');

// Test
router.get('/test', networksController.test);

// Get professionals list
router.get('/professionals/:user_id', networksController.getProfessionals);

// Get single profile details
router.get('/profile/:profileId', networksController.getSingleProfile);

// Get in Touch status (returns 'pending'/'active'/'declined'/'none')
router.get('/status/:profileId', networksController.getInTouchStatus);

// Click Get in Touch (creates pending request)
router.post('/get-in-touch', networksController.createGetInTouch);



// Submit feedback (only if active)
router.post('/feedback', networksController.submitFeedback);

// Get all feedbacks of a profile
router.get('/feedbacks/:profileId', networksController.getFeedbacks);

module.exports = router;