const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/usersController');

const router = express.Router();

router.get('/', authenticate, requirePermission('admin.users'), controller.list);
router.get('/simple', authenticate, controller.listSimple);
router.post('/', authenticate, requirePermission('admin.users'), controller.invite);
router.put('/:id/role', authenticate, requirePermission('admin.users'), controller.updateRole);
router.put('/:id/approve', authenticate, requirePermission('admin.users'), controller.approve);
router.delete('/:id', authenticate, requirePermission('admin.users'), controller.remove);
router.get('/:id/activity', authenticate, requirePermission('admin.users'), controller.activity);

module.exports = router;
