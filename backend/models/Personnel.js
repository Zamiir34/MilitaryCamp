const mongoose = require('mongoose');

const personnelSchema = new mongoose.Schema({
  personnelId: { type: String, required: true, unique: true },
  fullName: { 
    type: String, 
    required: true,
    trim: true,
    match: [/^[\p{L}\s\-']+$/u, 'Magaca waa inuu ka kooban yahay xarfaha kaliya (Full name must contain letters only)']
  },
  rank: { type: String, required: true },
  unit: { type: String, required: true },
  idNumber: { type: String, required: true, unique: true },
  phone: { 
    type: String,
    match: [/^\+?[\d\s\-]{6,20}$/, 'Fadlan phone number sax ah gali (Enter a valid phone number)']
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
    uppercase: true,
    match: [/^[A-Za-z]{1,6}(-[A-Za-z0-9]{1,8})+$/, 'Military ID waa inuu ahaado qaab sidan: MIL-001 ama MC-2024-001']
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
