const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const EntryLog = require('../models/EntryLog');
const { auth } = require('../middleware/auth');
const { enrichLogsWithDrivers } = require('../utils/reportLogs');
const ExcelJS = require('exceljs');
const { cleanStringFields, sendValidationError, validateEnum, validateObjectId, validationError } = require('../utils/validation');

const LOGO_PATH = path.join(__dirname, '../assets/army-logo.png');
const REPORT_TYPES = ['Personnel', 'Vehicle', 'Visitor'];
const REPORT_ACTIONS = ['Entry', 'Exit'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const validateDateString = (value, field) => {
  if (!DATE_RE.test(value) || Number.isNaN(new Date(value).getTime())) {
    throw validationError(`${field} must be a valid YYYY-MM-DD date.`, field);
  }
};

const validateReportFilters = (query, { allowEmptyDates = true } = {}) => {
  cleanStringFields(query, ['date', 'startDate', 'endDate', 'type', 'gate', 'action', 'isAuthorized']);
  if (query.date) validateDateString(query.date, 'date');
  if (query.startDate) validateDateString(query.startDate, 'startDate');
  if (query.endDate) validateDateString(query.endDate, 'endDate');
  if (!allowEmptyDates && (!query.startDate || !query.endDate)) {
    throw validationError('startDate and endDate are required.', 'startDate');
  }
  if (query.startDate && query.endDate && query.startDate > query.endDate) {
    throw validationError('startDate must be before endDate.', 'startDate');
  }
  if (query.type) query.type = validateEnum(query.type, REPORT_TYPES, 'type');
  if (query.action) query.action = validateEnum(query.action, REPORT_ACTIONS, 'action');
  if (query.isAuthorized !== undefined && query.isAuthorized !== '' && !['true', 'false'].includes(query.isAuthorized)) {
    throw validationError('isAuthorized must be true or false.', 'isAuthorized');
  }
};

const LEDGER_COLUMNS = [
  { header: 'Log ID', key: 'logId', width: 15 },
  { header: 'Date / Time', key: 'createdAt', width: 20 },
  { header: 'Type', key: 'type', width: 12 },
  { header: 'Action', key: 'action', width: 10 },
  { header: 'Name / Subject', key: 'subjectName', width: 22 },
  { header: 'Vehicle Name', key: 'vehicleName', width: 22 },
  { header: 'Owner Name', key: 'ownerName', width: 22 },
  { header: 'Plate Number', key: 'plateNumber', width: 16 },
  { header: 'Record ID', key: 'recordId', width: 16 },
  { header: 'Driver', key: 'driverName', width: 22 },
  { header: 'Gate Post', key: 'gate', width: 15 },
  { header: 'Authorized', key: 'isAuthorized', width: 12 },
];

const LAST_COL = String.fromCharCode(64 + LEDGER_COLUMNS.length); // L for 12 cols

function formatLogDateTime(value) {
  const dt = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function displayValue(value) {
  if (value === null || value === undefined || value === '' || value === '--') return 'â€”';
  return value;
}

function buildFiltersText({ gate, type, action, isAuthorized }) {
  const parts = [];
  if (gate) parts.push(`Gate [${gate}]`);
  if (type) parts.push(`Type [${type}]`);
  if (action) parts.push(`Action [${action}]`);
  if (isAuthorized !== undefined && isAuthorized !== '') {
    parts.push(`Authorized [${isAuthorized === 'true' ? 'YES ONLY' : 'NO ONLY'}]`);
  }
  return parts.join(' ');
}

function styleHeaderRow(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a3a2a' } };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 22;
}

async function buildAuditWorkbook({ logs, startDate, endDate, gate, type, action, isAuthorized, user }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Military Camp System';
  const sheet = workbook.addWorksheet('Audit Report');

  LEDGER_COLUMNS.forEach((col, index) => {
    sheet.getColumn(index + 1).width = col.width;
  });

  if (fs.existsSync(LOGO_PATH)) {
    const imageId = workbook.addImage({ filename: LOGO_PATH, extension: 'png' });
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 90, height: 90 },
    });
  }

  sheet.getRow(1).height = 24;
  sheet.getRow(2).height = 24;
  sheet.getRow(3).height = 24;

  sheet.mergeCells(`C1:${LAST_COL}2`);
  const titleCell = sheet.getCell('C1');
  titleCell.value = 'Camp Security Access Control System';
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`C3:${LAST_COL}3`);
  const subtitleCell = sheet.getCell('C3');
  subtitleCell.value = 'Access Movement Security Audit Report';
  subtitleCell.font = { bold: true, size: 12 };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`A4:${LAST_COL}4`);
  sheet.getRow(4).height = 6;

  const periodText = `REPORT PERIOD: ${startDate || 'â€”'} to ${endDate || 'â€”'}`;
  const generatedText = `GENERATED BY: ${user?.fullName || 'Unknown'} (${user?.role || 'User'})`;
  const exportText = `EXPORT DATE: ${new Date().toLocaleString()}`;

  sheet.mergeCells(`A5:D5`);
  sheet.mergeCells(`E5:H5`);
  sheet.mergeCells(`I5:${LAST_COL}5`);
  sheet.getCell('A5').value = periodText;
  sheet.getCell('E5').value = generatedText;
  sheet.getCell('I5').value = exportText;
  ['A5', 'E5', 'I5'].forEach((addr) => {
    const cell = sheet.getCell(addr);
    cell.font = { bold: true, size: 10 };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  sheet.getRow(5).height = 20;

  let nextRow = 6;
  const filtersText = buildFiltersText({ gate, type, action, isAuthorized });
  if (filtersText) {
    sheet.mergeCells(`A${nextRow}:${LAST_COL}${nextRow}`);
    const filtersCell = sheet.getCell(`A${nextRow}`);
    filtersCell.value = `FILTERS APPLIED: ${filtersText}`;
    filtersCell.font = { bold: true, size: 10 };
    filtersCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    filtersCell.border = {
      top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    };
    filtersCell.alignment = { vertical: 'middle', wrapText: true };
    sheet.getRow(nextRow).height = 22;
    nextRow += 1;
  }

  nextRow += 1;
  sheet.mergeCells(`A${nextRow}:${LAST_COL}${nextRow}`);
  const ledgerTitle = sheet.getCell(`A${nextRow}`);
  ledgerTitle.value = `Access Movement Ledger (${logs.length} records found)`;
  ledgerTitle.font = { bold: true, size: 12 };
  ledgerTitle.alignment = { vertical: 'middle' };
  sheet.getRow(nextRow).height = 22;
  nextRow += 1;

  const headerRow = sheet.getRow(nextRow);
  LEDGER_COLUMNS.forEach((col, index) => {
    headerRow.getCell(index + 1).value = col.header;
  });
  styleHeaderRow(headerRow);
  nextRow += 1;

  logs.forEach((log) => {
    const row = sheet.getRow(nextRow);
    row.values = [
      log.logId,
      formatLogDateTime(log.createdAt),
      log.type,
      log.action,
      log.subjectName,
      displayValue(log.vehicleName),
      displayValue(log.ownerName),
      displayValue(log.plateNumber),
      displayValue(log.recordId),
      displayValue(log.driverName),
      log.gate,
      log.isAuthorized ? 'YES' : 'NO',
    ];
    row.alignment = { vertical: 'middle', wrapText: true };
    nextRow += 1;
  });

  return workbook;
}

const LOG_POPULATE = [
  { path: 'vehicle', select: 'vehicleId ownerName make model plateNumber category vehicleType' },
  { path: 'personnel', select: 'personnelId fullName hasVehicle vehicleDetails' },
  { path: 'visitor', select: 'visitorId fullName hasVehicle vehiclePlate vehicleModel' },
];

// Get daily report data
router.get('/daily', auth, async (req, res) => {
  try {
    validateReportFilters(req.query);
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
    sendValidationError(res, err);
  }
});

// Get reports by date range and filters
router.get('/range', auth, async (req, res) => {
  try {
    validateReportFilters(req.query);
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
    sendValidationError(res, err);
  }
});

// Export to Excel
router.get('/export/excel', auth, async (req, res) => {
  try {
    validateReportFilters(req.query);
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

    const workbook = await buildAuditWorkbook({
      logs,
      startDate,
      endDate,
      gate,
      type,
      action,
      isAuthorized,
      user: req.user,
    });

    const filename = `camp-security-report-${startDate || 'report'}_to_${endDate || 'report'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    sendValidationError(res, err);
  }
});

// Get history for a specific personnel
router.get('/personnel/:id', auth, async (req, res) => {
  try {
    validateObjectId(req.params.id);
    const logs = await EntryLog.find({ personnel: req.params.id }).sort({ createdAt: -1 });
    res.json({ logs });
  } catch (err) {
    sendValidationError(res, err);
  }
});

// Get history for a specific vehicle
router.get('/vehicle/:id', auth, async (req, res) => {
  try {
    validateObjectId(req.params.id);
    const logs = await EntryLog.find({ vehicle: req.params.id }).sort({ createdAt: -1 });
    res.json({ logs });
  } catch (err) {
    sendValidationError(res, err);
  }
});

// Get history for a specific visitor
router.get('/visitor/:id', auth, async (req, res) => {
  try {
    validateObjectId(req.params.id);
    const logs = await EntryLog.find({ visitor: req.params.id }).sort({ createdAt: -1 });
    res.json({ logs });
  } catch (err) {
    sendValidationError(res, err);
  }
});

module.exports = router;

