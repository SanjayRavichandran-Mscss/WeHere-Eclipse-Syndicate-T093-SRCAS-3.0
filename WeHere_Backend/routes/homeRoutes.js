const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// Health
router.get('/test', homeController.test);

// Feed
router.get('/posts', homeController.getPosts);
router.get('/posts/:id', homeController.getPostById);

// Create post (with file upload)
router.post(
  '/posts',
  homeController.uploadPostMedia,
  homeController.createPost
);

// Soft delete
router.delete('/posts/:id', homeController.deletePost);

// Like (toggle) – also kept under /appreciate for compatibility
router.post('/posts/:id/like', homeController.likePost);
router.post('/posts/:id/appreciate', homeController.appreciatePost);

// Save (toggle)
router.post('/posts/:id/save', homeController.savePost);

// Comments
router.get('/posts/:id/comments', homeController.getComments);
router.post('/posts/:id/comments', homeController.addComment);

router.get('/user/:userId', homeController.getPostsByUser);

module.exports = router;