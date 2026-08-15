const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/audit
// Fetch audit logs with optional pagination and filtering
router.get('/', auth, requireRole('Administrator'), async (req, res) => {
  try {
    const { page = 1, limit = 20, action, user, startDate, endDate, search } = req.query;

    const query = {};

    if (action) query.action = action;
    if (user) query.user = user;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$text = { $search: search };
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'fullName role badgeNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Fetch Audit Logs Error:', err);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
});

module.exports = router;
