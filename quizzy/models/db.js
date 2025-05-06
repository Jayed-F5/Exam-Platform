const mysql = require('mysql2');

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

module.exports = db;
