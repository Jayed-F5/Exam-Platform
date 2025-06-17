const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });


router.post('/api/exams/create', examController.createExam);

router.post('/api/exams/generate-link', examController.generateLink);

router.post('/api/questions/add', upload.single('media'), examController.addQuestion);

router.get('/api/exams/by-code/:code', examController.getExamByCode);

router.delete('/api/questions/:id', examController.deleteQuestion);

router.delete('/api/exams/:examId', examController.deleteExam);

router.post('/api/exams/submit', examController.submitExam);

router.post('/api/exams/get', examController.getExamById);

router.put('/api/questions/:id', examController.updateQuestion);

router.put('/api/exams/:examId', examController.updateExam);

module.exports = router;
