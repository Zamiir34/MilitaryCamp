const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { isResolved, severity, page = 1, limit = 20 } = req.query;
    const query = {};
    if (isResolved !== undefined) query.isResolved = isResolved === 'true';
    if (severity) query.severity = severity;

    // Data Isolation: Non-admins only see records created after they joined the system
    if (req.user.role !== 'Administrator') {
      query.createdAt = { $gte: req.user.createdAt };
    }

    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query).populate('reportedBy', 'fullName rank role').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ data: alerts, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const alertId = 'ALT' + Date.now().toString().slice(-9);
    const alert = new Alert({ ...req.body, alertId, reportedBy: req.user._id });
    await alert.save();
    // Broadcast to all connected clients in real-time
    const io = req.app.get('io');
    if (io) io.emit('new_alert', alert.toObject());
    res.status(201).json(alert);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/resolve', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isResolved: true, resolvedBy: req.user._id, resolvedAt: new Date() },
      { new: true }
    );
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
