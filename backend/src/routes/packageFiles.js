const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const controller = require('../controllers/packageFilesController');

const router = express.Router();

router.get('/', authenticate, requirePermission('packages.view'), controller.list);
router.post('/', authenticate, requirePermission('packages.manage'), upload.single('file'), controller.create);
router.get('/:id/download', authenticate, requirePermission('packages.view'), controller.download);
router.delete('/:id', authenticate, requirePermission('packages.manage'), controller.remove);

module.exports = router;
