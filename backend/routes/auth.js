const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/email');

/** Generate a secure 6-digit OTP */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Login ───────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.isActive) return res.status(403).json({ message: 'Account is deactivated' });

    // If email is not yet verified, send OTP and ask for verification
    if (!user.isEmailVerified) {
      const code = generateOTP();
      user.emailVerificationCode = code;
      user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      await user.save();
      await sendVerificationEmail(user.email, user.fullName, code);
      return res.json({
        requireVerification: true,
        userId: user._id,
        email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // mask email
      });
    }

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

// ─── Verify Email OTP ────────────────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ message: 'userId and code are required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
    }

    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    if (user.emailVerificationCode !== code.trim()) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Mark as verified and clear code
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
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

// ─── Resend Verification ─────────────────────────────────────────────────────
router.post('/resend-verification', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isEmailVerified) return res.status(400).json({ message: 'Email is already verified' });

    const code = generateOTP();
    user.emailVerificationCode = code;
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    await sendVerificationEmail(user.email, user.fullName, code);

    res.json({ message: 'Verification code sent successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get current user ────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

// ─── Toggle duty status ──────────────────────────────────────────────────────
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
