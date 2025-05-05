const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const db = require('../models/db');

// Serve Create Exam Page
router.get('/create-exam.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/create-exam.html'));
});

// Create Exam
router.post('/api/exams/create', async (req, res) => {
  const { title, description, target_group } = req.body;
  if (!req.session?.user?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const user_id = req.session.user.id;
    const sql = `INSERT INTO exam (title, description, target_group, user_id) VALUES (?, ?, ?, ?)`;
    const [result] = await db.promise().query(sql, [title, description, target_group, user_id]);
    res.json({ success: true, examId: result.insertId });
  } catch (err) {
    console.error('❌ Error creating exam:', err.message);
    res.status(500).json({ success: false });
  }
});

// Generate Link
router.post('/api/exams/generate-link', async (req, res) => {
  const { examId } = req.body;
  if (!req.session?.user?.id) return res.status(401).json({ success: false });

  try {
    const link = crypto.randomBytes(6).toString('hex');
    await db.promise().query('UPDATE exam SET link = ? WHERE id = ?', [link, examId]);
    res.json({ success: true, link });
  } catch (err) {
    console.error('❌ Error generating link:', err.message);
    res.status(500).json({ success: false });
  }
});

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Add Question
router.post('/api/questions/add', upload.single('media'), async (req, res) => {
  const { exam_id, type, statement, answer, tolerance, correctOption, points, duration } = req.body;
  const mediaPath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    if (!['qcm', 'direct'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid type.' });
    }

    const [result] = await db.promise().query(
      `INSERT INTO questions (exam_id, type, statement, answer, tolerance, points, duration, media)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [exam_id, type, statement, type === 'direct' ? answer : null, type === 'direct' ? tolerance : null, points, duration, mediaPath]
    );

    if (type === 'qcm') {
      const correctSet = new Set((correctOption || '').split(','));
      for (let i = 1; req.body[`option${i}`]; i++) {
        const text = req.body[`option${i}`];
        const isCorrect = correctSet.has(String(i)) ? 1 : 0;
        await db.promise().query(
          `INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)`,
          [result.insertId, text, isCorrect]
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error adding question:', err.message);
    res.status(500).json({ success: false });
  }
});

// Get Exam by Code
router.get('/api/exams/by-code/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const [examRows] = await db.promise().query('SELECT * FROM exam WHERE link = ?', [code]);
    if (!examRows.length) return res.json({ success: false });

    const exam = examRows[0];
    const [questions] = await db.promise().query('SELECT * FROM questions WHERE exam_id = ?', [exam.id]);

    for (const q of questions) {
      if (q.type === 'qcm') {
        const [options] = await db.promise().query(
          'SELECT id, option_text, is_correct FROM options WHERE question_id = ?',
          [q.id]
        );
        q.options = options;
      }
    }

    res.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        target_group: exam.target_group,
        questions
      }
    });
  } catch (err) {
    console.error('❌ Error loading exam by code:', err.message);
    res.status(500).json({ success: false });
  }
});

// ✅ Get Exam by ID (for editing)
router.post('/api/exams/get', async (req, res) => {
  const { examId } = req.body;

  try {
    const [examRows] = await db.promise().query('SELECT * FROM exam WHERE id = ?', [examId]);
    if (!examRows.length) return res.json({ success: false });

    const exam = examRows[0];
    const [questions] = await db.promise().query('SELECT * FROM questions WHERE exam_id = ?', [examId]);

    for (const q of questions) {
      if (q.type === 'qcm') {
        const [options] = await db.promise().query(
          'SELECT id, option_text, is_correct FROM options WHERE question_id = ?', [q.id]);
        q.options = options;
      }
    }

    res.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        target_group: exam.target_group,
        questions
      }
    });
  } catch (err) {
    console.error('❌ Error fetching exam by ID:', err.message);
    res.status(500).json({ success: false });
  }
});

// Get Exams of Logged-in User
router.get('/api/exams/mine', async (req, res) => {
  if (!req.session?.user?.id) return res.status(401).json({ success: false });

  try {
    const [exams] = await db.promise().query(
      'SELECT id, title, description, link FROM exam WHERE user_id = ?',
      [req.session.user.id]
    );
    res.json({ success: true, exams });
  } catch (err) {
    console.error('❌ Error fetching exams:', err.message);
    res.status(500).json({ success: false });
  }
});

// Levenshtein Distance
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

// Submit Exam Results
router.post('/api/exams/submit', async (req, res) => {
  const { link, answers, location } = req.body;

  try {
    const [examRows] = await db.promise().query('SELECT id FROM exam WHERE link = ?', [link]);
    if (!examRows.length) return res.json({ success: false });

    const examId = examRows[0].id;
    const [questions] = await db.promise().query('SELECT * FROM questions WHERE exam_id = ?', [examId]);

    let score = 0;
    let total = 0;

    for (const q of questions) {
      total += Number(q.points);
      const userAnswer = answers[`q${q.id}`];

      if (q.type === 'direct') {
        if (!userAnswer || !userAnswer[0]) continue;
        const correct = q.answer?.trim();
        const given = userAnswer[0]?.trim();

        if (!isNaN(correct) && !isNaN(given)) {
          const diff = Math.abs(Number(correct) - Number(given));
          const allowed = (Number(q.tolerance) / 100) * Number(correct);
          if (diff <= allowed) score += Number(q.points);
        } else {
          const dist = levenshtein(correct.toLowerCase(), given.toLowerCase());
          const allowed = Math.ceil((q.tolerance / 100) * correct.length);
          if (dist <= allowed) score += Number(q.points);
        }
      }

      if (q.type === 'qcm') {
        const [options] = await db.promise().query(
          'SELECT id, is_correct FROM options WHERE question_id = ?', [q.id]
        );
        const correctIds = options.filter(o => o.is_correct).map(o => o.id.toString());
        const givenIds = userAnswer || [];

        const allCorrect = correctIds.every(id => givenIds.includes(id));
        const noWrong = givenIds.every(id => correctIds.includes(id));

        if (allCorrect && noWrong) score += Number(q.points);
      }
    }

    await db.promise().query(
      `INSERT INTO results (exam_id, score, total, latitude, longitude, submitted_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        examId,
        score,
        total,
        location?.latitude || null,
        location?.longitude || null
      ]
    );

    console.log('✅ Results saved to DB');
    res.json({ success: true, score, total });
  } catch (err) {
    console.error('❌ Error submitting exam:', err.message);
    res.status(500).json({ success: false });
  }
});

// ✅ Update a question
router.put('/api/questions/:id', async (req, res) => {
  const questionId = req.params.id;
  const { statement, answer, tolerance, duration, points, correct, options } = req.body;

  try {
    const [[question]] = await db.promise().query('SELECT * FROM questions WHERE id = ?', [questionId]);
    if (!question) return res.status(404).json({ success: false });

    // Update question table
    await db.promise().query(
      'UPDATE questions SET statement = ?, answer = ?, tolerance = ?, duration = ?, points = ? WHERE id = ?',
      [statement, answer, tolerance, duration, points, questionId]
    );

    if (question.type === 'qcm') {
      // Delete old options
      await db.promise().query('DELETE FROM options WHERE question_id = ?', [questionId]);

      // Insert updated options
      for (const [id, text] of Object.entries(options)) {
        const isCorrect = correct.includes(id) ? 1 : 0;
        await db.promise().query(
          'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
          [questionId, text, isCorrect]
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error updating question:', err.message);
    res.status(500).json({ success: false });
  }
});

// ✅ Delete a question
router.delete('/api/questions/:id', async (req, res) => {
  const questionId = req.params.id;

  try {
    // Delete from options first to maintain foreign key constraints
    await db.promise().query('DELETE FROM options WHERE question_id = ?', [questionId]);
    await db.promise().query('DELETE FROM questions WHERE id = ?', [questionId]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error deleting question:', err.message);
    res.status(500).json({ success: false });
  }
});
// ✅ Update exam info
router.put('/api/exams/:examId', async (req, res) => {
  const { examId } = req.params;
  const { title, description, target_group } = req.body;

  try {
    await db.promise().query(
      'UPDATE exam SET title = ?, description = ?, target_group = ? WHERE id = ?',
      [title, description, target_group, examId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error updating exam:', err.message);
    res.status(500).json({ success: false });
  }
});

async function deleteExam(examId) {
  if (!confirm("Confirmer la suppression de cet examen ?")) return;

  const res = await fetch(`/api/exams/${examId}`, {
    method: 'DELETE'
  });

  const result = await res.json();
  if (result.success) {
    alert('✅ Examen supprimé.');
    location.reload(); // or remove the element from DOM directly
  } else {
    alert('❌ Échec de la suppression.');
  }
}

// ✅ Delete an exam by ID
router.delete('/api/exams/:examId', async (req, res) => {
  const { examId } = req.params;
  console.log("🧪 Deleting exam ID:", examId);

  try {
    // Get all question IDs for the exam
    const [questionIds] = await db.promise().query('SELECT id FROM questions WHERE exam_id = ?', [examId]);

    // Delete options for each question
    for (const q of questionIds) {
      await db.promise().query('DELETE FROM options WHERE question_id = ?', [q.id]);
    }

    // Delete questions, then the exam
    await db.promise().query('DELETE FROM questions WHERE exam_id = ?', [examId]);
    await db.promise().query('DELETE FROM exam WHERE id = ?', [examId]);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error deleting exam:', err.message);
    res.status(500).json({ success: false });
  }
});



module.exports = router;
