const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const controller = require('../controllers/packageFilesController');

const router = express.Router();

router.get('/', authenticate, controller.list);
router.post('/', authenticate, upload.single('file'), controller.create);
router.get('/:id/download', authenticate, controller.download);
router.delete('/:id', authenticate, requireAdmin, controller.remove);

module.exports = router;
