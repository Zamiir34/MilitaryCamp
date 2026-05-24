const express = require('express');
const router = express.Router();
const { randomBytes } = require('crypto');
const EntryLog = require('../models/EntryLog');
const Alert = require('../models/Alert');
const { auth } = require('../middleware/auth');

// Collision-resistant IDs: timestamp (base36) + 3 random bytes
const generateLogId = () => 'LOG' + Date.now().toString(36).toUpperCase() + randomBytes(3).toString('hex').toUpperCase();
const generateAlertId = () => 'ALT' + Date.now().toString(36).toUpperCase() + randomBytes(3).toString('hex').toUpperCase();

// Get all entries
router.get('/', auth, async (req, res) => {
  try {
    const { search, type, action, date, gate, page = 1, limit = 30 } = req.query;
    const query = {};
    if (search) query.$or = [
      { subjectName: { $regex: search, $options: 'i' } },
      { subjectId: { $regex: search, $options: 'i' } },
      { logId: { $regex: search, $options: 'i' } }
    ];
    if (type) query.type = type;
    if (action) query.action = action;
    if (gate) query.gate = gate;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.createdAt = { $gte: start, $lt: end };
    }

    // Data Isolation: Non-admins only see records created after they joined
    if (req.user.role !== 'Administrator') {
      if (!query.createdAt) query.createdAt = {};
      const userJoinDate = new Date(req.user.createdAt);
      if (query.createdAt.$gte) {
        query.createdAt.$gte = new Date(Math.max(new Date(query.createdAt.$gte), userJoinDate));
      } else {
        query.createdAt.$gte = userJoinDate;
      }
    }

    const total = await EntryLog.countDocuments(query);
    const logs = await EntryLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ data: logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Record entry
router.post('/entry', auth, async (req, res) => {
  try {
    const { type, subjectName } = req.body;
    if (!type) return res.status(400).json({ message: 'Type is required (Personnel, Vehicle, or Visitor)' });
    if (!subjectName || (typeof subjectName === 'string' && !subjectName.trim())) {
      return res.status(400).json({ message: 'Subject name is required' });
    }

    const logId = generateLogId();
    const log = new EntryLog({
      ...req.body,
      logId,
      action: 'Entry',
      entryTime: new Date(),
      recordedBy: req.user._id,
      recordedByName: req.user.fullName
    });
    await log.save();

    // Generate alert for unauthorized
    if (!req.body.isAuthorized) {
      try {
        const alert = new Alert({
          alertId: generateAlertId(),
          type: 'Unauthorized Access',
          severity: 'High',
          message: `Unauthorized ${req.body.type} attempted entry: ${req.body.subjectName}`,
          details: req.body.notes,
          relatedLog: log._id,
          gate: req.body.gate
        });
        await alert.save();
      } catch (alertErr) {
        console.warn('Alert creation failed (non-fatal):', alertErr.message);
      }
    }

    res.status(201).json(log);
  } catch (err) {
    console.error('Entry record error:', err);
    res.status(400).json({ message: err.message });
  }
});

// Record exit
router.post('/exit', auth, async (req, res) => {
  try {
    const { type, subjectName } = req.body;
    if (!type) return res.status(400).json({ message: 'Type is required (Personnel, Vehicle, or Visitor)' });
    if (!subjectName || (typeof subjectName === 'string' && !subjectName.trim())) {
      return res.status(400).json({ message: 'Subject name is required' });
    }

    const logId = generateLogId();
    const log = new EntryLog({
      ...req.body,
      logId,
      action: 'Exit',
      exitTime: new Date(),
      recordedBy: req.user._id,
      recordedByName: req.user.fullName
    });
    await log.save();

    // Generate notification for soldier exit
    if (req.body.type === 'Personnel' && req.body.category === 'Military') {
      try {
        const notification = new Alert({
          alertId: generateAlertId(),
          type: 'Personnel Exit',
          severity: 'Info',
          message: `Military personnel exit recorded: ${req.body.subjectName}`,
          details: `Exit recorded for ${req.body.subjectName} at ${req.body.gate || 'Main Gate'}`,
          relatedLog: log._id,
          gate: req.body.gate
        });
        await notification.save();
      } catch (nErr) {
        console.warn('Exit notification failed:', nErr.message);
      }
    }

    res.status(201).json(log);
  } catch (err) {
    console.error('Exit record error:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update entry with exit time (Check-out)
router.put('/:id/exit', auth, async (req, res) => {
  try {
    const log = await EntryLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Entry record not found' });
    }
    
    if (log.action === 'Exit' || log.exitTime) {
      return res.status(400).json({ message: 'This record already has an exit time' });
    }

    log.exitTime = new Date();
    log.action = 'Exit';
    if (req.body.notes) log.notes = (log.notes ? log.notes + ' | ' : '') + req.body.notes;
    
    await log.save();
    res.json(log);
  } catch (err) {
    console.error('Exit update error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Process QR Scan (Entry/Exit toggle)
router.post('/scan', auth, async (req, res) => {
  try {
    const { qrData, gate } = req.body;
    if (!qrData) return res.status(400).json({ message: 'QR data is required' });
    
    let parsed = {};
    
    // Check if qrData is a URL
    if (typeof qrData === 'string' && (qrData.startsWith('http://') || qrData.startsWith('https://') || qrData.includes('/verify/'))) {
      const parts = qrData.split('/');
      const id = parts[parts.length - 1];
      
      // Determine type based on ID prefix or database lookup
      // In this system, Personnel IDs are numeric (2026xxxx), Visitors are VISxxxx, Vehicles are VHxxxx
      parsed.id = id;
      if (id.startsWith('VIS')) {
          parsed.type = 'Visitor';
      } else if (id.startsWith('VH')) {
          parsed.type = 'Vehicle';
      } else {
          // Default to Personnel for 2026xxxx IDs
          parsed.type = 'Personnel';
      }
    } else {
      try {
        parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
      } catch {
        return res.status(400).json({ message: 'Invalid QR data format. Expecting JSON or Verification URL.' });
      }
    }

    // Support both 'id' and 'visitorId' or 'personnelId'
    const subjectId = parsed.id || parsed.visitorId || parsed.personnelId || parsed.plate || parsed.plateNumber;
    const type = parsed.type;
    const subjectName = parsed.name || parsed.fullName || subjectId;

    if (!type || !subjectId) {
      return res.status(400).json({ message: 'Incomplete QR information' });
    }

    // Fetch full subject data to get the photo
    let photo = '';
    try {
      const Personnel = require('../models/Personnel');
      const Visitor = require('../models/Visitor');
      const Vehicle = require('../models/Vehicle');
      
      let subject;
      if (type === 'Personnel') {
        subject = await Personnel.findOne({ personnelId: subjectId });
      } else if (type === 'Visitor') {
        subject = await Visitor.findOne({ visitorId: subjectId });
      } else if (type === 'Vehicle') {
        subject = await Vehicle.findOne({ vehicleId: subjectId });
      }
      
      if (subject) {
        photo = subject.photo;
      }
    } catch (dbErr) {
      console.warn('Could not fetch subject photo:', dbErr.message);
    }

    // Find the last action for this subject
    const lastLog = await EntryLog.findOne({ subjectId: subjectId, type })
      .sort({ createdAt: -1 });

    // Toggle: if last was Entry, now it's Exit. Else it's Entry.
    const action = (!lastLog || lastLog.action === 'Exit') ? 'Entry' : 'Exit';
    
    const logId = generateLogId();
    const log = new EntryLog({
      logId,
      type,
      subjectId,
      subjectName,
      action,
      gate: gate || 'Main Gate',
      [action === 'Entry' ? 'entryTime' : 'exitTime']: new Date(),
      recordedBy: req.user._id,
      recordedByName: req.user.fullName,
      isAuthorized: true 
    });

    await log.save();
    
    res.status(201).json({ 
      message: `Recorded ${action} for ${subjectName}`,
      log,
      action,
      subjectName,
      photo
    });
  } catch (err) {
    console.error('Scan processing error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
