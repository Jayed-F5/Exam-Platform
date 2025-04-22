exports.showDashboard = (req, res) => {
    if (req.session && req.session.user) {
      res.send(`Welcome ${req.session.user.firstname}`);
    } else {
      res.redirect('/login.html');
    }
  };
  
  exports.getUserData = (req, res) => {
    if (req.session && req.session.user) {
      res.json({
        name: req.session.user.firstname,
        email: req.session.user.email,
        user_type: req.session.user.user_type
      });
    } else {
      res.status(401).json({ error: 'Not logged in' });
    }
  };
  