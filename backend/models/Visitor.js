const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  visitorId: { type: String, required: true, unique: true },
  fullName: { 
    type: String, 
    required: true,
    match: [/^[a-zA-Z\s]+$/, 'Fadlan magaca kaliya xarfo gali (Full name must contain only letters)']
  },
  visitorType: { type: String, enum: ['Military', 'Civilian'], required: true },
  rank: { type: String },
  idNumber: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        if (this.visitorType === 'Military') {
          return /^\d+$/.test(v);
        }
        return true;
      },
      message: 'Fadlan Military ID kaliya nambaro gali (Military ID must contain only numbers)'
    }
  },
  phone: { 
    type: String,
    match: [/^\+?\d[\d\s\-]*$/, 'Fadlan number sax ah gali (Please enter a valid phone number)']
  },
  email: { 
    type: String,
    match: [/@gmail\.com$/i, 'Emailka waa in uu ahaadaa @gmail.com']
  },
  organization: { type: String },
  purposeOfVisit: { type: String },
  hostPersonnel: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' },
  hostName: { type: String },
  visitDate: { type: Date, default: Date.now },
  expectedDuration: { type: String },
  photo: { type: String },
  qrCode: { type: String },
  hasVehicle: { type: Boolean, default: false },
  vehiclePlate: { type: String },
  vehicleModel: { type: String },
  vehicleColor: { type: String },
  status: { type: String, enum: ['Pending', 'Approved', 'Denied', 'Completed'], default: 'Pending' },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  otpCode: { type: String },
  otpExpires: { type: Date }
}, { timestamps: true });

visitorSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.otpCode;
  delete obj.otpExpires;
  return obj;
};

module.exports = mongoose.model('Visitor', visitorSchema);
