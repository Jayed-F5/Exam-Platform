const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000; // Server port

// ======================== Middleware ========================
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.json()); // Parse JSON bodies
app.use(session({
  secret: 'your_secret_key_here', // Session secret
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day cookie expiration
}));

// ======================== Routes ========================
// Authentication routes
app.use('/', require('./quizzy/routes/authRoutes'));

// Dashboard routes
app.use('/', require('./quizzy/routes/dashboardRoutes'));

// Exam-related routes
app.use('/', require('./quizzy/routes/examRoute'));

// ======================== HTML Pages ========================
// Home page
app.get('/', (req, res) => {
  if (req.session?.user) {
    return res.redirect('/dashboard.html');
  }
  res.sendFile(path.join(__dirname, 'public/html/index.html'));
});

// Login page
app.get('/login.html', (req, res) => {
  if (req.session?.user) {
    return res.redirect('/dashboard.html');
  }
  res.sendFile(path.join(__dirname, 'public/html/login.html'));
});

// Signup page
app.get('/signup.html', (req, res) => {
  if (req.session?.user) {
    return res.redirect('/dashboard.html');
  }
  res.sendFile(path.join(__dirname, 'public/html/signup.html'));
});

// Dashboard page
app.get('/dashboard.html', (req, res) => {
  if (!req.session?.user) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'public/html/dashboard.html'));
});

// Create exam page
app.get('/create-exam.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/create-exam.html'));
});

// Add questions page
app.get('/add-questions.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/add-questions.html'));
});

// Edit questions page
app.get('/edit-questions.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/edit-questions.html'));
});

// My exams page
app.get('/my-exams.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/my-exams.html'));
});

// Take exam page
app.get('/take-exam.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/take-exam.html'));
});

// Fallback to index.html
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/index.html'));
});

// ======================== Start Server ========================
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
