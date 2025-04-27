const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../models/db');
const crypto = require('crypto');

// Serve the HTML Create Exam page
router.get('/create-exam.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/create-exam.html'));
});

// Handle form submission
router.post('/api/exams/create', async (req, res) => {
  const { title, description, target_group } = req.body;
  const link = crypto.randomBytes(6).toString('hex');

  const user_id = req.session.user.id; // ✅ use req.session.user.id (not userId)

  if (!user_id) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const sql = 'INSERT INTO exam (title, description, target_group, link, user_id) VALUES (?, ?, ?, ?, ?)';
    await db.promise().query(sql, [title, description, target_group, link, user_id]);

    res.json({ success: true, link });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
