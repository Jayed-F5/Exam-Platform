const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000; // simple and fixed

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'your_secret_key_here',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Routes
app.use('/', require('./quizzy/routes/authRoutes'));
app.use('/', require('./quizzy/routes/dashboardRoutes')); // ✅ fix here too (was wrong)
app.use('/', require('./quizzy/routes/examRoute'));

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:3000`);
});
