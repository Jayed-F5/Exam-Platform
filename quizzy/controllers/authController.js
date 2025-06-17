const bcrypt = require('bcrypt');
const UserModel = require('../models/User');

exports.signup = async (req, res) => {
  const {
    email, password, firstname, lastname,
    birthdate, gender, institution, field
  } = req.body;

  try {
    const existingUser = await UserModel.getUserByEmail(email);
    if (existingUser) {
      return res.redirect('/signup.html?error=Email%20already%20taken');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await UserModel.createUser({
      email,
      password: hashedPassword,
      firstname,
      lastname,
      birthdate,
      gender,
      institution,
      field
    });

    return res.redirect('/login.html?success=Account%20created%20successfully');
  } catch (err) {
    console.error('Signup Error:', err);
    return res.redirect('/signup.html?error=Server%20error');
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.getUserByEmail(email);
    if (!user) {
      return res.redirect('/login.html?error=Invalid%20email%20or%20password');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.redirect('/login.html?error=Invalid%20email%20or%20password');
    }

    req.session.user = {
      id: user.id,
      firstname: user.firstname,
      email: user.email
    };
    req.session.userId = user.id;

    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Login Error:', err);
    return res.redirect('/login.html?error=Server%20error');
  }
};

exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout Error:', err);
      return res.status(500).send('Logout failed');
    }
    res.redirect('/login.html');
  });
};
