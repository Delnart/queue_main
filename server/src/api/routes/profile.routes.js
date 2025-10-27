const { Router } = require('express');
const profileController = require('../controllers/profile.controller');
const checkAuth = require('../middleware/checkAuth.js');

const router = Router();

router.put('/', checkAuth, profileController.updateProfile);

module.exports = router;