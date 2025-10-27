const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const checkAuth = require('../middleware/checkAuth.js');

const router = Router();

router.get('/pending-groups', checkAuth, adminController.getPendingGroups);
router.post('/approve-group/:groupId', checkAuth, adminController.approveGroup);
router.post('/reject-group/:groupId', checkAuth, adminController.rejectGroup);

module.exports = router;