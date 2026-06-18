const express = require('express');
const router = express.Router();
const Personnel = require('../models/Personnel');
const Visitor = require('../models/Visitor');
const Vehicle = require('../models/Vehicle');

// Public identity verification route
router.get('/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check personnel first
    let subject = await Personnel.findOne({ personnelId: id });
    let type = 'Personnel';
    
    if (!subject) {
      subject = await Visitor.findOne({ visitorId: id });
      type = 'Visitor';
    }

    if (!subject) {
        subject = await Vehicle.findOne({ vehicleId: id });
        type = 'Vehicle';
    }
    
    if (!subject) {
      return res.status(404).json({ message: 'Identity not found in camp records.' });
    }
    
    const result = {
      fullName: subject.fullName || subject.plateNumber,
      rank: subject.rank || '',
      unit: subject.unit || subject.organization || subject.model || '',
      status: subject.status,
      photo: subject.photo,
      type: type,
      id: id,
      verifiedAt: new Date()
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require('../utils/email');

// Visitor OTP Request
router.post('/visitor-auth/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Find the most recently created Approved visitor with this email
    const visitor = await Visitor.findOne({ email: new RegExp('^' + email + '$', 'i'), status: 'Approved' })
      .sort({ createdAt: -1 });

    if (!visitor) {
      return res.status(404).json({ message: 'No approved visitor record found for this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    visitor.otpCode = otp;
    visitor.otpExpires = new Date(Date.now() + 15 * 60000); // 15 mins
    await visitor.save();

    await sendVerificationEmail(visitor.email, visitor.fullName, otp);

    res.json({ message: 'OTP sent successfully', visitorId: visitor.visitorId, emailMasked: email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + '*'.repeat(gp3.length)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Visitor OTP Verify
router.post('/visitor-auth/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and OTP code are required' });

    const visitor = await Visitor.findOne({ email: new RegExp('^' + email + '$', 'i'), status: 'Approved' })
      .sort({ createdAt: -1 });

    if (!visitor) {
      return res.status(404).json({ message: 'Visitor record not found' });
    }

    if (!visitor.otpCode || visitor.otpCode !== code || new Date() > visitor.otpExpires) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP
    visitor.otpCode = undefined;
    visitor.otpExpires = undefined;
    await visitor.save();

    // Issue token
    const token = jwt.sign(
      { visitorId: visitor.visitorId, role: 'Visitor' },
      process.env.JWT_SECRET || 'military_secret_2024',
      { expiresIn: '12h' }
    );

    res.json({ token, visitor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Visitor Me (Verify Token)
router.get('/visitor-auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'military_secret_2024');
    if (decoded.role !== 'Visitor') return res.status(401).json({ message: 'Unauthorized role' });

    const visitor = await Visitor.findOne({ visitorId: decoded.visitorId });
    if (!visitor || visitor.status !== 'Approved') return res.status(401).json({ message: 'Visitor not found or not approved' });

    res.json(visitor);
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;
