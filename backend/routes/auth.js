const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { auth } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/email');
const { format } = require('date-fns');
const { resolveGuardZone, syncGuardZone } = require('../utils/guardZone');
const { cleanStringFields, sendValidationError, validateObjectId, validatePassword, validationError } = require('../utils/validation');

/** Generate a secure 6-digit OTP */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function userPayload(user) {
  if (user.role === 'Guard') {
    await syncGuardZone(user);
  }
  const payload = user.toJSON();
  if (user.role === 'Guard') {
    const zone = await resolveGuardZone(user);
    if (zone) payload.assignedZone = zone;
  }
  return payload;
}

// Login
router.post('/login', async (req, res) => {
  try {
    cleanStringFields(req.body, ['email']);
    const { email, password } = req.body;

    if (!email) throw validationError('Email is required.', 'email');
    if (!password) throw validationError('Password is required.', 'password');

    const user = await User.findOne({ email: new RegExp('^' + email.trim() + '$', 'i') });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
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

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    let attendance = await Attendance.findOne({ user: user._id, date: dateStr });
    
    if (attendance && attendance.checkOutTime) {
      user.isOnDuty = false;
    } else {
      user.isOnDuty = true; // Auto check-in
      if (!attendance) {
        await Attendance.create({ user: user._id, date: dateStr, checkInTime: new Date(), status: 'On Duty' });
      }
    }
    
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'military_secret_2024',
      { expiresIn: '8h' }
    );

    res.json({ token, user: await userPayload(user) });
  } catch (err) {
    sendValidationError(res, err);
  }
});

// Verify Email OTP
router.post('/verify-email', async (req, res) => {
  try {
    cleanStringFields(req.body, ['userId', 'code']);
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ message: 'userId and code are required' });
    validateObjectId(userId, 'userId');

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

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    user.lastLogin = new Date();

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    let attendance = await Attendance.findOne({ user: user._id, date: dateStr });
    
    if (attendance && attendance.checkOutTime) {
      user.isOnDuty = false;
    } else {
      user.isOnDuty = true; // Auto check-in
      if (!attendance) {
        await Attendance.create({ user: user._id, date: dateStr, checkInTime: new Date(), status: 'On Duty' });
      }
    }

    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'military_secret_2024',
      { expiresIn: '8h' }
    );

    res.json({ token, user: await userPayload(user) });
  } catch (err) {
    sendValidationError(res, err);
  }
});

// Resend Verification
router.post('/resend-verification', async (req, res) => {
  try {
    cleanStringFields(req.body, ['userId']);
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    validateObjectId(userId, 'userId');

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
    sendValidationError(res, err);
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json(await userPayload(req.user));
});

// Toggle duty status
router.put('/duty', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    let attendance = await Attendance.findOne({ user: user._id, date: dateStr });
    
    const isCurrentlyOnDuty = user.isOnDuty;

    if (!isCurrentlyOnDuty) {
      // Trying to Resume Duty
      if (attendance && attendance.checkOutTime) {
        return res.status(400).json({ message: 'Waxaad horey u joojisay shaqada maanta. Fadlan bari soo laabo. (You have already completed your shift today)' });
      }
      user.isOnDuty = true;
      if (!attendance) {
        await Attendance.create({ user: user._id, date: dateStr, checkInTime: new Date(), status: 'On Duty' });
      }
    } else {
      // Trying to Stop Duty
      user.isOnDuty = false;
      if (attendance && !attendance.checkOutTime) {
        attendance.checkOutTime = new Date();
        await attendance.save();
      }
    }

    await user.save();
    res.json({ isOnDuty: user.isOnDuty, message: `Duty status: ${user.isOnDuty ? 'ON' : 'OFF'}` });
  } catch (err) {
    sendValidationError(res, err);
  }
});

module.exports = router;
