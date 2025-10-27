const { Router } = require('express');
const groupController = require('../controllers/group.controller');
const checkAuth = require('../middleware/checkAuth.js');

const router = Router();

router.post('/request', checkAuth, groupController.requestGroupCreation);
router.post('/join', checkAuth, groupController.joinGroup);
router.get('/mygroups', checkAuth, groupController.getMyGroups);
router.get('/my-pending', checkAuth, groupController.getMyPendingGroup);

// ---- НОВІ МАРШРУТИ ----
router.get('/manage/:groupId', checkAuth, groupController.getGroupManagementData);
router.post('/approve-member', checkAuth, groupController.approveMember);
router.post('/reject-member', checkAuth, groupController.rejectMember);
// ----------------------

module.exports = router;