const mongoose = require('mongoose');

const personnelSchema = new mongoose.Schema({
  personnelId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  rank: { type: String, required: true },
  unit: { type: String, required: true },
  idNumber: { type: String, required: true, unique: true },
  phone: { type: String },
  email: { type: String },
  photo: { type: String },
  type: { type: String, enum: ['Military', 'Civilian', 'Staff'], default: 'Military' },
  status: { type: String, enum: ['Active', 'Inactive', 'Suspended'], default: 'Active' },
  militaryId: { type: String },
  transferredFrom: { type: String },
  qrCode: { type: String },
  hasVehicle: { type: Boolean, default: false },
  vehicleDetails: {
    plateNumber: { type: String },
    model: { type: String },
    color: { type: String }
  },
  authorizedZones: [{ type: String }],
  serviceVerified: { type: Boolean, default: false },
  serviceHistory: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Personnel', personnelSchema);
