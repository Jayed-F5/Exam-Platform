const db = require('./db');

// Créer un examen
const createExam = async (title, description, target_group, user_id) => {
  const [result] = await db.promise().query(
    'INSERT INTO exam (title, description, target_group, user_id) VALUES (?, ?, ?, ?)',
    [title, description, target_group, user_id]
  );
  return result.insertId;
};

// Mettre à jour un lien d'examen
const updateExamLink = async (examId, link) => {
  await db.promise().query('UPDATE exam SET link = ? WHERE id = ?', [link, examId]);
};

// Créer une question
const createQuestion = async (data) => {
  const {
    exam_id, type, statement, answer,
    tolerance, points, duration, media
  } = data;

  const [result] = await db.promise().query(
    `INSERT INTO questions (exam_id, type, statement, answer, tolerance, points, duration, media)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [exam_id, type, statement, answer, tolerance, points, duration, media]
  );
  return result.insertId;
};

// Ajouter une option à une question
const addOption = async (question_id, option_text, is_correct) => {
  await db.promise().query(
    'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
    [question_id, option_text, is_correct]
  );
};

const deleteQuestion = async (questionId) => {
    // Delete from options first to maintain foreign key constraints
    await db.promise().query('DELETE FROM options WHERE question_id = ?', [questionId]);
    await db.promise().query('DELETE FROM questions WHERE id = ?', [questionId]);
  };
  
  const deleteExam = async (examId) => {
    // Get all question IDs for the exam
    const [questionIds] = await db.promise().query('SELECT id FROM questions WHERE exam_id = ?', [examId]);
  
    // Delete options for each question
    for (const q of questionIds) {
      await db.promise().query('DELETE FROM options WHERE question_id = ?', [q.id]);
    }
  
    // Delete questions, then the exam
    await db.promise().query('DELETE FROM questions WHERE exam_id = ?', [examId]);
    await db.promise().query('DELETE FROM exam WHERE id = ?', [examId]);
  };
  

module.exports = {
  createExam,
  updateExamLink,
  createQuestion,
  addOption,
  deleteQuestion,
  deleteExam
};
