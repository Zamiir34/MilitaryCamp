const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const Message = require('../models/Message');
const { auth, requireRole } = require('../middleware/auth');

const generateId = () => 'VIS' + Date.now().toString().slice(-7);

router.get('/', auth, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { idNumber: { $regex: search, $options: 'i' } },
      { visitorId: { $regex: search, $options: 'i' } },
      { organization: { $regex: search, $options: 'i' } }
    ];
    if (status) query.status = status;
    
    // Data Isolation: Non-admins only see records created after they joined
    if (req.user.role !== 'Administrator') {
      query.createdAt = { $gte: req.user.createdAt };
    }

    const total = await Visitor.countDocuments(query);
    const visitors = await Visitor.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ data: visitors, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const v = await Visitor.findById(req.params.id);
    if (!v) return res.status(404).json({ message: 'Not found' });
    res.json(v);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const visitorId = generateId();
    const qrData = JSON.stringify({ type: 'Visitor', id: visitorId, name: req.body.fullName });
    const qrCode = await QRCode.toDataURL(qrData);
    const visitor = new Visitor({ ...req.body, visitorId, qrCode, createdBy: req.user._id });
    await visitor.save();

    // Auto-notify host if they are a system user
    if (req.body.hostName) {
      try {
        const host = await User.findOne({ 
          fullName: { $regex: new RegExp('^' + req.body.hostName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }, 
          isActive: true 
        });
        
        if (host) {
          const messageContent = `${req.body.fullName}: waxaa kuu yimid qof ku doonaya, ma soodeeyaa mise waan ciliyaa?`;
          const message = await Message.create({
            sender: req.user._id,
            recipient: host._id,
            content: messageContent
          });

          const io = req.app.get('io');
          if (io) {
            const populated = await message.populate('sender', 'fullName role rank');
            io.to(host._id.toString()).emit('new_message', populated);
          }
        }
      } catch (notifyErr) {
        console.warn('Host notification failed:', notifyErr.message);
      }
    }

    res.status(201).json(visitor);
  } catch (err) {
    console.error('Visitor registration error:', err);
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: new Date() };
    if (req.user.role === 'Guard') {
      const dateStr = new Date().toLocaleString('en-US');
      const logMsg = `[Guard ${req.user.fullName} updated record on ${dateStr}]`;
      updateData.notes = updateData.notes ? `${updateData.notes} | ${logMsg}` : logMsg;
    }
    const visitor = await Visitor.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!visitor) return res.status(404).json({ message: 'Not found' });
    res.json(visitor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    await Visitor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Visitor deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
