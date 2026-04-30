const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Visitor = require('../models/Visitor');
const { auth, requireRole } = require('../middleware/auth');

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
    const visitorId = generateId();
    const qrData = JSON.stringify({ type: 'Visitor', id: visitorId, name: req.body.fullName });
    const qrCode = await QRCode.toDataURL(qrData);
    const visitor = new Visitor({ ...req.body, visitorId, qrCode, createdBy: req.user._id });
    await visitor.save();
    res.status(201).json(visitor);
  } catch (err) {
    console.error('Visitor registration error:', err);
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
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
