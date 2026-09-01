const express = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const controller = require('../controllers/bookingsController');

const router = express.Router();

router.get('/', authenticate, requirePermission('billing.view'), controller.list);
router.post('/', authenticate, requirePermission('billing.manage'), controller.create);
router.put('/:id', authenticate, requirePermission('billing.manage'), controller.update);
router.delete('/:id', authenticate, requirePermission('billing.manage'), controller.remove);

router.post('/:id/participants', authenticate, requirePermission('billing.manage'), controller.addParticipant);
router.put('/:id/participants/:participantId', authenticate, requirePermission('billing.manage'), controller.updateParticipant);
router.delete('/:id/participants/:participantId', authenticate, requirePermission('billing.manage'), controller.removeParticipant);

module.exports = router;
