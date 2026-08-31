const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/followupTemplatesController');

const router = express.Router();

router.get('/', authenticate, requirePermission('follow_up.view'), controller.list);
router.post('/', authenticate, requirePermission('follow_up.manage'), controller.create);
router.put('/:id', authenticate, requirePermission('follow_up.manage'), controller.update);
router.delete('/:id', authenticate, requirePermission('follow_up.manage'), controller.remove);

module.exports = router;
