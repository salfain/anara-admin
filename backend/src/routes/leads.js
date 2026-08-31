const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/leadsController');

const router = express.Router();

router.get('/', authenticate, requirePermission('leads.view'), controller.list);
router.get('/summary', authenticate, requirePermission('leads.view'), controller.summary);
router.post('/', authenticate, requirePermission('leads.manage'), controller.create);
router.post('/bulk', authenticate, requirePermission('leads.manage'), controller.bulkCreate);
router.put('/:id', authenticate, requirePermission('leads.manage'), controller.update);
router.delete('/:id', authenticate, requirePermission('leads.manage'), controller.remove);

module.exports = router;
