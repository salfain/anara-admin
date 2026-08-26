const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/activityController');

const router = express.Router();

router.get('/', authenticate, requireAdmin, controller.listAll);

module.exports = router;
