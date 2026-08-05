const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Personnel = require('../models/Personnel');
const { auth, requireRole } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/email');
const { zoneFromPersonnel, findPersonnelForGuard } = require('../utils/guardZone');
const {
  cleanStringFields,
  requireFields,
  sendValidationError,
  validateEmail,
  validateEnum,
  validateObjectId,
  validatePassword,
} = require('../utils/validation');

const userRoles = ['Administrator', 'SecurityOfficer', 'Guard'];

const resolvePersonnelForMilitaryId = async (militaryId) => {
  const normalized = typeof militaryId === 'string' ? militaryId.trim() : militaryId;
  if (!normalized) return null;

  return findPersonnelForGuard({ militaryId: normalized });
};

const normalizeUserPayload = (body, { partial = false, allowPassword = true } = {}) => {
  cleanStringFields(body, ['fullName', 'email', 'phone', 'rank', 'badgeNumber', 'militaryId', 'assignedZone', 'role']);
  if (body.vehicleDetails) cleanStringFields(body.vehicleDetails, ['plateNumber', 'model', 'color']);

  if (!partial) requireFields(body, ['fullName', 'email']);
  if (body.email !== undefined) body.email = validateEmail(body.email, 'email', !partial);
  if (body.role !== undefined) body.role = validateEnum(body.role, userRoles, 'role', false);
  if (allowPassword && (!partial || body.password !== undefined)) body.password = validatePassword(body.password, 'password', !partial);
};

// Get all users
router.get('/', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'SecurityOfficer') {
      query.role = 'Guard';
    }
    const users = await User.find(query).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    sendValidationError(res, err);
  }
});

// Create user
router.post('/', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    normalizeUserPayload(req.body);
    let { email, role } = req.body;
    if (req.user.role === 'SecurityOfficer') {
      role = 'Guard';
      req.body.role = 'Guard';
    }
    let militaryId = typeof req.body.militaryId === 'string' ? req.body.militaryId.trim() : req.body.militaryId;

    // Check for existing user by email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already taken.' });
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

    res.status(201).json(user);
  } catch (err) {
    sendValidationError(res, err);
  }
});

// Update user
router.put('/:id', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    validateObjectId(req.params.id);
    const { password, ...updateData } = req.body;
    normalizeUserPayload(updateData, { partial: true, allowPassword: false });
    if (password) updateData.password = validatePassword(password, 'password');

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.user.role === 'SecurityOfficer' && user.role !== 'Guard') {
      return res.status(403).json({ message: 'Security Officers can only manage Guard accounts.' });
    }

    // Check for uniqueness if fields are updated
    if (updateData.email || updateData.militaryId) {
      const orQuery = [];
      if (updateData.email) orQuery.push({ email: updateData.email });
      if (updateData.militaryId) orQuery.push({ militaryId: updateData.militaryId });

      if (orQuery.length > 0) {
        const existingUsers = await User.find({ $or: orQuery });
        for (const eu of existingUsers) {
          if (eu._id.toString() !== req.params.id) {
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

    updateData.updatedAt = new Date();

    Object.assign(user, updateData);
    await user.save();

    res.json(user);
  } catch (err) {
    sendValidationError(res, err);
  }
});

// Delete user
router.delete('/:id', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    validateObjectId(req.params.id);
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) return res.status(404).json({ message: 'User not found' });
    if (req.user.role === 'SecurityOfficer' && userToDelete.role !== 'Guard') {
      return res.status(403).json({ message: 'Security Officers can only delete Guard accounts.' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    sendValidationError(res, err);
  }
});

// Toggle user active status
router.put('/:id/toggle', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    validateObjectId(req.params.id);
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();
    res.json(user);
  } catch (err) {
    sendValidationError(res, err);
  }
});

// Reset user password
router.put('/:id/reset-password', auth, requireRole('Administrator', 'SecurityOfficer'), async (req, res) => {
  try {
    validateObjectId(req.params.id);
    const newPassword = validatePassword(req.body.newPassword, 'newPassword');

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    sendValidationError(res, err);
  }
});

module.exports = router;

