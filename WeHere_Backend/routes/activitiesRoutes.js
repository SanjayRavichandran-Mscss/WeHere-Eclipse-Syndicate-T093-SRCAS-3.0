const express = require('express');
const router = express.Router();
const activitiesController = require('../controllers/activitiesController');

router.get('/test', activitiesController.test);
router.get('/:userId', activitiesController.getActivities);

module.exports = router;
