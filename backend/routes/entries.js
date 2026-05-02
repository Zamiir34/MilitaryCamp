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

module.exports = router;
