const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/categoriesController');

const router = express.Router();

router.get('/', authenticate, controller.list);
router.post('/', authenticate, requirePermission('admin.categories'), controller.create);
router.put('/:id', authenticate, requirePermission('admin.categories'), controller.update);
router.delete('/:id', authenticate, requirePermission('admin.categories'), controller.remove);

module.exports = router;
