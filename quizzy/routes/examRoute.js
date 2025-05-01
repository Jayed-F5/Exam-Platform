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
  if (!req.session?.user?.id) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const user_id = req.session.user.id;
    const sql = `INSERT INTO exam (title, description, target_group, user_id)
                 VALUES (?, ?, ?, ?)`;
    const [result] = await db.promise().query(sql, [title, description, target_group, user_id]);
    res.json({ success: true, examId: result.insertId });
  } catch (err) {
    console.error('❌ Error creating exam:', err);
    res.status(500).json({ success: false });
  }
});

// Generate Link
router.post('/api/exams/generate-link', async (req, res) => {
  const { examId } = req.body;
  if (!req.session?.user?.id) {
    return res.status(401).json({ success: false });
  }
  try {
    const link = crypto.randomBytes(6).toString('hex');
    await db.promise().query('UPDATE exam SET link = ? WHERE id = ?', [link, examId]);
    res.json({ success: true, link });
  } catch (err) {
    console.error('❌ Error generating link:', err);
    res.status(500).json({ success: false });
  }
});

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename:  (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Add Question (with optional media)
router.post('/api/questions/add', upload.single('media'), async (req, res) => {
  const {
    exam_id, type, statement, answer,
    tolerance, correctOption, points, duration
  } = req.body;
  const mediaPath = req.file ? `/uploads/${req.file.filename}` : null;
  const pointsNum    = parseInt(points, 10);
  const durationNum  = parseInt(duration, 10);
  const toleranceNum = tolerance !== undefined ? parseFloat(tolerance) : null;

  try {
    if (!['qcm','direct'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Type invalide.' });
    }

    if (type === 'qcm') {
      const [qr] = await db.promise().query(
        `INSERT INTO questions (exam_id, type, statement, points, duration, media)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [exam_id, type, statement, pointsNum, durationNum, mediaPath]
      );
      const qid = qr.insertId;
      const correctSet = new Set((correctOption||'').split(','));
      if (!correctSet.size) {
        return res.status(400).json({ success: false, error: 'Au moins une réponse correcte requise.' });
      }
      for (let i=1; req.body[`option${i}`]; i++) {
        const text = req.body[`option${i}`];
        const isCorrect = correctSet.has(String(i)) ? 1 : 0;
        await db.promise().query(
          `INSERT INTO options (question_id, option_text, is_correct)
           VALUES (?, ?, ?)`,
          [qid, text, isCorrect]
        );
      }
    } else {
      await db.promise().query(
        `INSERT INTO questions (exam_id, type, statement, answer, tolerance, points, duration, media)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [exam_id, type, statement, answer, toleranceNum, pointsNum, durationNum, mediaPath]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error adding question:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Exam + Questions (by link OR examId), INCLUDING description & target_group
router.post('/api/exams/get', async (req, res) => {
  const { link, examId } = req.body;
  try {
    const condition = examId ? 'id = ?' : 'link = ?';
    const value = examId || link;

    // Fetch exam metadata
    const [rows] = await db.promise().query(
      `SELECT id, title, description, target_group
         FROM exam
        WHERE ${condition}`,
      [value]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Examen non trouvé.' });
    }
    const examMeta = rows[0];

    // Fetch questions
    const [questions] = await db.promise().query(
      'SELECT * FROM questions WHERE exam_id = ?',
      [examMeta.id]
    );
    // If QCM, fetch options
    for (let q of questions) {
      if (q.type === 'qcm') {
        const [opts] = await db.promise().query(
          'SELECT id, option_text, is_correct FROM options WHERE question_id = ?',
          [q.id]
        );
        q.options = opts;
      }
    }

    // Return full exam object
    res.json({
      success: true,
      exam: {
        title:        examMeta.title,
        description:  examMeta.description,
        target_group: examMeta.target_group,
        questions
      }
    });
  } catch (err) {
    console.error('❌ Error loading exam:', err);
    res.status(500).json({ success: false, error: 'Erreur interne.' });
  }
});

// Update Exam metadata
router.put('/api/exams/:id', async (req, res) => {
  const eid = req.params.id;
  const { title, description, target_group } = req.body;
  if (!req.session?.user?.id) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const [chk] = await db.promise().query(
      'SELECT id FROM exam WHERE id = ? AND user_id = ?',
      [eid, req.session.user.id]
    );
    if (!chk.length) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    await db.promise().query(
      'UPDATE exam SET title = ?, description = ?, target_group = ? WHERE id = ?',
      [title, description, target_group, eid]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error updating exam metadata:', err);
    res.status(500).json({ success: false });
  }
});

// Submit Exam (calculate score)
router.post('/api/exams/submit', async (req, res) => {
  const { link, answers } = req.body;
  try {
    const [ex] = await db.promise().query(
      'SELECT id FROM exam WHERE link = ?',
      [link]
    );
    if (!ex.length) {
      return res.status(404).json({ success: false });
    }
    const eid = ex[0].id;
    const [questions] = await db.promise().query(
      'SELECT * FROM questions WHERE exam_id = ?',
      [eid]
    );

    let score = 0, total = 0;
    for (const q of questions) {
      total += q.points;
      const input = answers[`q${q.id}`] || [];
      if (q.type === 'direct') {
        const ans     = (input[0]||'').trim().toLowerCase();
        const correct = (q.answer||'').trim().toLowerCase();
        if (!isNaN(ans) && !isNaN(correct)) {
          const diff = Math.abs(parseFloat(ans) - parseFloat(correct));
          const maxD = Math.abs(parseFloat(correct)) * (parseFloat(q.tolerance)/100);
          if (diff <= maxD) score += q.points;
        } else {
          const dist = levenshtein(ans, correct);
          if (dist <= parseInt(q.tolerance,10)) score += q.points;
        }
      } else {
        const [opts] = await db.promise().query(
          'SELECT id FROM options WHERE question_id = ? AND is_correct = 1',
          [q.id]
        );
        const correctIds = new Set(opts.map(r=>String(r.id)));
        const sel        = new Set(input);
        if (
          sel.size === correctIds.size &&
          [...sel].every(v=>correctIds.has(v))
        ) {
          score += q.points;
        }
      }
    }

    const percentage = Math.round((score/total)*100);
    res.json({ success: true, score: percentage, total: 100 });
  } catch (err) {
    console.error('❌ Submit exam error:', err);
    res.status(500).json({ success: false });
  }
});

// List current user’s exams
router.get('/api/exams/mine', async (req, res) => {
  if (!req.session?.user?.id) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const uid = req.session.user.id;
    const [rows] = await db.promise().query(
      'SELECT id, title, description, link FROM exam WHERE user_id = ?',
      [uid]
    );
    res.json({ success: true, exams: rows });
  } catch (err) {
    console.error('❌ Error fetching user exams:', err);
    res.status(500).json({ success: false });
  }
});

// Delete entire exam (and its questions/options)
router.delete('/api/exams/:id', async (req, res) => {
  if (!req.session?.user?.id) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const eid = req.params.id;
  try {
    const [chk] = await db.promise().query(
      'SELECT id FROM exam WHERE id = ? AND user_id = ?',
      [eid, req.session.user.id]
    );
    if (!chk.length) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    await db.promise().query(
      'DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = ?)',
      [eid]
    );
    await db.promise().query(
      'DELETE FROM questions WHERE exam_id = ?',
      [eid]
    );
    await db.promise().query(
      'DELETE FROM exam WHERE id = ?',
      [eid]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error deleting exam:', err);
    res.status(500).json({ success: false });
  }
});

// Update a single question
router.put('/api/questions/:id', async (req, res) => {
  const qid = req.params.id;
  const {
    statement, answer, tolerance, points, duration,
    correct = [], options = {}
  } = req.body;
  try {
    await db.promise().query(
      `UPDATE questions
         SET statement = ?, answer = ?, tolerance = ?, points = ?, duration = ?
       WHERE id = ?`,
      [statement, answer||null, tolerance||null, points, duration, qid]
    );
    for (const optId in options) {
      const text      = options[optId];
      const isCorrect = correct.includes(optId) ? 1 : 0;
      await db.promise().query(
        `UPDATE options
           SET option_text = ?, is_correct = ?
         WHERE id = ? AND question_id = ?`,
        [text, isCorrect, optId, qid]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error updating question:', err);
    res.status(500).json({ success: false });
  }
});

// Delete a single question
router.delete('/api/questions/:id', async (req, res) => {
  const qid = req.params.id;
  try {
    await db.promise().query('DELETE FROM options WHERE question_id = ?', [qid]);
    await db.promise().query('DELETE FROM questions WHERE id = ?', [qid]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error deleting question:', err);
    res.status(500).json({ success: false });
  }
});

// Levenshtein for tolerance  
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i-1][j] + 1,
        dp[i][j-1] + 1,
        dp[i-1][j-1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

module.exports = router;
