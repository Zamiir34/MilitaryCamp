const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Personnel = require('./models/Personnel');
const Vehicle = require('./models/Vehicle');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/military_camp');
    console.log('Connected to MongoDB');

    // Create default admin
    const existingAdmin = await User.findOne({ email: 'admin@militarycamp.mil' });
    
    if (!existingAdmin) {
      await User.create({
        password: 'admin123',
        fullName: 'System Administrator',
        email: 'admin@militarycamp.mil',
        role: 'Administrator',
        militaryId: 'ADMIN-001',
        isEmailVerified: true,
      });
      console.log('✅ Admin user created: admin / admin123');
    } else {
      existingAdmin.password = 'admin123';
      existingAdmin.isEmailVerified = true;
      await existingAdmin.save();
      console.log('✅ Admin password reset: admin / admin123');
    }

    // Create second admin (mohamedabdi9098@gmail.com)
    const existingAdmin2 = await User.findOne({ email: 'mohamedabdi9098@gmail.com' });
    if (!existingAdmin2) {
      await User.create({
        password: 'admin123',
        fullName: 'Mohamed Abdi',
        email: 'mohamedabdi9098@gmail.com',
        role: 'Administrator',
        militaryId: 'ADMIN-002',
        isEmailVerified: true,
      });
      console.log('✅ Admin user created: mohamedabdi9098@gmail.com / admin123');
    } else {
      existingAdmin2.role = 'Administrator';
      existingAdmin2.isEmailVerified = true;
      await existingAdmin2.save();
      console.log('✅ mohamedabdi9098@gmail.com updated to Administrator role');
    }

    // Create security officer
    const existingOfficer = await User.findOne({ email: 'dclarke@militarycamp.mil' });
    if (!existingOfficer) {
      await User.create({
        password: 'officer123',
        fullName: 'MAJ. David Clarke',
        email: 'dclarke@militarycamp.mil',
        role: 'SecurityOfficer',
        rank: 'Major',
        badgeNumber: 'SO-001',
        militaryId: 'MIL-SO-001',
        isEmailVerified: true,
      });
      console.log('✅ Security Officer created: dclarke@militarycamp.mil / officer123');
    } else {
      existingOfficer.password = 'officer123';
      existingOfficer.isEmailVerified = true;
      await existingOfficer.save();
      console.log('✅ Security Officer password reset');
    }

    // Create guard
    const existingGuard = await User.findOne({ email: 'mstevens@militarycamp.mil' });
    if (!existingGuard) {
      await User.create({
        password: 'guard123',
        fullName: 'CPL. Mark Stevens',
        email: 'mstevens@militarycamp.mil',
        role: 'Guard',
        rank: 'Corporal',
        badgeNumber: 'G-042',
        militaryId: 'MIL-G-042',
        isEmailVerified: true,
      });
      console.log('✅ Guard created: guard1 / guard123');
    } else {
      existingGuard.password = 'guard123';
      existingGuard.isEmailVerified = true;
      await existingGuard.save();
      console.log('✅ Guard password reset');
    }

    // Sample Personnel
    const personnelCount = await Personnel.countDocuments();
    if (personnelCount === 0) {
      const { buildVerifyQrDataUrl } = require('./utils/verifyUrl');
      const samplePersonnel = [
        { personnelId: 'P20260001', fullName: 'SGT. John Mitchell', rank: 'Sergeant', unit: 'Alpha Company', idNumber: 'MIL-001234', type: 'Military', status: 'Active' },
        { personnelId: 'P20260002', fullName: 'CPL. Sarah Adams', rank: 'Corporal', unit: 'Bravo Company', idNumber: 'MIL-001235', type: 'Military', status: 'Active' },
        { personnelId: 'P20260003', fullName: 'Dr. Robert Chen', rank: 'Civilian', unit: 'Medical Division', idNumber: 'CIV-003421', type: 'Civilian', status: 'Active' },
      ];
      for (const p of samplePersonnel) {
        const qrCode = await buildVerifyQrDataUrl(p.personnelId);
        await Personnel.create({ ...p, qrCode });
      }
      console.log('✅ Sample personnel created');
    }

    // Sample Vehicles
    const vehicleCount = await Vehicle.countDocuments();
    if (vehicleCount === 0) {
      const { buildVerifyQrDataUrl } = require('./utils/verifyUrl');
      const sampleVehicles = [
        { vehicleId: 'V20260001', plateNumber: 'MIL-4472', vehicleType: 'Military Vehicle', make: 'Toyota', model: 'Land Cruiser', color: 'Olive Green', ownerName: 'Alpha Company', isAuthorized: true, status: 'Active' },
        { vehicleId: 'V20260002', plateNumber: 'MIL-3310', vehicleType: 'Truck', make: 'IVECO', model: 'Daily', color: 'Khaki', ownerName: 'Logistics Unit', isAuthorized: true, status: 'Active' },
      ];
      for (const v of sampleVehicles) {
        const qrCode = await buildVerifyQrDataUrl(v.vehicleId);
        await Vehicle.create({ ...v, qrCode });
      }
      console.log('✅ Sample vehicles created');
    }

    console.log('\n🎖️  Database seeded successfully!');
    console.log('\nDefault login credentials:');
    console.log('  Admin:          admin / admin123');
    console.log('  Security Officer: sec_officer / officer123');
    console.log('  Guard:          guard1 / guard123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error details:', JSON.stringify(err, null, 2));
    console.error('❌ Seed error message:', err.message);
    process.exit(1);
  }
}

seed();
