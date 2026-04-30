const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Personnel = require('../models/Personnel');
const { auth, requireRole } = require('../middleware/auth');

// Get all users
router.get('/', auth, requireRole('Administrator'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create user
router.post('/', auth, requireRole('Administrator'), async (req, res) => {
  try {
    if (req.body.militaryId) {
      const personnelExists = await Personnel.findOne({ personnelId: req.body.militaryId });
      if (!personnelExists) {
        return res.status(400).json({ message: 'Invalid Military ID: No such personnel found.' });
      }
    }
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update user
router.put('/:id', auth, requireRole('Administrator'), async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    
    if (updateData.militaryId) {
      const personnelExists = await Personnel.findOne({ personnelId: updateData.militaryId });
      if (!personnelExists) {
        return res.status(400).json({ message: 'Invalid Military ID: No such personnel found.' });
      }
    }

    if (password) updateData.password = password;
    updateData.updatedAt = new Date();
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete user
router.delete('/:id', auth, requireRole('Administrator'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
