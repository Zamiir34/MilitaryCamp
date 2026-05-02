const express = require('express');
const router = express.Router();
const EntryLog = require('../models/EntryLog');
const { auth } = require('../middleware/auth');
const ExcelJS = require('exceljs');

// Get daily report data
router.get('/daily', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const start = date ? new Date(date) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const logs = await EntryLog.find({ createdAt: { $gte: start, $lt: end } }).sort({ createdAt: 1 });
    const summary = {
      total: logs.length,
      entries: logs.filter(l => l.action === 'Entry').length,
      exits: logs.filter(l => l.action === 'Exit').length,
      personnel: logs.filter(l => l.type === 'Personnel').length,
      vehicles: logs.filter(l => l.type === 'Vehicle').length,
      visitors: logs.filter(l => l.type === 'Visitor').length,
      unauthorized: logs.filter(l => !l.isAuthorized).length
    };
    res.json({ logs, summary, date: start });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export to Excel
router.get('/export/excel', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }
    const logs = await EntryLog.find(query).sort({ createdAt: -1 }).limit(1000);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Military Camp System';
    const sheet = workbook.addWorksheet('Entry Exit Report');

    sheet.columns = [
      { header: 'Log ID', key: 'logId', width: 15 },
      { header: 'Date/Time', key: 'createdAt', width: 22 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Action', key: 'action', width: 10 },
      { header: 'Name', key: 'subjectName', width: 25 },
      { header: 'ID/Plate', key: 'subjectId', width: 15 },
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
        subjectId: log.subjectId,
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

module.exports = router;
