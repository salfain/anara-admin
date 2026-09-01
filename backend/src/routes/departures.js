const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/departuresController');

const router = express.Router();

// Melihat jadwal cukup dengan hak lihat paket — CS perlu menjawab
// "masih ada seat?" tanpa boleh mengubah jadwalnya.
router.get('/', authenticate, requirePermission('packages.view'), controller.list);
router.post('/', authenticate, requirePermission('packages.manage'), controller.create);
router.post('/import', authenticate, requirePermission('packages.manage'), controller.bulkImport);
router.put('/:id', authenticate, requirePermission('packages.manage'), controller.update);
router.delete('/:id', authenticate, requirePermission('packages.manage'), controller.remove);

module.exports = router;
