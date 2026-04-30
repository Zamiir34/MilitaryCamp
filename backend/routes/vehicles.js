const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Vehicle = require('../models/Vehicle');
const { auth, requireRole } = require('../middleware/auth');

const generateId = () => 'V' + Date.now().toString().slice(-8);

router.get('/', auth, async (req, res) => {
  try {
    const { search, vehicleType, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) query.$or = [
      { plateNumber: { $regex: search, $options: 'i' } },
      { ownerName: { $regex: search, $options: 'i' } },
      { vehicleId: { $regex: search, $options: 'i' } }
    ];
    if (vehicleType) query.vehicleType = vehicleType;
    if (status) query.status = status;

    const total = await Vehicle.countDocuments(query);
    const vehicles = await Vehicle.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ data: vehicles, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const v = await Vehicle.findById(req.params.id);
    if (!v) return res.status(404).json({ message: 'Not found' });
    res.json(v);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    const vehicleId = generateId();
    const qrData = JSON.stringify({ type: 'Vehicle', id: vehicleId, plate: req.body.plateNumber });
    const qrCode = await QRCode.toDataURL(qrData);
    const vehicle = new Vehicle({ ...req.body, vehicleId, qrCode, createdBy: req.user._id });
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (err) {
    console.error('Vehicle registration error:', err);
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    if (!vehicle) return res.status(404).json({ message: 'Not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, requireRole('Administrator'), async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
