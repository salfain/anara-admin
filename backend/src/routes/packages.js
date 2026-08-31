const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/packagesController');

const router = express.Router();

router.get('/', authenticate, requirePermission('packages.view'), controller.list);
router.post('/', authenticate, requirePermission('packages.manage'), controller.create);
router.get('/:id', authenticate, requirePermission('packages.view'), controller.getOne);
router.put('/:id', authenticate, requirePermission('packages.manage'), controller.update);
router.delete('/:id', authenticate, requirePermission('packages.manage'), controller.remove);

module.exports = router;
