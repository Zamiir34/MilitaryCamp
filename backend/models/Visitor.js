const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  visitorId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  visitorType: { type: String, enum: ['Military', 'Civilian'], required: true },
  idNumber: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
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
