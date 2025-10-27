const { Router } = require('express');
const topicController = require('../controllers/topic.controller');
const checkAuth = require('../middleware/checkAuth.js');

const router = Router();

router.post('/', checkAuth, topicController.createTopic);
router.get('/subject/:subjectId', checkAuth, topicController.getTopicsForSubject);
router.post('/signup/:topicId', checkAuth, topicController.signUpForTopic);
router.post('/leave/:topicId', checkAuth, topicController.leaveTopic);

module.exports = router;