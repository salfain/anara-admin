const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/analyticsController');

const router = express.Router();

router.get('/summary', authenticate, requirePermission('analytics.view'), controller.summary);
router.get('/top-questions', authenticate, requirePermission('analytics.view'), controller.topQuestions);
router.get('/categories', authenticate, requirePermission('analytics.view'), controller.categories);
router.get('/usage', authenticate, requirePermission('analytics.view'), controller.usageTrend);
router.get('/team-stats', authenticate, requirePermission('analytics.view'), controller.teamStats);
router.get('/sales', authenticate, requirePermission('analytics.view'), controller.sales);

module.exports = router;
