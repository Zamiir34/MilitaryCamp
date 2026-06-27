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
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { plateNumber: { $regex: escapedSearch, $options: 'i' } },
        { ownerName: { $regex: escapedSearch, $options: 'i' } },
        { vehicleId: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    if (vehicleType) query.vehicleType = vehicleType;
    if (status) query.status = status;

    // Data Isolation: Non-admins only see records created after they joined
    if (req.user.role !== 'Administrator') {
      query.createdAt = { $gte: req.user.createdAt };
    }

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
    const { plateNumber } = req.body;
    const existing = await Vehicle.findOne({ plateNumber: { $regex: new RegExp('^' + plateNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } });
    if (existing) {
      return res.status(400).json({ message: `Vehicle already registered with plate: ${plateNumber}` });
    }

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

router.put('/:id', auth, async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: new Date() };

    if (updateData.plateNumber) {
      const existing = await Vehicle.findOne({ 
        plateNumber: { $regex: new RegExp('^' + updateData.plateNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } 
      });
      if (existing && existing._id.toString() !== req.params.id) {
        return res.status(400).json({ message: `Vehicle already registered with plate: ${updateData.plateNumber}` });
      }
    }

    if (req.user.role === 'Guard') {
      const dateStr = new Date().toLocaleString('en-US');
      const logMsg = `[Guard ${req.user.fullName} updated record on ${dateStr}]`;
      updateData.notes = updateData.notes ? `${updateData.notes} | ${logMsg}` : logMsg;
    }
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updateData, { new: true });
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
