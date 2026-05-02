const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true, unique: true },
  plateNumber: { type: String, required: true, unique: true },
  vehicleType: { type: String, enum: ['Car', 'Truck', 'Motorcycle', 'Military Vehicle', 'Bus', 'Other'], required: true },
  make: { type: String },
  model: { type: String },
  color: { type: String },
  year: { type: Number },
  ownerName: { type: String, required: true },
  ownerIdNumber: { type: String },
  ownerPhone: { type: String },
  registrationNumber: { type: String },
  isAuthorized: { type: Boolean, default: false },
  qrCode: { type: String },
  status: { type: String, enum: ['Active', 'Blacklisted', 'Inactive'], default: 'Active' },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
