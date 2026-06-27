const mongoose = require('mongoose');

const entryLogSchema = new mongoose.Schema({
  logId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Personnel', 'Vehicle', 'Visitor'], required: true },
  action: { type: String, enum: ['Entry', 'Exit'], required: true },
  personnel: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor' },
  subjectName: { type: String, required: true },
  subjectId: { type: String },
  driverName: { type: String },
  gate: { type: String, default: 'Main Gate' },
  checkpoint: { type: String },
  entryTime: { type: Date },
  exitTime: { type: Date },
  duration: { type: Number }, // in minutes
  purpose: { type: String },
  isAuthorized: { type: Boolean, default: true },
  notes: { type: String },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedByName: { type: String }
}, { timestamps: true });

// Auto-calculate duration when exitTime is set
entryLogSchema.pre('save', async function () {
  if (this.entryTime && this.exitTime) {
    this.duration = Math.round((this.exitTime - this.entryTime) / (1000 * 60));
  }
});

module.exports = mongoose.model('EntryLog', entryLogSchema);
