const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/rolesController');

const router = express.Router();

router.get('/', authenticate, controller.list);
router.get('/permissions/catalog', authenticate, controller.catalog);
router.post('/', authenticate, requirePermission('admin.roles'), controller.create);
router.delete('/:key', authenticate, requirePermission('admin.roles'), controller.remove);
router.put('/:key/permissions', authenticate, requirePermission('admin.permissions'), controller.updatePermissions);

module.exports = router;
