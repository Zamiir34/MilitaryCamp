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
      allGuards,
      personnelWithVehiclesRaw,
      visitorsWithVehiclesRaw
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
      User.find({ role: 'Guard' }).select('fullName rank phone badgeNumber lastLogin isOnDuty'),
      // Personnel with vehicles
      Personnel.find({ hasVehicle: true, status: 'Active', ...isolationFilter }).select('fullName rank unit vehicleDetails phone'),
      // Visitors with vehicles (show on registration)
      Visitor.find({
        hasVehicle: true,
        vehiclePlate: { $exists: true, $ne: '' },
        status: { $nin: ['Denied', 'Completed'] },
        ...isolationFilter
      }).select('fullName visitorType organization vehiclePlate vehicleModel vehicleColor status createdAt')
    ]);

    const visitorsWithVehicles = visitorsWithVehiclesRaw.map((v) => ({
      _id: v._id,
      fullName: v.fullName,
      rank: v.visitorType === 'Military' ? 'Military Visitor' : 'Civilian Visitor',
      unit: v.organization || v.visitorType || 'Visitor',
      vehicleDetails: {
        plateNumber: v.vehiclePlate,
        model: v.vehicleModel || '',
        color: v.vehicleColor || ''
      },
      isVisitor: true,
      status: v.status,
      createdAt: v.createdAt
    }));

    const personnelWithVehicles = [...personnelWithVehiclesRaw, ...visitorsWithVehicles];

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
      .populate('reportedBy', 'fullName rank role')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalPersonnel, totalVehicles: totalVehicles + personnelWithVehicles.length, totalVisitors,
        todayEntries, todayExits,
        personnelEntriesToday, vehicleEntriesToday, visitorEntriesToday,
        unresolvedAlerts
      },
      chart,
      recentActivity,
      myRecentActivity,
      recentAlerts,
      allGuards,
      personnelWithVehicles
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

    const [logs, personnel, standaloneVehicles, visitors, resolvedAlerts] = await Promise.all([
      EntryLog.find({ ...todayFilter, recordedBy: req.user._id }).sort({ createdAt: -1 }),
      Personnel.find({ ...todayFilter, createdBy: req.user._id }).sort({ createdAt: -1 }),
      Vehicle.find({ ...todayFilter, createdBy: req.user._id }).sort({ createdAt: -1 }),
      Visitor.find({ ...todayFilter, createdBy: req.user._id }).sort({ createdAt: -1 }),
      Alert.find({ resolvedBy: req.user._id, resolvedAt: { $gte: today, $lt: tomorrow } }).sort({ resolvedAt: -1 })
    ]);

    // Extract vehicles from personnel registered today
    const personnelVehicles = personnel
      .filter(p => p.hasVehicle && p.vehicleDetails && p.vehicleDetails.plateNumber)
      .map(p => ({
        _id: p._id + '_veh',
        createdAt: p.createdAt,
        plateNumber: p.vehicleDetails.plateNumber,
        model: p.vehicleDetails.make ? `${p.vehicleDetails.make} ${p.vehicleDetails.model || ''}`.trim() : (p.vehicleDetails.model || 'Unknown'),
        ownerName: p.fullName,
        isFromPersonnel: true
      }));

    const visitorVehicles = visitors
      .filter(v => v.hasVehicle && v.vehiclePlate)
      .map(v => ({
        _id: v._id + '_vveh',
        createdAt: v.createdAt,
        plateNumber: v.vehiclePlate,
        model: v.vehicleModel || 'Visitor Vehicle',
        ownerName: v.fullName,
        isFromVisitor: true
      }));

    const allVehicles = [...standaloneVehicles, ...personnelVehicles, ...visitorVehicles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      summary: {
        logsCount: logs.length,
        personnelCount: personnel.length,
        vehiclesCount: allVehicles.length,
        visitorsCount: visitors.length,
        resolvedAlertsCount: resolvedAlerts.length
      },
      details: {
        logs,
        personnel,
        vehicles: allVehicles,
        visitors,
        resolvedAlerts
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
