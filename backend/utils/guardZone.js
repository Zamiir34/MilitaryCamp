const Personnel = require('../models/Personnel');
const User = require('../models/User');

const ZONE_LABELS = {
  'Zone A': 'Zone A - Admin',
  'Zone B': 'Zone B - Barracks',
  'Zone C': 'Zone C - Armory',
  'Zone D': 'Zone D - Motor Pool',
  'Zone E': 'Zone E - Medical',
  HQ: 'Zone A - Admin',
  'All Zones': 'Zone A - Admin',
};

function normalizeZone(zone) {
  if (!zone || typeof zone !== 'string') return null;
  const trimmed = zone.trim();
  if (!trimmed) return null;
  return ZONE_LABELS[trimmed] || trimmed;
}

function zoneFromPersonnel(personnel) {
  const raw = personnel?.authorizedZones?.[0];
  return normalizeZone(raw);
}

async function findPersonnelForGuard(user) {
  if (!user?.militaryId) return null;
  const normalized = String(user.militaryId).trim();
  if (!normalized) return null;

  return Personnel.findOne({
    $or: [
      { personnelId: normalized },
      { idNumber: normalized },
      { militaryId: normalized },
    ],
  }).select('authorizedZones personnelId');
}

async function resolveGuardZone(user) {
  if (!user || user.role !== 'Guard') return null;

  const personnel = await findPersonnelForGuard(user);
  const fromPersonnel = zoneFromPersonnel(personnel);
  if (fromPersonnel) return fromPersonnel;

  return normalizeZone(user.assignedZone);
}

async function syncGuardZone(user) {
  if (!user || user.role !== 'Guard') return null;

  const zone = await resolveGuardZone(user);
  if (zone && user.assignedZone !== zone) {
    user.assignedZone = zone;
    await user.save();
  }
  return zone;
}

async function syncLinkedGuardZone(personnel) {
  if (!personnel?.personnelId) return;

  const zone = zoneFromPersonnel(personnel);
  if (!zone) return;

  await User.updateMany(
    { militaryId: personnel.personnelId, role: 'Guard' },
    { $set: { assignedZone: zone } }
  );
}

module.exports = {
  normalizeZone,
  zoneFromPersonnel,
  findPersonnelForGuard,
  resolveGuardZone,
  syncGuardZone,
  syncLinkedGuardZone,
};
