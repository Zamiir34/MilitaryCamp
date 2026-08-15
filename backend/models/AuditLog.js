const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  method: { type: String, required: true },
  endpoint: { type: String, required: true },
  details: { type: Object },
  ipAddress: { type: String },
}, { timestamps: true });

auditLogSchema.index({ endpoint: 'text', action: 'text' });

module.exports = mongoose.model('AuditLog', auditLogSchema);
