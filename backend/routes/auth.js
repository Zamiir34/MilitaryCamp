const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.isActive) return res.status(403).json({ message: 'Account is deactivated' });

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'military_secret_2024',
      { expiresIn: '8h' }
    );

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

// Logout (client-side handles token removal, but we track it)
// Toggle duty status
router.put('/duty', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isOnDuty = !user.isOnDuty;
    await user.save();
    res.json({ isOnDuty: user.isOnDuty, message: `Duty status: ${user.isOnDuty ? 'ON' : 'OFF'}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
