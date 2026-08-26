const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/usersController');

const router = express.Router();

router.get('/', authenticate, requireAdmin, controller.list);
router.post('/', authenticate, requireAdmin, controller.invite);
router.put('/:id/role', authenticate, requireAdmin, controller.updateRole);
router.delete('/:id', authenticate, requireAdmin, controller.remove);
router.get('/:id/activity', authenticate, requireAdmin, controller.activity);

module.exports = router;
