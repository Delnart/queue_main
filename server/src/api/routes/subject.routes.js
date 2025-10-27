const { Router } = require('express');
const subjectController = require('../controllers/subject.controller');
const checkAuth = require('../middleware/checkAuth.js');

const router = Router();

router.post('/', checkAuth, subjectController.createSubject);
router.get('/group/:groupId', checkAuth, subjectController.getSubjectsForGroup);

// --- НОВІ МАРШРУТИ ДЛЯ ЧЕРГИ ---
router.post('/queue/join', checkAuth, subjectController.joinQueue);
router.post('/queue/leave/:subjectId', checkAuth, subjectController.leaveQueue);
router.post('/queue/next/:subjectId', checkAuth, subjectController.manageNext);
router.post('/queue/remove', checkAuth, subjectController.manageRemove);
router.get('/settings/:subjectId', checkAuth, subjectController.getSubjectSettings);
router.put('/settings/:subjectId', checkAuth, subjectController.updateSubjectSettings);
module.exports = router;