const bcrypt = require('bcrypt');
const db = require('../models/db');

// SIGNUP HANDLER
exports.signup = async (req, res) => {
  const {
    email, password, firstname, lastname,
    birthdate, gender, institution, field
  } = req.body;

  try {
    // Check if user already exists
    const [existing] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?', [email]
    );

    if (existing.length > 0) {
      return res.redirect('/signup.html?error=Email%20already%20taken');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const insertQuery = `
      INSERT INTO users (email, password, firstname, lastname, birthdate, gender, institution, field)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.promise().query(insertQuery, [
      email, hashedPassword, firstname, lastname,
      birthdate, gender, institution, field
    ]);

    // Redirect to login with success message
    return res.redirect('/login.html?success=Account%20created%20successfully');
  } catch (err) {
    console.error('Signup error:', err);
    return res.redirect('/signup.html?error=Server%20error');
  }
};

// LOGIN HANDLER
exports.login = (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.redirect('/login.html?error=Server%20error');

    if (results.length === 0) {
      return res.redirect('/login.html?error=Invalid%20email%20or%20password');
    }

    const user = results[0];

    bcrypt.compare(password, user.password, (err, match) => {
      if (err || !match) {
        return res.redirect('/login.html?error=Invalid%20email%20or%20password');
      }

      // Store user in session
      req.session.user = {
        id: user.id,
        firstname: user.firstname,
        email: user.email,
      };

      // Redirect to dashboard
      res.redirect('/dashboard');
    });
  });
};

// LOGOUT HANDLER
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Logout failed');
    }
    res.redirect('/login.html');
  });
};
