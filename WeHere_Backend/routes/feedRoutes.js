const express = require('express');
const multer = require('multer');
const router = express.Router();

const feedController = require('../controllers/feedController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB cap per post image
});

router.post('/posts', upload.single('file'), feedController.createPost);
router.get('/posts', feedController.getPosts);

module.exports = router;
