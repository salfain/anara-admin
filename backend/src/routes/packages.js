const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/packagesController');

const router = express.Router();

router.get('/', authenticate, controller.list);
router.post('/', authenticate, requireAdmin, controller.create);
router.get('/:id', authenticate, controller.getOne);
router.put('/:id', authenticate, requireAdmin, controller.update);
router.delete('/:id', authenticate, requireAdmin, controller.remove);

module.exports = router;
