const crypto = require('crypto');
const Exam = require('../models/Exam');
const db = require('../models/db');


exports.createExam = (req, res) => {
    console.log("👉 Reçu dans createExam:", req.body);
  
    const { title, description, target_group } = req.body;
    const userId = req.session?.user?.id;
  
    if (!title || !description || !target_group || !userId) {
      console.log("❌ Champs manquants ou utilisateur non connecté");
      return res.status(400).json({ success: false, message: "Champs manquants" });
    }
  
    db.query(
      'INSERT INTO exam (title, description, target_group, user_id) VALUES (?, ?, ?, ?)',
      [title, description, target_group, userId],
      (err, result) => {
        if (err) {
          console.error("❌ Erreur createExam:", err);
          return res.status(500).json({ success: false, message: "Erreur serveur" });
        }
  
        res.json({ success: true, examId: result.insertId });
      }
    );
  };
  

exports.generateLink = async (req, res) => {
  const { examId } = req.body;
  if (!req.session?.user?.id) return res.status(401).json({ success: false });

  try {
    const link = crypto.randomBytes(6).toString('hex');
    await Exam.updateExamLink(examId, link);
    res.json({ success: true, link });
  } catch (err) {
    console.error('Error generating link:', err.message);
    res.status(500).json({ success: false });
  }
};

exports.getMyExams = (req, res) => {
    if (!req.session?.user?.id) return res.status(401).json({ success: false });
  
    db.query(
      'SELECT id, title, description, link FROM exam WHERE user_id = ?',
      [req.session.user.id],
      (err, results) => {
        if (err) {
          console.error('❌ Error fetching exams:', err.message);
          return res.status(500).json({ success: false });
        }
  
        res.json({ success: true, exams: results });
      }
    );
  };
  

exports.getExamByCode = async (req, res) => {
  const { code } = req.params;

  try {
    console.log("🔍 Looking up exam with code:", code);

    const [examRows] = await db.promise().query('SELECT * FROM exam WHERE link = ?', [code]);

    if (!examRows.length) {
      console.log("❌ No exam found.");
      return res.json({ success: false });
    }

    const exam = examRows[0];
    const [questions] = await db.promise().query('SELECT * FROM questions WHERE exam_id = ?', [exam.id]);

    for (const q of questions) {
      if (q.type === 'qcm') {
        const [options] = await db.promise().query(
          'SELECT id, option_text, is_correct FROM options WHERE question_id = ?', [q.id]
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
    console.error('❌ Error in getExamByCode:', err.message);
    res.status(500).json({ success: false });
  }
};

exports.getExamById = async (req, res) => {
  const { examId } = req.body;

  try {
    const [examRows] = await db.promise().query('SELECT * FROM exam WHERE id = ?', [examId]);
    if (!examRows.length) return res.json({ success: false });

    const exam = examRows[0];
    const [questions] = await db.promise().query('SELECT * FROM questions WHERE exam_id = ?', [examId]);

    for (const q of questions) {
      if (q.type === 'qcm') {
        const [options] = await db.promise().query(
          'SELECT id, option_text, is_correct FROM options WHERE question_id = ?', [q.id]
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
    console.error('❌ Error fetching exam by ID:', err.message);
    res.status(500).json({ success: false });
  }
};

exports.updateExam = (req, res) => {
  const examId = req.params.examId;
  const { title, description, target_group } = req.body;

  if (!title || !description || !target_group) {
    return res.status(400).json({ success: false, message: "Tous les champs sont requis." });
  }

  const updateQuery = `
    UPDATE exam
    SET title = ?, description = ?, target_group = ?
    WHERE id = ?
  `;

  db.query(updateQuery, [title, description, target_group, examId], (err, result) => {
    if (err) {
      console.error("❌ Erreur lors de la mise à jour de l'examen :", err);
      return res.status(500).json({ success: false, message: "Erreur serveur" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Examen introuvable" });
    }

    res.json({ success: true, message: "Examen mis à jour avec succès" });
  });
};

exports.deleteExam = async (req, res) => {
  const { examId } = req.params;
  console.log("🧪 Deleting exam ID:", examId);

  try {
    await db.promise().query('DELETE FROM results WHERE exam_id = ?', [examId]);
    await db.promise().query('DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = ?)', [examId]);
    await db.promise().query('DELETE FROM questions WHERE exam_id = ?', [examId]);
    await db.promise().query('DELETE FROM exam WHERE id = ?', [examId]);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error deleting exam:', err.message);
    res.status(500).json({ success: false });
  }
};

exports.addQuestion = async (req, res) => {
  const { exam_id, type, statement, answer, tolerance, correctOption, points, duration } = req.body;
  const mediaPath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const questionId = await Exam.createQuestion({
      exam_id,
      type,
      statement,
      answer: type === 'direct' ? answer : null,
      tolerance: type === 'direct' ? tolerance : null,
      points,
      duration,
      media: mediaPath
    });

    if (type === 'qcm') {
      const correctSet = new Set((correctOption || '').split(','));
      for (let i = 1; req.body[`option${i}`]; i++) {
        const text = req.body[`option${i}`];
        const isCorrect = correctSet.has(String(i)) ? 1 : 0;
        await Exam.addOption(questionId, text, isCorrect);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error adding question:', err.message);
    res.status(500).json({ success: false });
  }
};

exports.updateQuestion = (req, res) => {
  const questionId = req.params.id;
  const { statement, answer, tolerance, points, duration } = req.body;

  if (!statement || !points || !duration) {
    return res.status(400).json({ success: false, message: "Champs obligatoires manquants." });
  }

  const updateQuery = `
    UPDATE questions
    SET statement = ?, answer = ?, tolerance = ?, points = ?, duration = ?
    WHERE id = ?
  `;

  db.query(updateQuery, [statement, answer, tolerance, points, duration, questionId], (err, result) => {
    if (err) {
      console.error("❌ Erreur lors de la mise à jour de la question :", err);
      return res.status(500).json({ success: false, message: "Erreur serveur" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Question introuvable" });
    }

    res.json({ success: true, message: "Question mise à jour avec succès" });
  });
};

exports.deleteQuestion = async (req, res) => {
  const questionId = req.params.id;

  try {
    await Exam.deleteQuestion(questionId);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error deleting question:', err.message);
    res.status(500).json({ success: false });
  }
};


exports.submitExam = async (req, res) => {
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
};

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
