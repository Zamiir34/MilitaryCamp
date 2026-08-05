const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  password: { type: String, required: true, minlength: 6 },
  fullName: { type: String, required: true },
  role: { type: String, enum: ['Administrator', 'SecurityOfficer', 'Guard'], default: 'Guard' },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  rank: { type: String },
  badgeNumber: { type: String },
  militaryId: { type: String, unique: true, sparse: true },
  assignedZone: { type: String },
  hasVehicle: { type: Boolean, default: false },
  vehicleDetails: {
    plateNumber: { type: String },
    model: { type: String },
    color: { type: String }
  },
  isActive: { type: Boolean, default: true },
  isOnDuty: { type: Boolean, default: false },
  lastLogin: { type: Date },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String },
  emailVerificationExpires: { type: Date }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  this.updatedAt = new Date();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationCode;
  delete obj.emailVerificationExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
