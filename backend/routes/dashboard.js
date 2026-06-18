const express = require('express');
const router = express.Router();
const EntryLog = require('../models/EntryLog');
const Personnel = require('../models/Personnel');
const Vehicle = require('../models/Vehicle');
const Visitor = require('../models/Visitor');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayFilter = { createdAt: { $gte: today, $lt: tomorrow } };
    
    // Data Isolation: Non-admins only see records created after they joined
    const isolationDate = req.user.role === 'Administrator' ? new Date(0) : new Date(req.user.createdAt);
    
    if (req.user.role !== 'Administrator') {
      todayFilter.createdAt.$gte = new Date(Math.max(today, isolationDate));
    }

    const isolationFilter = { createdAt: { $gte: isolationDate } };

    const [
      totalPersonnel, totalVehicles, totalVisitors,
      todayEntries, todayExits,
      personnelEntriesToday, vehicleEntriesToday, visitorEntriesToday,
      unresolvedAlerts,
      weeklyData,
      allGuards
    ] = await Promise.all([
      Personnel.countDocuments({ status: 'Active', ...isolationFilter }),
      Vehicle.countDocuments({ status: 'Active', ...isolationFilter }),
      Visitor.countDocuments(isolationFilter),
      EntryLog.countDocuments({ ...todayFilter, action: 'Entry' }),
      EntryLog.countDocuments({ ...todayFilter, action: 'Exit' }),
      EntryLog.countDocuments({ ...todayFilter, action: 'Entry', type: 'Personnel' }),
      EntryLog.countDocuments({ ...todayFilter, action: 'Entry', type: 'Vehicle' }),
      EntryLog.countDocuments({ ...todayFilter, action: 'Entry', type: 'Visitor' }),
      Alert.countDocuments({ isResolved: false, ...isolationFilter }),
      // Last 7 days activity
      EntryLog.aggregate([
        { $match: { createdAt: { $gte: new Date(Math.max(Date.now() - 7 * 24 * 60 * 60 * 1000, isolationDate.getTime())) } } },
        { $group: {
          _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, action: '$action' },
          count: { $sum: 1 }
        }},
        { $sort: { '_id.date': 1 } }
      ]),
      // All guards for oversight (Bypasses isolation)
      User.find({ role: 'Guard' }).select('fullName rank phone badgeNumber lastLogin isOnDuty')
    ]);

    // Process weekly data
    const weekMap = {};
    weeklyData.forEach(({ _id, count }) => {
      if (!weekMap[_id.date]) weekMap[_id.date] = { date: _id.date, entries: 0, exits: 0 };
      weekMap[_id.date][_id.action === 'Entry' ? 'entries' : 'exits'] = count;
    });
    const chart = Object.values(weekMap).sort((a, b) => a.date.localeCompare(b.date));

    // Recent activity
    const recentActivity = await EntryLog.find(isolationFilter)
      .populate('vehicle', 'ownerName make model plateNumber category')
      .sort({ createdAt: -1 })
      .limit(10);

    // My recent activity
    const myRecentActivity = await EntryLog.find({ recordedBy: req.user._id })
      .populate('vehicle', 'ownerName make model plateNumber category')
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent alerts
    const recentAlerts = await Alert.find({ isResolved: false, ...isolationFilter })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalPersonnel, totalVehicles, totalVisitors,
        todayEntries, todayExits,
        personnelEntriesToday, vehicleEntriesToday, visitorEntriesToday,
        unresolvedAlerts
      },
      chart,
      recentActivity,
      myRecentActivity,
      recentAlerts,
      allGuards
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// User's personal activity for today
router.get('/my-activity', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayFilter = { createdAt: { $gte: today, $lt: tomorrow } };

    const [logs, personnel, vehicles, visitors, resolvedAlerts] = await Promise.all([
      EntryLog.find({ ...todayFilter, recordedBy: req.user._id }).sort({ createdAt: -1 }),
      Personnel.find({ ...todayFilter, createdBy: req.user._id }).sort({ createdAt: -1 }),
      Vehicle.find({ ...todayFilter, createdBy: req.user._id }).sort({ createdAt: -1 }),
      Visitor.find({ ...todayFilter, createdBy: req.user._id }).sort({ createdAt: -1 }),
      Alert.find({ resolvedBy: req.user._id, resolvedAt: { $gte: today, $lt: tomorrow } }).sort({ resolvedAt: -1 })
    ]);

    res.json({
      summary: {
        logsCount: logs.length,
        personnelCount: personnel.length,
        vehiclesCount: vehicles.length,
        visitorsCount: visitors.length,
        resolvedAlertsCount: resolvedAlerts.length
      },
      details: {
        logs,
        personnel,
        vehicles,
        visitors,
        resolvedAlerts
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
