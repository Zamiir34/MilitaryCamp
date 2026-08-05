const express = require('express');
const router = express.Router();
const Personnel = require('../models/Personnel');
const Visitor = require('../models/Visitor');
const Vehicle = require('../models/Vehicle');
const { cleanStringFields, escapeRegex, sendValidationError, validateEmail, validationError } = require('../utils/validation');

// Public identity verification â€” used when a QR code is scanned
router.get('/verify/:id', async (req, res) => {
  try {
    const id = req.params.id?.trim();
    if (!id) throw validationError('Verification ID is required.', 'id');

    let subject = await Personnel.findOne({ personnelId: id });
    if (subject) {
      return res.json({
        type: 'Personnel',
        id: subject.personnelId,
        fullName: subject.fullName,
        rank: subject.rank || '',
        unit: subject.unit || '',
        militaryId: subject.militaryId || '',
        status: subject.status || 'Active',
        photo: subject.photo || '',
        phone: subject.phone || '',
        hasVehicle: !!subject.hasVehicle,
        vehiclePlate: subject.vehicleDetails?.plateNumber || '',
        vehicleModel: subject.vehicleDetails?.model || '',
        authorizedZones: subject.authorizedZones || [],
        verifiedAt: new Date(),
      });
    }

    subject = await Visitor.findOne({ visitorId: id });
    if (subject) {
      return res.json({
        type: 'Visitor',
        id: subject.visitorId,
        fullName: subject.fullName,
        visitorType: subject.visitorType || '',
        organization: subject.organization || '',
        purposeOfVisit: subject.purposeOfVisit || '',
        hostName: subject.hostName || '',
        idNumber: subject.idNumber || '',
        status: subject.status || 'Pending',
        photo: subject.photo || '',
        phone: subject.phone || '',
        email: subject.email || '',
        visitDate: subject.visitDate || subject.createdAt,
        hasVehicle: !!subject.hasVehicle,
        vehiclePlate: subject.vehiclePlate || '',
        vehicleModel: subject.vehicleModel || '',
        vehicleColor: subject.vehicleColor || '',
        verifiedAt: new Date(),
      });
    }

    subject = await Vehicle.findOne({
      $or: [{ vehicleId: id }, { plateNumber: new RegExp(`^${escapeRegex(id)}$`, 'i') }],
    });
    if (subject) {
      return res.json({
        type: 'Vehicle',
        id: subject.vehicleId,
        fullName: subject.plateNumber,
        plateNumber: subject.plateNumber,
        vehicleType: subject.vehicleType || '',
        make: subject.make || '',
        model: subject.model || '',
        color: subject.color || '',
        ownerName: subject.ownerName || '',
        ownerPhone: subject.ownerPhone || '',
        category: subject.category || '',
        status: subject.status || 'Active',
        isAuthorized: !!subject.isAuthorized,
        photo: subject.photo || '',
        verifiedAt: new Date(),
      });
    }

    return res.status(404).json({ message: 'Identity not found in camp records.' });
  } catch (err) {
    sendValidationError(res, err);
  }
});

const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require('../utils/email');

// Visitor OTP Request
router.post('/visitor-auth/request-otp', async (req, res) => {
  try {
    cleanStringFields(req.body, ['email']);
    const email = validateEmail(req.body.email);

    // Find the most recently created Approved visitor with this email
    const visitor = await Visitor.findOne({ email: new RegExp('^' + escapeRegex(email) + '$', 'i'), status: 'Approved' })
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
    sendValidationError(res, err);
  }
});

// Visitor OTP Verify
router.post('/visitor-auth/verify-otp', async (req, res) => {
  try {
    cleanStringFields(req.body, ['email', 'code']);
    const email = validateEmail(req.body.email);
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Email and OTP code are required' });

    const visitor = await Visitor.findOne({ email: new RegExp('^' + escapeRegex(email) + '$', 'i'), status: 'Approved' })
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
    sendValidationError(res, err);
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

