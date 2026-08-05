const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { auth } = require('../middleware/auth');
const { sendValidationError, validationError } = require('../utils/validation');

router.post('/generate', auth, async (req, res) => {
  try {
    const { data } = req.body;
    if (data === undefined || data === null || data === '') {
      throw validationError('QR data is required.', 'data');
    }
    const qrCode = await QRCode.toDataURL(JSON.stringify(data));
    res.json({ qrCode });
  } catch (err) {
    sendValidationError(res, err);
  }
});

router.post('/scan', auth, async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) throw validationError('QR data is required.', 'qrData');
    const parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(400).json({ message: err.statusCode ? err.message : 'Invalid QR code data' });
  }
});

module.exports = router;
