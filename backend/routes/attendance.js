const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { sendValidationError, validateObjectId, validatePositiveInt, validationError } = require('../utils/validation');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validateDateString = (value, field) => {
  if (!DATE_RE.test(value) || Number.isNaN(new Date(value).getTime())) {
    throw validationError(`${field} must be a valid YYYY-MM-DD date.`, field);
  }
};

// Helper to get today's date in YYYY-MM-DD format based on local time
const getTodayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

router.get('/today', auth, async (req, res) => {
  try {
    const todayStr = getTodayDateStr();
    const record = await Attendance.findOne({ user: req.user._id, date: todayStr });

    if (!record) {
      return res.json({ checkedIn: false });
    }

    res.json({ checkedIn: true, record });
  } catch (err) {
    sendValidationError(res, err);
  }
});

router.post('/check-in', auth, async (req, res) => {
  try {
    const todayStr = getTodayDateStr();

    let record = await Attendance.findOne({ user: req.user._id, date: todayStr });
    if (record) {
      return res.status(400).json({ message: 'You have already checked in for today.' });
    }

    record = new Attendance({
      user: req.user._id,
      date: todayStr,
      checkInTime: new Date(),
      status: 'Present'
    });

    await record.save();
    await User.findByIdAndUpdate(req.user._id, { isOnDuty: true });

    res.status(201).json({ message: 'Check-in successful', record });
  } catch (err) {
    sendValidationError(res, err);
  }
});

router.post('/check-out', auth, async (req, res) => {
  try {
    const todayStr = getTodayDateStr();

    const record = await Attendance.findOne({ user: req.user._id, date: todayStr });
    if (!record) {
      return res.status(400).json({ message: 'You have not checked in for today.' });
    }

    if (record.checkOutTime) {
      return res.status(400).json({ message: 'You have already checked out for today.' });
    }

    record.checkOutTime = new Date();
    await record.save();

    await User.findByIdAndUpdate(req.user._id, { isOnDuty: false });

    res.json({ message: 'Check-out successful', record });
  } catch (err) {
    sendValidationError(res, err);
  }
});

router.get('/history', auth, requireRole('Administrator'), async (req, res) => {
  try {
    const { userId, limit = 30 } = req.query;
    const limitNum = validatePositiveInt(limit, 'limit', 30, 100);
    if (!userId) {
      return res.json([]);
    }
    validateObjectId(userId, 'userId');

    const targetUser = await User.findById(userId).select('role');
    if (!targetUser || targetUser.role === 'Administrator') {
      return res.json([]);
    }

    const history = await Attendance.find({ user: userId })
      .populate('user', 'fullName email role rank badgeNumber')
      .sort({ createdAt: -1 })
      .limit(limitNum);
    res.json(history);
  } catch (err) {
    sendValidationError(res, err);
  }
});

router.get('/all', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    const { date, startDate, endDate, startTime, endTime } = req.query;
    const query = {};

    if (date) validateDateString(date, 'date');
    if (startDate) validateDateString(startDate, 'startDate');
    if (endDate) validateDateString(endDate, 'endDate');

    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        throw validationError('Start time and end time must be valid and ordered.', 'startTime');
      }
      query.checkInTime = {
        $gte: start,
        $lte: end,
      };
    } else if (startDate && endDate) {
      if (startDate > endDate) throw validationError('startDate must be before endDate.', 'startDate');
      query.date = { $gte: startDate, $lte: endDate };
    } else if (date) {
      query.date = date;
    }

    const records = await Attendance.find(query)
      .populate('user', 'fullName email role rank badgeNumber')
      .sort({ checkInTime: -1 });

    let filtered = records.filter(rec => rec.user?.role !== 'Administrator');
    if (req.user.role === 'SecurityOfficer') {
      filtered = filtered.filter(rec => rec.user?.role === 'Guard');
    }

    res.json(filtered);
  } catch (err) {
    sendValidationError(res, err);
  }
});

module.exports = router;
