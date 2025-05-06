const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const examController = require('../controllers/examController');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.get('/api/exams/mine', examController.getMyExams);


module.exports = router;
