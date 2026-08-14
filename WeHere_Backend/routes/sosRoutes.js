const express = require('express');
const multer = require('multer');
const router = express.Router();

const sosController = require('../controllers/sosController');

// Store file in memory; forwarded straight to Pinata, no disk write needed
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB cap per clip
});

router.post('/upload', upload.single('file'), sosController.uploadClip);
router.get('/clips', sosController.getClips);


// Create a new emergency message broadcast
router.post('/broadcast', sosController.createBroadcast);

// Stop an active broadcast
router.patch('/broadcast/:id/stop', sosController.stopBroadcast);

// Get broadcasts of a user (optional – useful for history)
router.get('/broadcast/user/:userId', sosController.getUserBroadcasts);

module.exports = router;
