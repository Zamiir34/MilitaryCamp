const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  alertId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Unauthorized Access', 'Blacklisted Vehicle', 'Expired Permit', 'Suspicious Activity', 'System Alert', 'Notification', 'Personnel Exit', 'security_breach', 'fire', 'medical', 'equipment_failure', 'other'], required: true },
  severity: { type: String, enum: ['low', 'Low', 'Info', 'Medium', 'high', 'High', 'critical', 'Critical'], default: 'Medium' },
  message: { type: String, required: true },
  details: { type: String },
  relatedLog: { type: mongoose.Schema.Types.ObjectId, ref: 'EntryLog' },
  gate: { type: String },
  isResolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
