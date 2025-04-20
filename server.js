const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const app = express();
const PORT = 3000;
const bcrypt = require('bcrypt');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,'public')));
app.use(express.json());

//middleware express
app.use(session({
    secret: '7d11ad7ed8cb43732e5c5497ab8689bb141fd3f948e6c24jnuguon',
    resave: false,
    saveUninitialized: false,
    cookie: {secure: false,
        maxAge: 1000 * 60 * 60 * 24 

    }
}));

//login route
app.post('/login', (req, res) => {
    const { email, password } = req.body;
  
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) {
        return res.status(500).send('Server error');
      }
  
      if (results.length === 0) {
        return res.status(400).send('Invalid email or password');
      }
  
      const user = results[0];
  
      bcrypt.compare(password, user.password, (err, match) => {
        if (err || !match) {
          return res.status(400).send('Invalid email or password');
        }
  
        // Store user details in session
        req.session.user = {
            id: user.id,
            firstname: user.firstname,           // IMPORTANT: This must match the field your dashboard needs
            email: user.email,
            user_type: user.user_type
          };
  
        // Redirect to dashboard
        res.redirect('/dashboard');
      });
    });
});
  //dashbord route protection
  app.get('/dashboard', (req, res) => {
    if (req.session.user) {  // Check if the user is logged in (session exists)
      res.send(`Welcome ${req.session.user.firstname}`); // Show the dashboard to the logged-in user
    } else {
      res.redirect('/login.html');  // Redirect to the login page if not logged in
    }
  });

  //logout route
  app.get('/logout', (req, res) => {
    req.session.destroy((err) => {  // Destroy the session
      if (err) throw err;
      res.redirect('/login.html'); // Redirect to login page after logging out
    });
  });

  //sign up route
  app.post('/signup', async (req, res) => {
    const { email, password, firstname, lastname, birthdate, gender, institution, field, user_type } = req.body;
  
    try {
      // Check if user already exists
      const [existingUsers] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
  
      if (existingUsers.length > 0) {
        return res.status(400).send('Email already taken.');
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Insert new user
      const insertQuery = `
        INSERT INTO users (email, password, firstname, lastname, birthdate, gender, institution, field, user_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.promise().query(insertQuery, [
        email, hashedPassword, firstname, lastname, birthdate, gender, institution, field, user_type,
      ]);
  
      res.send('User registered successfully!');
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).send('Server error');
    }
  });




  //api route

  app.get('/api/user', (req, res) => {
    if (req.session && req.session.user) {
      res.json({
        name: req.session.user.firstname,  // or whatever key you're using
        email: req.session.user.email,
        user_type: req.session.user.user_type
      });
    } else {
      res.status(401).json({ error: 'Not logged in' });
    }
  });

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'MySql@123',
    database: 'exam_platform'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to database');
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
