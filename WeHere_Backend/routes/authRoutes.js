const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

router.get('/test', authController.test);
router.post('/register', authController.register);
router.post('/login', authController.login);


router.get('/profile/:userId', authController.getProfile);
router.put('/profile/:userId', authController.updateProfile);

router.put('/location/:userId', authController.updateLocation);




module.exports = router;