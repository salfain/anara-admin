const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/activityController');

const router = express.Router();

router.get('/', authenticate, requirePermission('analytics.view'), controller.listAll);

module.exports = router;
