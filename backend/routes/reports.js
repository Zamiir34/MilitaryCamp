const express = require('express');
const router = express.Router();
const EntryLog = require('../models/EntryLog');
const { auth } = require('../middleware/auth');
const { enrichLogsWithDrivers } = require('../utils/reportLogs');
const ExcelJS = require('exceljs');

const LOG_POPULATE = [
  { path: 'vehicle', select: 'vehicleId ownerName make model plateNumber category vehicleType' },
  { path: 'personnel', select: 'personnelId fullName hasVehicle vehicleDetails' },
  { path: 'visitor', select: 'visitorId fullName hasVehicle vehiclePlate vehicleModel' },
];

// Get daily report data
router.get('/daily', auth, async (req, res) => {
  try {
    const { date } = req.query;
    let start;
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      start = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
    }
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    // Data Isolation: Non-admins only see records created after they joined
    if (req.user.role !== 'Administrator') {
      const userJoinDate = new Date(req.user.createdAt);
      if (start < userJoinDate) {
        if (end <= userJoinDate) {
          const emptyActivity = Array.from({ length: 24 }, (_, i) => ({
            hour: `${String(i).padStart(2, '0')}:00`,
            count: 0
          }));
          return res.json({
            logs: [],
            summary: { total: 0, entries: 0, exits: 0, personnel: 0, vehicles: 0, visitors: 0, unauthorized: 0 },
            activityByHour: emptyActivity,
            date: start
          });
        }
        start = userJoinDate;
      }
    }

    const logsRaw = await EntryLog.find({ createdAt: { $gte: start, $lt: end } })
      .populate(LOG_POPULATE)
      .sort({ createdAt: 1 });
    const logs = await enrichLogsWithDrivers(logsRaw);
    const summary = {
      total: logs.length,
      entries: logs.filter(l => l.action === 'Entry').length,
      exits: logs.filter(l => l.action === 'Exit').length,
      personnel: logs.filter(l => l.type === 'Personnel').length,
      vehicles: logs.filter(l => l.type === 'Vehicle').length,
      visitors: logs.filter(l => l.type === 'Visitor').length,
      unauthorized: logs.filter(l => !l.isAuthorized).length
    };

    // Calculate activity by hour (24 hours)
    const activityMap = {};
    for (let i = 0; i < 24; i++) {
      const label = `${String(i).padStart(2, '0')}:00`;
      activityMap[label] = 0;
    }

    logs.forEach(log => {
      const hour = new Date(log.createdAt).getHours();
      const label = `${String(hour).padStart(2, '0')}:00`;
      activityMap[label] = (activityMap[label] || 0) + 1;
    });

    const activityByHour = Object.keys(activityMap).sort().map(hour => ({
      hour,
      count: activityMap[hour]
    }));

    res.json({ logs, summary, activityByHour, date: start });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get reports by date range and filters
router.get('/range', auth, async (req, res) => {
  try {
    const { startDate, endDate, type, gate, action, isAuthorized } = req.query;
    let start, end;
    if (startDate && endDate) {
      const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
      const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
      start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
      end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    }

    const query = { createdAt: { $gte: start, $lte: end } };
    if (type) query.type = type;
    if (gate) query.gate = gate;
    if (action) query.action = action;
    if (isAuthorized !== undefined && isAuthorized !== '') {
      query.isAuthorized = isAuthorized === 'true';
    }

    // Data Isolation: Non-admins only see records created after they joined
    if (req.user.role !== 'Administrator') {
      const userJoinDate = new Date(req.user.createdAt);
      if (start < userJoinDate) {
        if (end <= userJoinDate) {
          return res.json({
            logs: [],
            summary: { total: 0, entries: 0, exits: 0, personnel: 0, vehicles: 0, visitors: 0, unauthorized: 0 },
            trendData: [],
            gateData: []
          });
        }
        start = userJoinDate;
        query.createdAt.$gte = start;
      }
    }

    const logsRaw = await EntryLog.find(query).populate(LOG_POPULATE).sort({ createdAt: -1 });
    const logs = await enrichLogsWithDrivers(logsRaw);

    const summary = {
      total: logs.length,
      entries: logs.filter(l => l.action === 'Entry').length,
      exits: logs.filter(l => l.action === 'Exit').length,
      personnel: logs.filter(l => l.type === 'Personnel').length,
      vehicles: logs.filter(l => l.type === 'Vehicle').length,
      visitors: logs.filter(l => l.type === 'Visitor').length,
      unauthorized: logs.filter(l => !l.isAuthorized).length
    };

    // Calculate hourly breakdown if start and end dates are the same (single day)
    // Otherwise group by daily trend
    const isSingleDay = startDate === endDate || (!startDate && !endDate);
    
    let trendData = [];
    if (isSingleDay) {
      // Hourly breakdown
      const hourlyMap = {};
      for (let i = 0; i < 24; i++) {
        hourlyMap[`${String(i).padStart(2, '0')}:00`] = { label: `${String(i).padStart(2, '0')}:00`, entries: 0, exits: 0, count: 0 };
      }
      logs.forEach(log => {
        const hour = new Date(log.createdAt).getHours();
        const label = `${String(hour).padStart(2, '0')}:00`;
        if (hourlyMap[label]) {
          hourlyMap[label].count += 1;
          if (log.action === 'Entry') hourlyMap[label].entries += 1;
          else hourlyMap[label].exits += 1;
        }
      });
      trendData = Object.values(hourlyMap).sort((a, b) => a.label.localeCompare(b.label));
    } else {
      // Daily trend
      const dailyMap = {};
      let current = new Date(start);
      let safetyCounter = 0;
      while (current <= end && safetyCounter < 100) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        dailyMap[dateStr] = { label: dateStr, entries: 0, exits: 0, count: 0 };
        current.setDate(current.getDate() + 1);
        safetyCounter++;
      }
      logs.forEach(log => {
        const logDate = new Date(log.createdAt);
        const dateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
        if (dailyMap[dateStr]) {
          dailyMap[dateStr].count += 1;
          if (log.action === 'Entry') dailyMap[dateStr].entries += 1;
          else dailyMap[dateStr].exits += 1;
        }
      });
      trendData = Object.values(dailyMap).sort((a, b) => a.label.localeCompare(b.label));
    }

    // Gate breakdown
    const gateMap = {};
    logs.forEach(log => {
      gateMap[log.gate] = (gateMap[log.gate] || 0) + 1;
    });
    const gateData = Object.keys(gateMap).map(g => ({ name: g, count: gateMap[g] }));

    res.json({ logs, summary, trendData, gateData, isSingleDay });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export to Excel
router.get('/export/excel', auth, async (req, res) => {
  try {
    const { startDate, endDate, type, gate, action, isAuthorized } = req.query;
    const query = {};
    if (startDate && endDate) {
      const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
      const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
      const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
      const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }
    if (type) query.type = type;
    if (gate) query.gate = gate;
    if (action) query.action = action;
    if (isAuthorized !== undefined && isAuthorized !== '') {
      query.isAuthorized = isAuthorized === 'true';
    }

    // Data Isolation: Non-admins only see records created after they joined
    if (req.user.role !== 'Administrator') {
      const userJoinDate = new Date(req.user.createdAt);
      if (query.createdAt) {
        query.createdAt.$gte = new Date(Math.max(new Date(query.createdAt.$gte), userJoinDate));
      } else {
        query.createdAt = { $gte: userJoinDate };
      }
    }

    const logsRaw = await EntryLog.find(query).populate(LOG_POPULATE).sort({ createdAt: -1 }).limit(2000);
    const logs = await enrichLogsWithDrivers(logsRaw);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Military Camp System';
    const sheet = workbook.addWorksheet('Entry Exit Report');

    sheet.columns = [
      { header: 'Log ID', key: 'logId', width: 15 },
      { header: 'Date/Time', key: 'createdAt', width: 22 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Action', key: 'action', width: 10 },
      { header: 'Name / Subject', key: 'subjectName', width: 22 },
      { header: 'Vehicle Name', key: 'vehicleName', width: 22 },
      { header: 'Owner Name', key: 'ownerName', width: 22 },
      { header: 'Plate Number', key: 'plateNumber', width: 16 },
      { header: 'Record ID', key: 'recordId', width: 16 },
      { header: 'Driver', key: 'driverName', width: 22 },
      { header: 'Gate', key: 'gate', width: 15 },
      { header: 'Authorized', key: 'isAuthorized', width: 12 },
      { header: 'Purpose', key: 'purpose', width: 25 },
      { header: 'Recorded By', key: 'recordedByName', width: 20 },
    ];

    // Style headers
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a3a2a' } };

    logs.forEach(log => {
      sheet.addRow({
        logId: log.logId,
        createdAt: new Date(log.createdAt).toLocaleString(),
        type: log.type,
        action: log.action,
        subjectName: log.subjectName,
        vehicleName: log.vehicleName || '--',
        ownerName: log.ownerName || '--',
        plateNumber: log.plateNumber || '--',
        recordId: log.recordId || '--',
        driverName: log.driverName || '--',
        gate: log.gate,
        isAuthorized: log.isAuthorized ? 'Yes' : 'No',
        purpose: log.purpose,
        recordedByName: log.recordedByName
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=camp-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get history for a specific personnel
router.get('/personnel/:id', auth, async (req, res) => {
  try {
    const logs = await EntryLog.find({ personnel: req.params.id }).sort({ createdAt: -1 });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get history for a specific vehicle
router.get('/vehicle/:id', auth, async (req, res) => {
  try {
    const logs = await EntryLog.find({ vehicle: req.params.id }).sort({ createdAt: -1 });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get history for a specific visitor
router.get('/visitor/:id', auth, async (req, res) => {
  try {
    const logs = await EntryLog.find({ visitor: req.params.id }).sort({ createdAt: -1 });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
