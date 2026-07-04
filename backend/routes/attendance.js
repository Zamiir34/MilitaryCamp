const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

// Helper to get today's date in YYYY-MM-DD format based on local time
const getTodayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// @route   GET /api/attendance/today
// @desc    Get logged-in user's attendance status for today
// @access  Private
router.get('/today', auth, async (req, res) => {
  try {
    const todayStr = getTodayDateStr();
    const record = await Attendance.findOne({ user: req.user._id, date: todayStr });
    
    if (!record) {
      return res.json({ checkedIn: false });
    }
    
    res.json({ checkedIn: true, record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/attendance/check-in
// @desc    Register check-in for today
// @access  Private
router.post('/check-in', auth, async (req, res) => {
  try {
    const todayStr = getTodayDateStr();
    
    // Check if already checked in
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
    
    // Also toggle duty status to ON if not already
    await User.findByIdAndUpdate(req.user._id, { isOnDuty: true });
    
    res.status(201).json({ message: 'Check-in successful', record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/attendance/check-out
// @desc    Register check-out for today
// @access  Private
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
    
    // Toggle duty status to OFF
    await User.findByIdAndUpdate(req.user._id, { isOnDuty: false });
    
    res.json({ message: 'Check-out successful', record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/attendance/history
// @desc    Get attendance history (Administrator only)
// @access  Private (Administrator)
router.get('/history', auth, requireRole('Administrator'), async (req, res) => {
  try {
    const { userId, limit = 30 } = req.query;
    if (!userId) {
      return res.json([]);
    }

    const targetUser = await User.findById(userId).select('role');
    if (!targetUser || targetUser.role === 'Administrator') {
      return res.json([]);
    }

    const history = await Attendance.find({ user: userId })
      .populate('user', 'fullName username role rank badgeNumber')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/attendance/all
// @desc    Get team attendance records (Administrator + Security Officer)
// @access  Private (Administrator, SecurityOfficer)
router.get('/all', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    const { date, startDate, endDate, startTime, endTime } = req.query;
    const query = {};

    if (startTime && endTime) {
      query.checkInTime = {
        $gte: new Date(startTime),
        $lte: new Date(endTime),
      };
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (date) {
      query.date = date;
    }
    
    const records = await Attendance.find(query)
      .populate('user', 'fullName username role rank badgeNumber')
      .sort({ checkInTime: -1 });

    let filtered = records.filter(rec => rec.user?.role !== 'Administrator');
    if (req.user.role === 'SecurityOfficer') {
      filtered = filtered.filter(rec => rec.user?.role === 'Guard');
    }

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
