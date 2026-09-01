const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/invoicesController');

const router = express.Router();

// Memakai hak akses Penagihan: sama-sama urusan keuangan, dan menambah
// pasangan hak akses baru berarti satu lagi yang harus diatur ulang.
router.get('/', authenticate, requirePermission('billing.view'), controller.list);
router.post('/', authenticate, requirePermission('billing.manage'), controller.create);
router.get('/:id', authenticate, requirePermission('billing.view'), controller.getOne);
router.put('/:id', authenticate, requirePermission('billing.manage'), controller.update);
router.delete('/:id', authenticate, requirePermission('billing.manage'), controller.remove);

router.put('/:id/items', authenticate, requirePermission('billing.manage'), controller.replaceItems);
router.put('/:id/payments', authenticate, requirePermission('billing.manage'), controller.replacePayments);

module.exports = router;
