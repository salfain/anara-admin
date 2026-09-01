const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/dailyReportsController');

const router = express.Router();

// Membaca laporan cukup dengan hak lihat lead; mengisinya butuh hak kelola.
router.get('/', authenticate, requirePermission('leads.view'), controller.list);
router.post('/', authenticate, requirePermission('leads.manage'), controller.save);
router.delete('/:id', authenticate, requirePermission('leads.manage'), controller.remove);

module.exports = router;
