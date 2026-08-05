const mongoose = require('mongoose');

const personnelSchema = new mongoose.Schema({
  personnelId: { type: String, required: true, unique: true },
  fullName: { 
    type: String, 
    required: true,
    match: [/^[a-zA-Z\s]+$/, 'Fadlan magaca kaliya xarfo gali (Full name must contain only letters)']
  },
  rank: { type: String, required: true },
  unit: { type: String, required: true },
  idNumber: { type: String, required: true, unique: true },
  phone: { 
    type: String,
    match: [/^\d+$/, 'Fadlan number kaliya gali (Phone number must contain only numbers)']
  },
  email: { 
    type: String,
    match: [/@gmail\.com$/i, 'Emailka waa in uu ahaadaa @gmail.com']
  },
  photo: { type: String },
  type: { type: String, enum: ['Military', 'Civilian', 'Staff'], default: 'Military' },
  status: { type: String, enum: ['Active', 'Inactive', 'Suspended'], default: 'Active' },
  militaryId: { 
    type: String, 
    unique: true, 
    sparse: true, 
    trim: true,
    match: [/^\d+$/, 'Military ID fadlan number kaliya gali (Must contain only numbers)']
  },
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
