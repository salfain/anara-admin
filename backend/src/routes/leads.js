const express = require('express');
const { authenticate } = require('../middleware/auth');
const controller = require('../controllers/leadsController');

const router = express.Router();

router.get('/', authenticate, controller.list);
router.get('/summary', authenticate, controller.summary);
router.post('/', authenticate, controller.create);
router.post('/bulk', authenticate, controller.bulkCreate);
router.put('/:id', authenticate, controller.update);
router.delete('/:id', authenticate, controller.remove);

module.exports = router;
