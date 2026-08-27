const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/usersController');

const router = express.Router();

router.get('/', authenticate, requireAdmin, controller.list);
router.get('/simple', authenticate, controller.listSimple);
router.post('/', authenticate, requireAdmin, controller.invite);
router.put('/:id/role', authenticate, requireAdmin, controller.updateRole);
router.put('/:id/approve', authenticate, requireAdmin, controller.approve);
router.delete('/:id', authenticate, requireAdmin, controller.remove);
router.get('/:id/activity', authenticate, requireAdmin, controller.activity);

module.exports = router;
