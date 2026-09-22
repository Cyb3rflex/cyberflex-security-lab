const db = require('../database/db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');

function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required.' });
  }

  // Vulnerability M06: Differential error messages leaking valid usernames
  const user = db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) {
    return res.status(401).json({ success: false, error: 'User does not exist.' });
  }

  if (user.password !== password) {
    return res.status(401).json({ success: false, error: 'Incorrect password.' });
  }

  // Successful login! Issue session cookie and JWT
  const sessionUser = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    role: user.role
  };

  const token = jwt.sign(sessionUser, JWT_SECRET, { expiresIn: '8h' });

  // Set cookies
  res.cookie('cfx_session', token, { httpOnly: false }); // httpOnly: false intentionally to allow student inspection in devtools
  res.cookie('cfx_user_id', user.id.toString(), { httpOnly: false });

  logActivity(1, 'USER_LOGIN', `Authenticated as ${user.username} (${user.role})`);

  let responseData = {
    success: true,
    message: 'Login successful.',
    user: sessionUser,
    token
  };

  // If logged in as admin with default credentials, award / hint flag
  if (user.username === 'admin') {
    responseData.flag = 'CFX{w34k_cr3ds_br0k3n_4uth}';
    responseData.flagNote = 'Authentication Bypass Successful: Flag CFX{w34k_cr3ds_br0k3n_4uth}';
  }

  res.json(responseData);
}

function register(req, res) {
  const { username, password, full_name, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ success: false, error: 'Username, password, and email required.' });
  }

  try {
    const existing = db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Username or email already in use.' });
    }

    const result = db.run(
      'INSERT INTO users (username, password, full_name, email, role, balance) VALUES (?, ?, ?, ?, ?, ?)',
      [username, password, full_name || username, email, 'customer', 500.00]
    );

    const newUser = {
      id: Number(result.lastInsertRowid),
      username,
      full_name: full_name || username,
      email,
      role: 'customer'
    };

    const token = jwt.sign(newUser, JWT_SECRET, { expiresIn: '8h' });
    res.cookie('cfx_session', token, { httpOnly: false });

    res.json({ success: true, message: 'Registration successful.', user: newUser, token });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function resetPassword(req, res) {
  const { username, recoveryPin, newPassword } = req.body;

  if (!username || !recoveryPin || !newPassword) {
    return res.status(400).json({ success: false, error: 'Username, recoveryPin, and newPassword are required.' });
  }

  // Check user bio/vault for recovery PIN (Mission 15)
  const user = db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  // Admin PIN is 849201 as discovered via IDOR in Mission 15
  if (recoveryPin.trim() !== '849201') {
    return res.status(403).json({ success: false, error: 'Invalid recovery PIN. Access denied.' });
  }

  // Update password
  db.run('UPDATE users SET password = ? WHERE id = ?', [newPassword, user.id]);

  res.json({
    success: true,
    message: 'Password successfully reset via recovery PIN. You may now log in with your new credentials.',
    hint: 'Log in as admin to access the confidential audit vault!'
  });
}

function logout(req, res) {
  res.clearCookie('cfx_session');
  res.clearCookie('cfx_user_id');
  res.json({ success: true, message: 'Logged out successfully.' });
}

function getCurrentUser(req, res) {
  if (!req.user) {
    return res.json({ success: true, authenticated: false, user: null });
  }
  res.json({ success: true, authenticated: true, user: req.user });
}

module.exports = {
  login,
  register,
  resetPassword,
  logout,
  getCurrentUser
};
