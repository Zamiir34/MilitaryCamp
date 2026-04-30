const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  visitorId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  idNumber: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  organization: { type: String },
  purposeOfVisit: { type: String, required: true },
  hostPersonnel: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' },
  hostName: { type: String },
  visitDate: { type: Date, required: true },
  expectedDuration: { type: String },
  photo: { type: String },
  qrCode: { type: String },
  vehiclePlate: { type: String },
  status: { type: String, enum: ['Pending', 'Approved', 'Denied', 'Completed'], default: 'Pending' },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Visitor', visitorSchema);
