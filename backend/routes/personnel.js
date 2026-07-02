const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Personnel = require('../models/Personnel');
const User = require('../models/User');
const { zoneFromPersonnel, syncLinkedGuardZone } = require('../utils/guardZone');
const {
  findGuardAccountForPersonnel,
  issueGuardAccountForPersonnel,
  resetGuardPasswordForPersonnel,
} = require('../utils/guardAccount');
const { assertMilitaryIdAvailable } = require('../utils/militaryId');
const EntryLog = require('../models/EntryLog');
const crypto = require('crypto');
const { auth, requireRole } = require('../middleware/auth');


// Get all personnel
router.get('/', auth, async (req, res) => {
  try {
    const { search, type, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { fullName: { $regex: escapedSearch, $options: 'i' } },
        { personnelId: { $regex: escapedSearch, $options: 'i' } },
        { idNumber: { $regex: escapedSearch, $options: 'i' } },
        { unit: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
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

// Get linked guard account for personnel
router.get('/:id/guard-account', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    const personnel = await Personnel.findById(req.params.id);
    if (!personnel) return res.status(404).json({ message: 'Personnel not found' });

    const user = await findGuardAccountForPersonnel(personnel);
    if (!user) return res.json({ hasAccount: false });
    res.json({ hasAccount: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Issue guard login credentials for personnel
router.post('/:id/guard-account', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    const personnel = await Personnel.findById(req.params.id);
    if (!personnel) return res.status(404).json({ message: 'Personnel not found' });

    const user = await issueGuardAccountForPersonnel(personnel, req.body);
    res.status(201).json({ hasAccount: true, user, message: 'Guard account issued successfully.' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Reset guard password for personnel
router.put('/:id/guard-account/password', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    const personnel = await Personnel.findById(req.params.id);
    if (!personnel) return res.status(404).json({ message: 'Personnel not found' });

    const user = await resetGuardPasswordForPersonnel(personnel, req.body.password);
    res.json({ message: 'Guard password updated successfully.', user });
  } catch (err) {
    res.status(400).json({ message: err.message });
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

    try {
      req.body.militaryId = await assertMilitaryIdAvailable(req.body.militaryId);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    if (req.body.hasVehicle && req.body.vehicleDetails && req.body.vehicleDetails.plateNumber) {
      const plate = req.body.vehicleDetails.plateNumber.trim();
      if (plate) {
        const plateRegex = new RegExp('^' + plate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
        const existingPersonnelWithPlate = await Personnel.findOne({
          hasVehicle: true,
          'vehicleDetails.plateNumber': { $regex: plateRegex }
        });
        if (existingPersonnelWithPlate) {
          return res.status(400).json({ message: `Vehicle plate ${plate} is already registered to personnel: ${existingPersonnelWithPlate.fullName}` });
        }

        const existingVehicleWithPlate = await require('../models/Vehicle').findOne({
          plateNumber: { $regex: plateRegex }
        });
        if (existingVehicleWithPlate) {
          return res.status(400).json({ message: `Vehicle plate ${plate} is already registered in the vehicles database.` });
        }
      }
    }

    // Generate sequential ID starting with P2601
    const lastPersonnel = await Personnel.findOne({ personnelId: /^P/i }).sort({ personnelId: -1 });
    let newId;
    if (!lastPersonnel) {
      newId = 'P2601';
    } else {
      const match = lastPersonnel.personnelId.match(/^P(\d+)/i);
      const lastNum = match ? parseInt(match[1], 10) : 2600;
      newId = 'P' + (lastNum + 1);
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

    // Automatically record an entry log for the registered person so they appear in the daily report
    try {
      const logId = 'LOG' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase();
      const entryLog = new EntryLog({
        logId,
        type: 'Personnel',
        action: 'Entry',
        personnel: personnel._id,
        subjectName: personnel.fullName,
        subjectId: personnel.personnelId,
        gate: 'Main Gate',
        entryTime: new Date(),
        recordedBy: req.user._id,
        recordedByName: req.user.fullName,
        isAuthorized: true,
        purpose: 'First Entry on Registration'
      });
      await entryLog.save();
    } catch (logErr) {
      console.error('Failed to create automatic EntryLog for registered personnel:', logErr);
    }

    res.status(201).json(personnel);
  } catch (err) {
    console.error('Personnel registration error:', err);
    if (err.code === 11000 && err.keyPattern?.militaryId) {
      return res.status(400).json({ message: 'This Military ID has already been issued and cannot be used again.' });
    }
    res.status(400).json({ message: err.message });
  }
});

// Update personnel
router.put('/:id', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    if (req.body.militaryId !== undefined) {
      try {
        req.body.militaryId = await assertMilitaryIdAvailable(req.body.militaryId, {
          excludePersonnelId: req.params.id,
        });
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    }

    if (req.body.hasVehicle && req.body.vehicleDetails && req.body.vehicleDetails.plateNumber) {
      const plate = req.body.vehicleDetails.plateNumber.trim();
      if (plate) {
        const plateRegex = new RegExp('^' + plate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
        const existingPersonnelWithPlate = await Personnel.findOne({
          _id: { $ne: req.params.id },
          hasVehicle: true,
          'vehicleDetails.plateNumber': { $regex: plateRegex }
        });
        if (existingPersonnelWithPlate) {
          return res.status(400).json({ message: `Vehicle plate ${plate} is already registered to personnel: ${existingPersonnelWithPlate.fullName}` });
        }

        const existingVehicleWithPlate = await require('../models/Vehicle').findOne({
          plateNumber: { $regex: plateRegex }
        });
        if (existingVehicleWithPlate) {
          return res.status(400).json({ message: `Vehicle plate ${plate} is already registered in the vehicles database.` });
        }
      }
    }

    const personnel = await Personnel.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!personnel) return res.status(404).json({ message: 'Not found' });
    await syncLinkedGuardZone(personnel);
    res.json(personnel);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.militaryId) {
      return res.status(400).json({ message: 'This Military ID has already been issued and cannot be used again.' });
    }
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
    await syncLinkedGuardZone(personnel);

    res.json(personnel);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

