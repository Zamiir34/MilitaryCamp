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
    let militaryId = req.body.militaryId;
    
    if (!militaryId) {
      // Auto-generate military ID 2026
      const lastPersonnel = await Personnel.findOne({ personnelId: /^2026/ }).sort({ personnelId: -1 });
      let newId;
      if (!lastPersonnel) {
        newId = '20260001';
      } else {
        const lastNum = parseInt(lastPersonnel.personnelId.replace('2026', ''));
        newId = '2026' + (lastNum + 1).toString().padStart(4, '0');
      }
      militaryId = newId;

      // Auto-create personnel record
      const personnel = new Personnel({
        fullName: req.body.fullName,
        personnelId: militaryId,
        idNumber: '2026' + Math.floor(100000 + Math.random() * 899999),
        type: 'Military',
        rank: req.body.rank || 'Private',
        unit: 'Unassigned',
        status: 'Active',
        createdBy: req.user._id
      });
      await personnel.save();
    } else {
      const personnelExists = await Personnel.findOne({ personnelId: militaryId });
      if (!personnelExists) {
        return res.status(400).json({ message: 'Invalid Military ID: No such personnel found.' });
      }
    }

    const user = new User({ ...req.body, militaryId });
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
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    Object.assign(user, updateData);
    await user.save();
    
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete user
router.delete('/:id', auth, requireRole('Administrator'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
