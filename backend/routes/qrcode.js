const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { auth } = require('../middleware/auth');

router.post('/generate', auth, async (req, res) => {
  try {
    const { data } = req.body;
    const qrCode = await QRCode.toDataURL(JSON.stringify(data));
    res.json({ qrCode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/scan', auth, async (req, res) => {
  try {
    const { qrData } = req.body;
    const parsed = JSON.parse(qrData);
    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(400).json({ message: 'Invalid QR code data' });
  }
});

module.exports = router;
