const express = require('express');
const router = express.Router();
const { buildVerifyQrDataUrl } = require('../utils/verifyUrl');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Message = require('../models/Message');
const EntryLog = require('../models/EntryLog');
const crypto = require('crypto');
const { auth, requireRole } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/email');
const {
  cleanStringFields,
  escapeRegex,
  requireFields,
  sendValidationError,
  validateEmail,
  validateEnum,
  validateObjectId,
  validatePositiveInt,
  validationError,
} = require('../utils/validation');

const generateId = () => 'VIS' + Date.now().toString().slice(-7);
const visitorTypes = ['Military', 'Civilian'];
const visitorStatuses = ['Pending', 'Approved', 'Denied', 'Completed'];

const normalizeVisitorPayload = (body, { partial = false } = {}) => {
  cleanStringFields(body, [
    'fullName', 'visitorType', 'idNumber', 'phone', 'email', 'organization', 'purposeOfVisit',
    'hostName', 'expectedDuration', 'photo', 'vehiclePlate', 'vehicleModel', 'vehicleColor',
    'status', 'notes'
  ]);

  if (body.email !== undefined) body.email = validateEmail(body.email, 'email', !partial);
  if (body.visitorType !== undefined) body.visitorType = validateEnum(body.visitorType, visitorTypes, 'visitorType', !partial);
  if (body.status !== undefined) body.status = validateEnum(body.status, visitorStatuses, 'status', false);

  if (!partial) {
    requireFields(body, ['visitorType', 'email', 'photo']);
  }

  if (!partial) {
    requireFields(body, ['fullName', 'idNumber', 'purposeOfVisit']);
  }

  if (body.hasVehicle && !body.vehiclePlate) {
    throw validationError('Vehicle plate is required when visitor has a vehicle.', 'vehiclePlate');
  }
};

router.get('/', auth, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const query = {};
    const pageNum = validatePositiveInt(page, 'page', 1);
    const limitNum = validatePositiveInt(limit, 'limit', 20);

    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { fullName: { $regex: escapedSearch, $options: 'i' } },
        { idNumber: { $regex: escapedSearch, $options: 'i' } },
        { visitorId: { $regex: escapedSearch, $options: 'i' } },
        { organization: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    if (status) query.status = validateEnum(status, visitorStatuses, 'status');

    // Data Isolation: Non-admins only see records created after they joined
    if (req.user.role !== 'Administrator') {
      query.createdAt = { $gte: req.user.createdAt };
    }

    const total = await Visitor.countDocuments(query);
    const visitors = await Visitor.find(query)
      .select('-photo -qrCode -otpCode -otpExpires')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({ data: visitors, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    sendValidationError(res, err);
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    validateObjectId(req.params.id);
    const v = await Visitor.findById(req.params.id).select('-otpCode -otpExpires');
    if (!v) return res.status(404).json({ message: 'Not found' });
    res.json(v);
  } catch (err) {
    sendValidationError(res, err);
  }
});

router.post('/', auth, async (req, res) => {
  try {
    normalizeVisitorPayload(req.body);

    const existingEmail = await Visitor.findOne({ email: new RegExp('^' + escapeRegex(req.body.email) + '$', 'i') });
    if (existingEmail) {
      return res.status(400).json({ message: `Email is already registered for visitor: ${existingEmail.fullName}` });
    }

    const visitorData = { ...req.body };

    if (visitorData.photo && visitorData.photo.length > 100) {
      const existingVisitorPhoto = await Visitor.findOne({ photo: visitorData.photo });
      const existingPersonnelPhoto = await require('../models/Personnel').findOne({ photo: visitorData.photo });
      if (existingVisitorPhoto || existingPersonnelPhoto) {
        return res.status(400).json({ message: 'Sawirkaan horay ayaa loo isticmaalay. Fadlan sawir cusub qaad (This photo has already been used).' });
      }
    }

    if (visitorData.idNumber) {
      const existingVisitor = await Visitor.findOne({ idNumber: visitorData.idNumber });
      if (existingVisitor) {
        return res.status(400).json({ message: `ID Number is already registered for visitor: ${existingVisitor.fullName}` });
      }
    }

    if (visitorData.hasVehicle && visitorData.vehiclePlate) {
      const plateRegex = new RegExp('^' + escapeRegex(visitorData.vehiclePlate) + '$', 'i');
      const existingVisitorWithPlate = await Visitor.findOne({
        vehiclePlate: plateRegex,
        status: { $in: ['Pending', 'Approved'] }
      });
      if (existingVisitorWithPlate) {
        return res.status(400).json({ message: `Vehicle plate is already in use by active visitor: ${existingVisitorWithPlate.fullName}` });
      }

      const existingVehicle = await Vehicle.findOne({ plateNumber: plateRegex });
      if (existingVehicle) {
        return res.status(400).json({ message: 'Vehicle plate is already registered to a permanent vehicle.' });
      }
    }

    const visitorId = generateId();
    const qrCode = await buildVerifyQrDataUrl(visitorId);

    // Generate OTP
    const visitor = new Visitor({
      ...visitorData,
      visitorId,
      qrCode,
      createdBy: req.user._id
    });
    await visitor.save();

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
          fullName: { $regex: new RegExp('^' + escapeRegex(visitorData.hostName) + '$', 'i') },
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
    sendValidationError(res, err);
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    validateObjectId(req.params.id);
    normalizeVisitorPayload(req.body, { partial: true });

    const updateData = { ...req.body, updatedAt: new Date() };
    if (req.user.role === 'Guard') {
      const dateStr = new Date().toLocaleString('en-US');
      const logMsg = `[Guard ${req.user.fullName} updated record on ${dateStr}]`;
      updateData.notes = updateData.notes ? `${updateData.notes} | ${logMsg}` : logMsg;
    }

    if (updateData.photo && updateData.photo.length > 100) {
      const existingVisitorPhoto = await Visitor.findOne({ photo: updateData.photo, _id: { $ne: req.params.id } });
      const existingPersonnelPhoto = await require('../models/Personnel').findOne({ photo: updateData.photo });
      if (existingVisitorPhoto || existingPersonnelPhoto) {
        return res.status(400).json({ message: 'Sawirkaan horay ayaa loo isticmaalay. Fadlan sawir cusub qaad (This photo has already been used).' });
      }
    }

    if (updateData.idNumber) {
      const existingVisitor = await Visitor.findOne({ idNumber: updateData.idNumber });
      if (existingVisitor && existingVisitor._id.toString() !== req.params.id) {
        return res.status(400).json({ message: `ID Number is already registered for visitor: ${existingVisitor.fullName}` });
      }
    }

    if (updateData.email) {
      const existingEmail = await Visitor.findOne({ email: new RegExp('^' + escapeRegex(updateData.email) + '$', 'i') });
      if (existingEmail && existingEmail._id.toString() !== req.params.id) {
        return res.status(400).json({ message: `Email is already registered for visitor: ${existingEmail.fullName}` });
      }
    }

    if (updateData.hasVehicle && updateData.vehiclePlate) {
      const plateRegex = new RegExp('^' + escapeRegex(updateData.vehiclePlate) + '$', 'i');
      const existingVisitorWithPlate = await Visitor.findOne({
        vehiclePlate: plateRegex,
        status: { $in: ['Pending', 'Approved'] }
      });
      if (existingVisitorWithPlate && existingVisitorWithPlate._id.toString() !== req.params.id) {
        return res.status(400).json({ message: `Vehicle plate is already in use by active visitor: ${existingVisitorWithPlate.fullName}` });
      }

      const existingVehicle = await Vehicle.findOne({ plateNumber: plateRegex });
      if (existingVehicle) {
        return res.status(400).json({ message: 'Vehicle plate is already registered to a permanent vehicle.' });
      }
    }

    const visitor = await Visitor.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!visitor) return res.status(404).json({ message: 'Not found' });
    res.json(visitor);
  } catch (err) {
    sendValidationError(res, err);
  }
});

router.delete('/:id', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    validateObjectId(req.params.id);
    await Visitor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Visitor deleted' });
  } catch (err) {
    sendValidationError(res, err);
  }
});

module.exports = router;
