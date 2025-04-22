const path = require('path');

exports.showDashboard = (req, res) => {
  if (req.session && req.session.user) {
    res.sendFile(path.join(__dirname, '../../public/dashboard.html'));
  } else {
    res.redirect('/login.html');
  }
};

  
  exports.getUserData = (req, res) => {
    if (req.session && req.session.user) {
      res.json({
        name: req.session.user.firstname,
        email: req.session.user.email,
      });
    } else {
      res.status(401).json({ error: 'Not logged in' });
    }
  };
  