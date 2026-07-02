const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Personnel = require('../models/Personnel');
const { auth, requireRole } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/email');
const { zoneFromPersonnel, findPersonnelForGuard } = require('../utils/guardZone');

const resolvePersonnelForMilitaryId = async (militaryId) => {
  const normalized = typeof militaryId === 'string' ? militaryId.trim() : militaryId;
  if (!normalized) return null;

  return findPersonnelForGuard({ militaryId: normalized });
};

// Get all users
router.get('/', auth, requireRole('Administrator'), async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create user
router.post('/', auth, requireRole('Administrator'), async (req, res) => {
  try {
    const { username, email, role } = req.body;
    let militaryId = typeof req.body.militaryId === 'string' ? req.body.militaryId.trim() : req.body.militaryId;
    
    // Check for existing user by username or email
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ message: 'Username is already taken.' });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email is already taken.' });
      }
    }

    if (!militaryId) {
      let prefix = 'U';
      if (role === 'Guard') prefix = 'G';
      else if (role === 'SecurityOfficer') prefix = 'S';
      else if (role === 'Administrator') prefix = 'A';

      const lastUserPersonnel = await Personnel.findOne({ personnelId: new RegExp(`^${prefix}`, 'i') }).sort({ personnelId: -1 });
      let newId;
      if (!lastUserPersonnel) {
        newId = `${prefix}2601`;
      } else {
        const match = lastUserPersonnel.personnelId.match(new RegExp(`^${prefix}(\\d+)`, 'i'));
        const lastNum = match ? parseInt(match[1], 10) : 2600;
        newId = prefix + (lastNum + 1);
      }
      militaryId = newId;

      // Auto-create personnel record
      const personnel = new Personnel({
        fullName: req.body.fullName,
        personnelId: militaryId,
        idNumber: '2026' + Math.floor(100000 + Math.random() * 899999),
        type: role === 'Guard' ? 'Military' : 'Staff',
        rank: req.body.rank || (role === 'Guard' ? 'Guard' : role),
        unit: 'Security',
        status: 'Active',
        authorizedZones: role === 'Guard' ? [req.body.authorizedZone || 'Zone A'] : [],
        createdBy: req.user._id
      });
      await personnel.save();
    } else {
      const personnel = await resolvePersonnelForMilitaryId(militaryId);
      if (!personnel) {
        return res.status(400).json({ message: 'Invalid Military ID: No such personnel found.' });
      }
      militaryId = personnel.personnelId;
    }

    let assignedZone;
    if (role === 'Guard') {
      const personnelForZone = await resolvePersonnelForMilitaryId(militaryId);
      assignedZone = zoneFromPersonnel(personnelForZone);
      if (!assignedZone) {
        return res.status(400).json({ message: 'Guard must be linked to personnel with an authorized zone.' });
      }
    }

    if (militaryId) {
      const userWithMilitaryId = await User.findOne({ militaryId });
      if (userWithMilitaryId) {
        return res.status(400).json({ message: 'Military ID is already assigned to another user.' });
      }
    }

    const user = new User({ ...req.body, militaryId, assignedZone, isEmailVerified: false });
    await user.save();

    // Send initial verification email
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.emailVerificationCode = code;
      user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      await sendVerificationEmail(user.email, user.fullName, code);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
    }

    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update user
router.put('/:id', auth, requireRole('Administrator'), async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    if (typeof updateData.militaryId === 'string') {
      updateData.militaryId = updateData.militaryId.trim();
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Check for uniqueness if fields are updated
    if (updateData.username || updateData.email || updateData.militaryId) {
      const orQuery = [];
      if (updateData.username) orQuery.push({ username: updateData.username });
      if (updateData.email) orQuery.push({ email: updateData.email });
      if (updateData.militaryId) orQuery.push({ militaryId: updateData.militaryId });

      if (orQuery.length > 0) {
        const existingUsers = await User.find({ $or: orQuery });
        for (const eu of existingUsers) {
          if (eu._id.toString() !== req.params.id) {
            if (updateData.username && eu.username === updateData.username) {
              return res.status(400).json({ message: 'Username is already taken by another user.' });
            }
            if (updateData.email && eu.email === updateData.email) {
              return res.status(400).json({ message: 'Email is already taken by another user.' });
            }
            if (updateData.militaryId && eu.militaryId === updateData.militaryId) {
              return res.status(400).json({ message: 'Military ID is already assigned to another user.' });
            }
          }
        }
      }
    }

    const targetRole = updateData.role || user.role;
    if (targetRole === 'Guard') {
      const personnel = await resolvePersonnelForMilitaryId(updateData.militaryId || user.militaryId);
      if (!personnel) {
        return res.status(400).json({ message: 'Select an existing personnel record before saving a guard account.' });
      }
      updateData.militaryId = personnel.personnelId;
      updateData.assignedZone = zoneFromPersonnel(personnel);
      if (!updateData.assignedZone) {
        return res.status(400).json({ message: 'Linked personnel must have an authorized zone.' });
      }

      const userWithMilitaryId = await User.findOne({ militaryId: updateData.militaryId });
      if (userWithMilitaryId && userWithMilitaryId._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'Military ID is already assigned to another user.' });
      }
    } else if (updateData.militaryId) {
      const personnel = await resolvePersonnelForMilitaryId(updateData.militaryId);
      if (!personnel) {
        return res.status(400).json({ message: 'Invalid Military ID: No such personnel found.' });
      }
      updateData.militaryId = personnel.personnelId;

      const userWithMilitaryId = await User.findOne({ militaryId: updateData.militaryId });
      if (userWithMilitaryId && userWithMilitaryId._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'Military ID is already assigned to another user.' });
      }
    }

    if (password) updateData.password = password;
    updateData.updatedAt = new Date();
    
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

// Toggle user active status
router.put('/:id/toggle', auth, requireRole('Administrator'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Reset user password
router.put('/:id/reset-password', auth, requireRole('Administrator'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
