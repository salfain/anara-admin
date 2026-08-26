const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/analyticsController');

const router = express.Router();

router.get('/summary', authenticate, requireAdmin, controller.summary);
router.get('/top-questions', authenticate, requireAdmin, controller.topQuestions);
router.get('/categories', authenticate, requireAdmin, controller.categories);
router.get('/usage', authenticate, requireAdmin, controller.usageTrend);
router.get('/team-stats', authenticate, requireAdmin, controller.teamStats);

module.exports = router;
