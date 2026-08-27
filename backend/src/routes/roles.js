const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/rolesController');

const router = express.Router();

router.get('/', authenticate, controller.list);
router.post('/', authenticate, requireAdmin, controller.create);
router.delete('/:key', authenticate, requireAdmin, controller.remove);

module.exports = router;
