/**
 * One-time / on-demand database & data hygiene.
 * Run: npm run cleanup
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Visitor = require('../models/Visitor');

async function cleanup() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/military_camp');
  console.log('Connected to MongoDB');

  // Remove incomplete visitor records (missing core fields)
  const incomplete = await Visitor.deleteMany({
    $or: [
      { visitorId: { $exists: false } },
      { visitorId: null },
      { visitorId: '' },
      { fullName: { $exists: false } },
      { fullName: null },
      { fullName: '' },
    ],
  });
  console.log(`Removed ${incomplete.deletedCount} incomplete visitor record(s)`);

  // Normalize legacy status values
  const statusFix = await Visitor.updateMany(
    { status: { $nin: ['Pending', 'Approved', 'Denied', 'Completed'] } },
    { $set: { status: 'Completed' } }
  );
  console.log(`Normalized ${statusFix.modifiedCount} visitor status value(s)`);

  // Normalize missing visitor type
  const typeFix = await Visitor.updateMany(
    { visitorType: { $nin: ['Military', 'Civilian'] } },
    { $set: { visitorType: 'Civilian' } }
  );
  console.log(`Normalized ${typeFix.modifiedCount} visitor type value(s)`);

  // Remove debug/test registrations from development
  const testData = await Visitor.deleteMany({
    $or: [
      { idNumber: { $regex: /^(TEST-|BIG-)/i } },
      { email: { $regex: /@test\.com$/i } },
      { fullName: { $regex: /^(Test Visitor|Big Photo)$/i } },
    ],
  });
  console.log(`Removed ${testData.deletedCount} test visitor record(s)`);

  console.log('Cleanup complete');
  await mongoose.disconnect();
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
});
