const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/quickRepliesController');

const router = express.Router();

router.get('/', authenticate, controller.list);
router.post('/', authenticate, controller.create);
router.get('/stats', authenticate, controller.stats);
router.get('/:id', authenticate, controller.getOne);
router.put('/:id', authenticate, controller.update);
router.delete('/:id', authenticate, requireAdmin, controller.remove);
router.post('/:id/use', authenticate, controller.trackUsage);

module.exports = router;
