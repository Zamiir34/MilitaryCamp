const Personnel = require('../models/Personnel');
const User = require('../models/User');

function normalizeMilitaryId(value) {
  if (value == null) return '';
  return String(value).trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findPersonnelWithMilitaryId(militaryId, excludePersonnelId = null) {
  const normalized = normalizeMilitaryId(militaryId);
  if (!normalized) return null;

  const query = {
    militaryId: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, 'i') },
  };
  if (excludePersonnelId) {
    query._id = { $ne: excludePersonnelId };
  }
  return Personnel.findOne(query);
}

async function findUserWithMilitaryId(militaryId, excludeUserId = null) {
  const normalized = normalizeMilitaryId(militaryId);
  if (!normalized) return null;

  const query = {
    militaryId: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, 'i') },
  };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  return User.findOne(query);
}

async function assertMilitaryIdAvailable(militaryId, { excludePersonnelId = null, excludeUserId = null } = {}) {
  const normalized = normalizeMilitaryId(militaryId);
  if (!normalized) {
    throw new Error('Military ID is required.');
  }

  const existingPersonnel = await findPersonnelWithMilitaryId(normalized, excludePersonnelId);
  if (existingPersonnel) {
    throw new Error(
      `Military ID is already issued to ${existingPersonnel.fullName} (${existingPersonnel.personnelId}).`
    );
  }

  const existingUser = await findUserWithMilitaryId(normalized, excludeUserId);
  if (existingUser) {
    throw new Error(
      `Military ID is already assigned to user ${existingUser.username} (${existingUser.fullName}).`
    );
  }

  return normalized;
}

module.exports = {
  normalizeMilitaryId,
  findPersonnelWithMilitaryId,
  findUserWithMilitaryId,
  assertMilitaryIdAvailable,
};
