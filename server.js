const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000; 

app.use(express.static(path.join(__dirname, 'public'))); 
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(express.json()); 
app.use(session({
  secret: 'your_secret_key_here',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } 
}));


app.use('/', require('./quizzy/routes/authRoutes'));

app.use('/', require('./quizzy/routes/dashboardRoutes'));

app.use('/', require('./quizzy/routes/examRoute'));

app.get('/', (req, res) => {
  if (req.session?.user) {
    return res.redirect('/dashboard.html');
  }
  res.sendFile(path.join(__dirname, 'public/html/index.html'));
});

app.get('/login.html', (req, res) => {
  if (req.session?.user) {
    return res.redirect('/dashboard.html');
  }
  res.sendFile(path.join(__dirname, 'public/html/login.html'));
});

app.get('/signup.html', (req, res) => {
  if (req.session?.user) {
    return res.redirect('/dashboard.html');
  }
  res.sendFile(path.join(__dirname, 'public/html/signup.html'));
});

app.get('/dashboard.html', (req, res) => {
  if (!req.session?.user) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'public/html/dashboard.html'));
});

app.get('/create-exam.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/create-exam.html'));
});

app.get('/add-questions.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/add-questions.html'));
});

app.get('/edit-questions.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/edit-questions.html'));
});

app.get('/my-exams.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/my-exams.html'));
});

app.get('/take-exam.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/take-exam.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
