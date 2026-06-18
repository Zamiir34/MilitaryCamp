const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

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
      status: 'Present',
      notes: req.body.notes || ''
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
    if (req.body.notes) {
      record.notes = record.notes ? `${record.notes} | ${req.body.notes}` : req.body.notes;
    }
    
    await record.save();
    
    // Toggle duty status to OFF
    await User.findByIdAndUpdate(req.user._id, { isOnDuty: false });
    
    res.json({ message: 'Check-out successful', record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/attendance/history
// @desc    Get logged-in user's personal attendance history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const history = await Attendance.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/attendance/all
// @desc    Get all users' attendance records (Admin only)
// @access  Private (Admin)
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Administrator') {
      return res.status(403).json({ message: 'Access denied: Admin only' });
    }
    
    const { date } = req.query;
    const query = {};
    if (date) {
      query.date = date; // Expecting YYYY-MM-DD
    }
    
    const records = await Attendance.find(query)
      .populate('user', 'fullName username role rank badgeNumber')
      .sort({ createdAt: -1 });
      
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
