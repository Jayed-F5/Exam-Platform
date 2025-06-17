const db = require('./db');

const createExam = async (title, description, target_group, user_id) => {
  const [result] = await db.promise().query(
    'INSERT INTO exam (title, description, target_group, user_id) VALUES (?, ?, ?, ?)',
    [title, description, target_group, user_id]
  );
  return result.insertId;
};

const updateExamLink = async (examId, link) => {
  await db.promise().query('UPDATE exam SET link = ? WHERE id = ?', [link, examId]);
};

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

const addOption = async (question_id, option_text, is_correct) => {
  await db.promise().query(
    'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
    [question_id, option_text, is_correct]
  );
};

const deleteQuestion = async (questionId) => {
    await db.promise().query('DELETE FROM options WHERE question_id = ?', [questionId]);
    await db.promise().query('DELETE FROM questions WHERE id = ?', [questionId]);
  };
  
  const deleteExam = async (examId) => {
    const [questionIds] = await db.promise().query('SELECT id FROM questions WHERE exam_id = ?', [examId]);
  
    for (const q of questionIds) {
      await db.promise().query('DELETE FROM options WHERE question_id = ?', [q.id]);
    }
  
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
