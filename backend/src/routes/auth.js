const express = require('express');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/google', authController.googleAuth);
router.get('/me', authenticate, authController.me);
router.post('/refresh', authenticate, authController.refresh);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
