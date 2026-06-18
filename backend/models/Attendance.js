const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  checkInTime: { type: Date, required: true },
  checkOutTime: { type: Date },
  status: { type: String, enum: ['Present', 'Absent', 'On Duty'], default: 'Present' },
  notes: { type: String }
}, { timestamps: true });

// Ensure unique index per user per day to prevent double check-ins
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
