const bcrypt = require('bcrypt');
const db = require('../models/db');

// SIGNUP HANDLER
exports.signup = async (req, res) => {
  const { email, password, firstname, lastname, birthdate, gender, institution, field } = req.body;

  try {
    // Check if user already exists
    const [existing] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?', [email]
    );

    if (existing.length > 0) {
      return res.redirect('/signup.html?error=Email%20already%20taken');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const insertQuery = `
      INSERT INTO users (email, password, firstname, lastname, birthdate, gender, institution, field)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.promise().query(insertQuery, [
      email, hashedPassword, firstname, lastname, birthdate, gender, institution, field
    ]);

    // Redirect to login page with success message
    return res.redirect('/login.html?success=Account%20created%20successfully');
  } catch (err) {
    console.error('Signup Error:', err);
    return res.redirect('/signup.html?error=Server%20error');
  }
};

// LOGIN HANDLER
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.redirect('/login.html?error=Invalid%20email%20or%20password');
    }

    const user = rows[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.redirect('/login.html?error=Invalid%20email%20or%20password');
    }

    // ✅ Save user info into session
    req.session.user = {
      id: user.id,
      firstname: user.firstname,
      email: user.email
    };

    // ✅ Save also userId separately if needed
    req.session.userId = user.id;

    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Login Error:', err);
    return res.redirect('/login.html?error=Server%20error');
  }
};

// LOGOUT HANDLER
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout Error:', err);
      return res.status(500).send('Logout failed');
    }
    res.redirect('/login.html');
  });
};
