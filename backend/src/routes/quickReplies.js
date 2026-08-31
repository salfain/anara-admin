const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/quickRepliesController');

const router = express.Router();

router.get('/', authenticate, requirePermission('quick_replies.view'), controller.list);
router.post('/', authenticate, requirePermission('quick_replies.manage'), controller.create);
router.get('/stats', authenticate, requirePermission('quick_replies.view'), controller.stats);
router.get('/:id', authenticate, requirePermission('quick_replies.view'), controller.getOne);
router.put('/:id', authenticate, requirePermission('quick_replies.manage'), controller.update);
router.delete('/:id', authenticate, requirePermission('quick_replies.delete'), controller.remove);
router.post('/:id/use', authenticate, requirePermission('quick_replies.view'), controller.trackUsage);

module.exports = router;
