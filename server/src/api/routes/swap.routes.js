const { Router } = require('express');
const swapController = require('../controllers/swap.controller');
const checkAuth = require('../middleware/checkAuth.js');

const router = Router();

router.post('/request', checkAuth, swapController.requestSwap);

module.exports = router;