const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/dailyReportsController');
const categories = require('../controllers/reportCategoriesController');

const router = express.Router();

// Membaca laporan cukup dengan hak lihat lead; mengisinya butuh hak kelola.
router.get('/', authenticate, requirePermission('leads.view'), controller.list);
// Sebelum rute lain supaya 'day' tidak terbaca sebagai sesuatu yang lain.
router.get('/day', authenticate, requirePermission('leads.view'), controller.day);

// Daftar kolom rincian.
router.get('/categories', authenticate, requirePermission('leads.view'), categories.list);
router.post('/categories', authenticate, requirePermission('leads.manage'), categories.create);
router.delete('/categories/:id', authenticate, requirePermission('leads.manage'), categories.remove);
router.post('/', authenticate, requirePermission('leads.manage'), controller.save);
router.delete('/:id', authenticate, requirePermission('leads.manage'), controller.remove);

module.exports = router;
