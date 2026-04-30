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
  qrCode: { type: String },
  authorizedZones: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Personnel', personnelSchema);
