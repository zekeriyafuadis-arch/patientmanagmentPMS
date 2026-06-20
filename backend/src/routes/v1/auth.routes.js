const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { authLoginSchema, authPasswordChangeSchema } = require('../../validators/schemas');
const AuthController = require('../../controllers/auth.controller');

const router = express.Router();

router.get('/config', AuthController.config);
router.post('/login', validate(authLoginSchema), AuthController.login);
router.get('/me', requireAuth, AuthController.me);
router.post('/change-password', requireAuth, validate(authPasswordChangeSchema), AuthController.changePassword);

module.exports = router;
