const express = require('express');
const router = express.Router();
const { buildVerifyQrDataUrl } = require('../utils/verifyUrl');
const Vehicle = require('../models/Vehicle');
const { auth, requireRole } = require('../middleware/auth');
const {
  cleanStringFields,
  escapeRegex,
  requireFields,
  sendValidationError,
  validateEnum,
  validateObjectId,
  validatePositiveInt,
} = require('../utils/validation');

const generateId = () => 'V' + Date.now().toString().slice(-8);
const vehicleTypes = ['Car', 'Truck', 'Motorcycle', 'Military Vehicle', 'Bus', 'Other'];
const vehicleStatuses = ['Active', 'Blacklisted', 'Inactive'];
const vehicleCategories = ['Military', 'Civilian', 'Visitor', 'Contractor'];

router.get('/', auth, async (req, res) => {
  try {
    const { search, vehicleType, status, page = 1, limit = 20 } = req.query;
    const query = {};
    const pageNum = validatePositiveInt(page, 'page', 1);
    const limitNum = validatePositiveInt(limit, 'limit', 20);

    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { plateNumber: { $regex: escapedSearch, $options: 'i' } },
        { ownerName: { $regex: escapedSearch, $options: 'i' } },
        { vehicleId: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    if (vehicleType) query.vehicleType = validateEnum(vehicleType, vehicleTypes, 'vehicleType');
    if (status) query.status = validateEnum(status, vehicleStatuses, 'status');

    // Data Isolation: Non-admins only see records created after they joined
    if (req.user.role !== 'Administrator') {
      query.createdAt = { $gte: req.user.createdAt };
    }

    const total = await Vehicle.countDocuments(query);
    const vehicles = await Vehicle.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({ data: vehicles, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    sendValidationError(res, err);
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    validateObjectId(req.params.id);
    const v = await Vehicle.findById(req.params.id);
    if (!v) return res.status(404).json({ message: 'Not found' });
    res.json(v);
  } catch (err) {
    sendValidationError(res, err);
  }
});

router.post('/', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    cleanStringFields(req.body, ['plateNumber', 'vehicleType', 'make', 'model', 'color', 'ownerName', 'ownerIdNumber', 'ownerPhone', 'registrationNumber', 'category', 'status', 'notes']);
    requireFields(req.body, ['plateNumber', 'vehicleType', 'ownerName']);
    req.body.vehicleType = validateEnum(req.body.vehicleType, vehicleTypes, 'vehicleType');
    if (req.body.category) req.body.category = validateEnum(req.body.category, vehicleCategories, 'category');
    if (req.body.status) req.body.status = validateEnum(req.body.status, vehicleStatuses, 'status');

    const { plateNumber } = req.body;
    const existing = await Vehicle.findOne({ plateNumber: { $regex: new RegExp('^' + escapeRegex(plateNumber) + '$', 'i') } });
    if (existing) {
      return res.status(400).json({ message: `Vehicle already registered with plate: ${plateNumber}` });
    }

    const vehicleId = generateId();
    const qrCode = await buildVerifyQrDataUrl(vehicleId);
    const vehicle = new Vehicle({ ...req.body, vehicleId, qrCode, createdBy: req.user._id });
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (err) {
    console.error('Vehicle registration error:', err);
    sendValidationError(res, err);
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    validateObjectId(req.params.id);
    cleanStringFields(req.body, ['plateNumber', 'vehicleType', 'make', 'model', 'color', 'ownerName', 'ownerIdNumber', 'ownerPhone', 'registrationNumber', 'category', 'status', 'notes']);
    if (req.body.vehicleType) req.body.vehicleType = validateEnum(req.body.vehicleType, vehicleTypes, 'vehicleType');
    if (req.body.category) req.body.category = validateEnum(req.body.category, vehicleCategories, 'category');
    if (req.body.status) req.body.status = validateEnum(req.body.status, vehicleStatuses, 'status');

    const updateData = { ...req.body, updatedAt: new Date() };

    if (updateData.plateNumber) {
      const existing = await Vehicle.findOne({
        plateNumber: { $regex: new RegExp('^' + escapeRegex(updateData.plateNumber) + '$', 'i') }
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
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!vehicle) return res.status(404).json({ message: 'Not found' });
    res.json(vehicle);
  } catch (err) {
    sendValidationError(res, err);
  }
});

router.delete('/:id', auth, requireRole('Administrator'), async (req, res) => {
  try {
    validateObjectId(req.params.id);
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    sendValidationError(res, err);
  }
});

module.exports = router;
