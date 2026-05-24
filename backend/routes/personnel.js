const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Personnel = require('../models/Personnel');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');


// Get all personnel
router.get('/', auth, async (req, res) => {
  try {
    const { search, type, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { personnelId: { $regex: search, $options: 'i' } },
      { idNumber: { $regex: search, $options: 'i' } },
      { unit: { $regex: search, $options: 'i' } }
    ];
    if (type) query.type = type;
    if (status) query.status = status;
    
    // Data Isolation: Non-admins only see records created after they joined
    if (req.user.role !== 'Administrator') {
      query.createdAt = { $gte: req.user.createdAt };
    }

    const total = await Personnel.countDocuments(query);
    const personnel = await Personnel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ data: personnel, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single personnel
router.get('/:id', auth, async (req, res) => {
  try {
    const p = await Personnel.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create personnel
router.post('/', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    const { fullName, idNumber: providedIdNumber } = req.body;

    // Check for duplicate
    const existing = await Personnel.findOne({ 
      $or: [
        { fullName: { $regex: new RegExp('^' + fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } },
        { idNumber: providedIdNumber }
      ].filter(q => q.idNumber || q.fullName)
    });

    if (existing) {
      return res.status(400).json({ message: `Personnel already registered: ${existing.fullName} (${existing.personnelId})` });
    }

    // Generate sequential ID starting with 2026
    const lastPersonnel = await Personnel.findOne({ personnelId: /^2026/ }).sort({ personnelId: -1 });
    let newId;
    if (!lastPersonnel) {
      newId = '20260001';
    } else {
      const lastNum = parseInt(lastPersonnel.personnelId.replace('2026', ''));
      newId = '2026' + (lastNum + 1).toString().padStart(4, '0');
    }

    const personnelId = newId;

    // Auto-generate idNumber if not provided
    let idNumber = req.body.idNumber;
    if (!idNumber) {
      idNumber = '2026' + Math.floor(100000 + Math.random() * 899999);
    }

    const qrData = JSON.stringify({ type: 'Personnel', id: personnelId, name: req.body.fullName });
    const qrCode = await QRCode.toDataURL(qrData);
    const personnel = new Personnel({ ...req.body, personnelId, idNumber, qrCode, createdBy: req.user._id });
    await personnel.save();
    res.status(201).json(personnel);
  } catch (err) {
    console.error('Personnel registration error:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update personnel
router.put('/:id', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    const personnel = await Personnel.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!personnel) return res.status(404).json({ message: 'Not found' });
    res.json(personnel);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete personnel
router.delete('/:id', auth, requireRole('Administrator'), async (req, res) => {
  try {
    const personnel = await Personnel.findById(req.params.id);
    if (!personnel) return res.status(404).json({ message: 'Personnel not found' });

    // Check if any user is registered with this personnelId
    const linkedUser = await User.findOne({ militaryId: personnel.personnelId });
    if (linkedUser) {
      return res.status(400).json({ 
        message: 'Cannot delete officer: A user is already registered with this personnel ID.' 
      });
    }

    await Personnel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Personnel deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Transfer personnel
router.post('/:id/transfer', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    const { newUnit, newRank, transferReason, authorizedZones } = req.body;
    if (!newUnit) {
      return res.status(400).json({ message: 'New unit is required for transfer.' });
    }

    const personnel = await Personnel.findById(req.params.id);
    if (!personnel) return res.status(404).json({ message: 'Personnel not found' });

    const oldUnit = personnel.unit;
    const oldRank = personnel.rank;

    // Update fields
    personnel.unit = newUnit;
    if (newRank) personnel.rank = newRank;
    if (authorizedZones) {
      personnel.authorizedZones = typeof authorizedZones === 'string'
        ? authorizedZones.split(',').map(s => s.trim()).filter(Boolean)
        : authorizedZones;
    }

    // Append to service history/remarks
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const transferLog = `[Transfer - ${dateStr}] From Unit "${oldUnit}" to "${newUnit}"${newRank && newRank !== oldRank ? `, Rank changed from "${oldRank}" to "${newRank}"` : ''}.${transferReason ? ` Reason: ${transferReason}` : ''}`;
    
    personnel.serviceHistory = personnel.serviceHistory 
      ? `${personnel.serviceHistory}\n${transferLog}` 
      : transferLog;

    personnel.updatedAt = new Date();
    await personnel.save();

    res.json(personnel);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

