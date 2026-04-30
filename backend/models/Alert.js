const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  alertId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Unauthorized Access', 'Blacklisted Vehicle', 'Expired Permit', 'Suspicious Activity', 'System Alert'], required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  message: { type: String, required: true },
  details: { type: String },
  relatedLog: { type: mongoose.Schema.Types.ObjectId, ref: 'EntryLog' },
  gate: { type: String },
  isResolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema);
