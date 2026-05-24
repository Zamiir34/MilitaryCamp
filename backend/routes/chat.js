const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { auth } = require('../middleware/auth');


// GET /api/chat/users — list all active users except self
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id }, isActive: true })
      .select('_id fullName role rank badgeNumber')
      .sort({ role: 1, fullName: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/chat/conversations — get last message per conversation + unread count
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // All messages involving this user
    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }]
    })
      .populate('sender', 'fullName role rank')
      .populate('recipient', 'fullName role rank')
      .sort({ createdAt: -1 });

    // Build conversation map: other user -> { lastMessage, unreadCount }
    const convMap = new Map();
    for (const msg of messages) {
      const otherId = msg.sender._id.toString() === userId
        ? msg.recipient._id.toString()
        : msg.sender._id.toString();
      const otherUser = msg.sender._id.toString() === userId ? msg.recipient : msg.sender;

      if (!convMap.has(otherId)) {
        convMap.set(otherId, { user: otherUser, lastMessage: msg, unread: 0 });
      }
      // Count unread messages sent to me
      if (msg.recipient._id.toString() === userId && !msg.read) {
        convMap.get(otherId).unread += 1;
      }
    }

    const conversations = Array.from(convMap.values())
      .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/chat/messages/:recipientId — get conversation with a specific user
router.get('/messages/:recipientId', auth, async (req, res) => {
  try {
    const { recipientId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: recipientId },
        { sender: recipientId, recipient: userId },
      ]
    })
      .populate('sender', 'fullName role')
      .populate('recipient', 'fullName role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/chat/messages — send a message
router.post('/messages', auth, async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    if (!recipientId || !content?.trim()) {
      return res.status(400).json({ message: 'recipientId and content are required' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient || !recipient.isActive) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      content: content.trim(),
    });

    const populated = await message.populate([
      { path: 'sender', select: 'fullName role' },
      { path: 'recipient', select: 'fullName role' },
    ]);

    // Emit via socket if available
    const io = req.app.get('io');
    if (io) {
      io.to(recipientId).emit('new_message', populated);
      io.to(req.user._id.toString()).emit('message_sent', populated);
    }

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/chat/messages/:senderId/read — mark messages from sender as read
router.put('/messages/:senderId/read', auth, async (req, res) => {
  try {
    await Message.updateMany(
      { sender: req.params.senderId, recipient: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/chat/unread-count — total unread messages for current user
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({ recipient: req.user._id, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
