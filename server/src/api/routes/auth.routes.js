// server/src/api/routes/auth.routes.js

const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const checkAuth = require('../middleware/checkAuth.js');

const router = Router();

// Цей маршрут для логіну
router.post('/telegram', authController.loginWithTelegram);

// А ЦЕЙ МАРШРУТ ДЛЯ ПЕРЕВІРКИ
// 99%, що у тебе його немає
router.get('/me', checkAuth, authController.getMe);

module.exports = router;