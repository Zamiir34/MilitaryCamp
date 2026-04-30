const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Personnel = require('../models/Personnel');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

const generateId = () => 'P' + Date.now().toString().slice(-8);

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
    const personnelId = generateId();
    const qrData = JSON.stringify({ type: 'Personnel', id: personnelId, name: req.body.fullName });
    const qrCode = await QRCode.toDataURL(qrData);
    const personnel = new Personnel({ ...req.body, personnelId, qrCode, createdBy: req.user._id });
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

module.exports = router;
