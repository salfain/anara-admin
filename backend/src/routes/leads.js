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

// Membaca riwayat cukup dengan hak lihat; menulisnya butuh hak kelola.
router.get('/:id/notes', authenticate, requirePermission('leads.view'), controller.listNotes);
router.post('/:id/notes', authenticate, requirePermission('leads.manage'), controller.addNote);

module.exports = router;
