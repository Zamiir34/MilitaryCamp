const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { auth, requireRole } = require('../middleware/auth');
const { broadcastAlert, broadcastAlertResolved, REPORTER_FIELDS } = require('../utils/alerts');
const { resolveGuardZone, syncGuardZone } = require('../utils/guardZone');
const { cleanStringFields, sendValidationError, validateEnum, validateObjectId, validatePositiveInt } = require('../utils/validation');

const MANUAL_NOTIFICATION_TYPES = [
  'Unauthorized Access',
  'Blacklisted Vehicle',
  'Expired Permit',
  'Suspicious Activity',
  'Personnel Exit',
];

const INCIDENT_TYPES = ['security_breach', 'fire', 'medical', 'equipment_failure', 'other'];
const ALERT_TYPES = [...MANUAL_NOTIFICATION_TYPES, ...INCIDENT_TYPES];
const SEVERITIES = ['low', 'Low', 'Info', 'Medium', 'high', 'High', 'critical', 'Critical'];

const canCreateManualNotification = (role) => role === 'Administrator' || role === 'Guard';

router.get('/', auth, async (req, res) => {
  try {
    const { isResolved, severity, page = 1, limit = 20 } = req.query;
    const query = {};
    const pageNum = validatePositiveInt(page, 'page', 1);
    const limitNum = validatePositiveInt(limit, 'limit', 20);

    if (isResolved !== undefined) query.isResolved = isResolved === 'true';
    if (severity) query.severity = validateEnum(severity, SEVERITIES, 'severity');
    query.type = { $nin: ['System Alert', 'Notification'] };

    // Data Isolation: Non-admins only see records created after they joined the system
    if (req.user.role !== 'Administrator') {
      query.createdAt = { $gte: req.user.createdAt };
    }

    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .populate('reportedBy', REPORTER_FIELDS)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    res.json({ data: alerts, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    sendValidationError(res, err);
  }
});

router.post('/', auth, async (req, res) => {
  try {
    cleanStringFields(req.body, ['type', 'message', 'details', 'severity', 'zone', 'gate']);
    req.body.type = validateEnum(req.body.type, ALERT_TYPES, 'type');
    if (!req.body.message) return res.status(400).json({ message: 'Message is required.' });
    if (req.body.severity) req.body.severity = validateEnum(req.body.severity, SEVERITIES, 'severity');

    if (['System Alert', 'Notification'].includes(req.body.type)) {
      return res.status(400).json({ message: 'This notification type is not allowed' });
    }
    if (
      MANUAL_NOTIFICATION_TYPES.includes(req.body.type) &&
      !canCreateManualNotification(req.user.role)
    ) {
      return res.status(403).json({ message: 'You do not have permission to create this notification' });
    }

    let zone = req.body.zone || null;
    const gate = req.body.gate || null;

    if (req.user.role === 'Guard') {
      await syncGuardZone(req.user);
      zone = await resolveGuardZone(req.user);
      if (!zone) {
        return res.status(400).json({
          message: 'No registered zone found for this guard account. Link the guard to personnel with an authorized zone.',
        });
      }
    }

    const { details, severity, ...payload } = req.body;
    const alertId = 'ALT' + Date.now().toString().slice(-9);
    const alert = new Alert({
      ...payload,
      alertId,
      reportedBy: req.user._id,
      zone,
      gate: gate || zone,
    });
    await alert.save();
    const populated = await broadcastAlert(req.app.get('io'), alert);
    res.status(201).json(populated);
  } catch (err) {
    sendValidationError(res, err);
  }
});

router.put('/:id/resolve', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    validateObjectId(req.params.id);
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isResolved: true, resolvedBy: req.user._id, resolvedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    await broadcastAlertResolved(req.app.get('io'), alert);
    res.json(alert);
  } catch (err) {
    sendValidationError(res, err);
  }
});

module.exports = router;
