const User = require('../models/User');
const { zoneFromPersonnel } = require('./guardZone');
const { sendVerificationEmail } = require('./email');
const { normalizeMilitaryId } = require('./militaryId');

async function findGuardAccountForPersonnel(personnel) {
  if (!personnel?.personnelId) return null;
  return User.findOne({ militaryId: personnel.personnelId, role: 'Guard' }).select(
    'email role isActive isEmailVerified fullName militaryId assignedZone createdAt'
  );
}

async function issueGuardAccountForPersonnel(personnel, { password, email }) {
  if (!personnel) throw new Error('Personnel not found');

  if (!normalizeMilitaryId(personnel.militaryId)) {
    throw new Error('Personnel must have a Military ID before issuing a guard account.');
  }

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedPassword = typeof password === 'string' ? password : '';

  if (!normalizedPassword || normalizedPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (!normalizedEmail) throw new Error('Email is required for guard account activation.');

  const assignedZone = zoneFromPersonnel(personnel);
  if (!assignedZone) {
    throw new Error('Personnel must have an authorized zone before issuing a guard account.');
  }

  const existingForPersonnel = await findGuardAccountForPersonnel(personnel);
  if (existingForPersonnel) {
    throw new Error('This personnel record already has a guard account.');
  }

  const duplicate = await User.findOne({ email: normalizedEmail });
  if (duplicate) {
    throw new Error('Email is already taken.');
  }

  const user = new User({
    password: normalizedPassword,
    email: normalizedEmail,
    fullName: personnel.fullName,
    role: 'Guard',
    rank: personnel.rank,
    phone: personnel.phone,
    militaryId: personnel.personnelId,
    assignedZone,
    isEmailVerified: false,
  });
  await user.save();

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationCode = code;
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    await sendVerificationEmail(user.email, user.fullName, code);
  } catch (emailErr) {
    console.error('Failed to send guard verification email:', emailErr.message);
  }

  return user;
}

async function resetGuardPasswordForPersonnel(personnel, password) {
  if (!personnel) throw new Error('Personnel not found');

  const normalizedPassword = typeof password === 'string' ? password : '';
  if (!normalizedPassword || normalizedPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const user = await findGuardAccountForPersonnel(personnel);
  if (!user) throw new Error('No guard account exists for this personnel record.');

  user.password = normalizedPassword;
  await user.save();
  return user;
}

module.exports = {
  findGuardAccountForPersonnel,
  issueGuardAccountForPersonnel,
  resetGuardPasswordForPersonnel,
};
