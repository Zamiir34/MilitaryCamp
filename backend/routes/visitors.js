const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const Message = require('../models/Message');
const EntryLog = require('../models/EntryLog');
const crypto = require('crypto');
const { auth, requireRole } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/email');

const generateId = () => 'VIS' + Date.now().toString().slice(-7);

router.get('/', auth, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { idNumber: { $regex: search, $options: 'i' } },
      { visitorId: { $regex: search, $options: 'i' } },
      { organization: { $regex: search, $options: 'i' } }
    ];
    if (status) query.status = status;
    
    // Data Isolation: Non-admins only see records created after they joined
    if (req.user.role !== 'Administrator') {
      query.createdAt = { $gte: req.user.createdAt };
    }

    const total = await Visitor.countDocuments(query);
    const visitors = await Visitor.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ data: visitors, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const v = await Visitor.findById(req.params.id);
    if (!v) return res.status(404).json({ message: 'Not found' });
    res.json(v);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (!req.body.photo) {
      return res.status(400).json({ message: req.body.visitorType === 'Military' ? 'Military ID card photo is required' : 'Visitor photo is required' });
    }
    if (!req.body.email) {
      return res.status(400).json({ message: 'Email is required to register a visitor' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      return res.status(400).json({ message: 'A valid real email address is required' });
    }

    const visitorData = { ...req.body };
    if (visitorData.visitorType === 'Military') {
      if (!visitorData.fullName || visitorData.fullName.trim() === '') {
        visitorData.fullName = 'Military Visitor';
      }
      if (!visitorData.idNumber || visitorData.idNumber.trim() === '') {
        visitorData.idNumber = 'MIL-' + Date.now().toString().slice(-6);
      }
      if (!visitorData.purposeOfVisit || visitorData.purposeOfVisit.trim() === '') {
        visitorData.purposeOfVisit = 'Facility Access / Official Visit';
      }
    }

    if (visitorData.idNumber) {
      const existingVisitor = await Visitor.findOne({ idNumber: visitorData.idNumber });
      if (existingVisitor) {
        return res.status(400).json({ message: `ID Number is already registered for visitor: ${existingVisitor.fullName}` });
      }
    }

    const visitorId = generateId();
    const qrData = JSON.stringify({ type: 'Visitor', id: visitorId, name: visitorData.fullName });
    const qrCode = await QRCode.toDataURL(qrData);
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const visitor = new Visitor({ 
      ...visitorData, 
      visitorId, 
      qrCode, 
      createdBy: req.user._id,
      otpCode: otp,
      otpExpires: new Date(Date.now() + 15 * 60000) // 15 mins
    });
    await visitor.save();

    // Send OTP email
    try {
      await sendVerificationEmail(visitor.email, visitor.fullName, otp);
    } catch (emailErr) {
      console.error('Failed to send visitor OTP email:', emailErr.message);
    }

    // Automatically record an entry log for the registered person so they appear in the daily report
    try {
      const logId = 'LOG' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase();
      const entryLog = new EntryLog({
        logId,
        type: 'Visitor',
        action: 'Entry',
        visitor: visitor._id,
        subjectName: visitor.fullName,
        subjectId: visitor.visitorId,
        gate: 'Main Gate',
        entryTime: new Date(),
        recordedBy: req.user._id,
        recordedByName: req.user.fullName,
        isAuthorized: true,
        purpose: visitor.purposeOfVisit || 'Visit'
      });
      await entryLog.save();
    } catch (logErr) {
      console.error('Failed to create automatic EntryLog for registered visitor:', logErr);
    }

    // Auto-notify host if they are a system user
    if (visitorData.hostName) {
      try {
        const host = await User.findOne({ 
          fullName: { $regex: new RegExp('^' + visitorData.hostName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, 
          isActive: true 
        });
        
        if (host) {
          const messageContent = `${visitorData.fullName}: waxaa kuu yimid qof ku doonaya, ma soodeeyaa mise waan ciliyaa?`;
          const message = await Message.create({
            sender: req.user._id,
            recipient: host._id,
            content: messageContent
          });

          const io = req.app.get('io');
          if (io) {
            const populated = await message.populate('sender', 'fullName role rank');
            io.to(host._id.toString()).emit('new_message', populated);
          }
        }
      } catch (notifyErr) {
        console.warn('Host notification failed:', notifyErr.message);
      }
    }

    res.status(201).json(visitor);
  } catch (err) {
    console.error('Visitor registration error:', err);
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: new Date() };
    if (updateData.visitorType === 'Military') {
      if (!updateData.fullName || updateData.fullName.trim() === '') {
        updateData.fullName = 'Military Visitor';
      }
      if (!updateData.idNumber || updateData.idNumber.trim() === '') {
        updateData.idNumber = 'MIL-' + Date.now().toString().slice(-6);
      }
      if (!updateData.purposeOfVisit || updateData.purposeOfVisit.trim() === '') {
        updateData.purposeOfVisit = 'Facility Access / Official Visit';
      }
    }
    if (req.user.role === 'Guard') {
      const dateStr = new Date().toLocaleString('en-US');
      const logMsg = `[Guard ${req.user.fullName} updated record on ${dateStr}]`;
      updateData.notes = updateData.notes ? `${updateData.notes} | ${logMsg}` : logMsg;
    }

    if (updateData.idNumber) {
      const existingVisitor = await Visitor.findOne({ idNumber: updateData.idNumber });
      if (existingVisitor && existingVisitor._id.toString() !== req.params.id) {
        return res.status(400).json({ message: `ID Number is already registered for visitor: ${existingVisitor.fullName}` });
      }
    }

    const visitor = await Visitor.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!visitor) return res.status(404).json({ message: 'Not found' });
    res.json(visitor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    await Visitor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Visitor deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
