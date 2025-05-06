const bcrypt = require('bcrypt');
const UserModel = require('../models/User');

// SIGNUP
// Handles user signup by creating a new user account
exports.signup = async (req, res) => {
  const {
    email, password, firstname, lastname,
    birthdate, gender, institution, field
  } = req.body;

  try {
    // Check if a user with the given email already exists
    const existingUser = await UserModel.getUserByEmail(email);
    if (existingUser) {
      return res.redirect('/signup.html?error=Email%20already%20taken');
    }

    // Hash the user's password for secure storage
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user in the database
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

    // Redirect to the login page with a success message
    return res.redirect('/login.html?success=Account%20created%20successfully');
  } catch (err) {
    // Log the error and redirect to the signup page with an error message
    console.error('Signup Error:', err);
    return res.redirect('/signup.html?error=Server%20error');
  }
};

// LOGIN
// Handles user login by validating credentials and starting a session
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Retrieve the user by email
    const user = await UserModel.getUserByEmail(email);
    if (!user) {
      return res.redirect('/login.html?error=Invalid%20email%20or%20password');
    }

    // Compare the provided password with the stored hashed password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.redirect('/login.html?error=Invalid%20email%20or%20password');
    }

    // Store user information in the session
    req.session.user = {
      id: user.id,
      firstname: user.firstname,
      email: user.email
    };
    req.session.userId = user.id;

    // Redirect to the dashboard
    return res.redirect('/dashboard');
  } catch (err) {
    // Log the error and redirect to the login page with an error message
    console.error('Login Error:', err);
    return res.redirect('/login.html?error=Server%20error');
  }
};

// LOGOUT
// Handles user logout by destroying the session
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      // Log the error and send a failure response
      console.error('Logout Error:', err);
      return res.status(500).send('Logout failed');
    }
    // Redirect to the login page after successful logout
    res.redirect('/login.html');
  });
};
