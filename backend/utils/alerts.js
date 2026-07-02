const Alert = require('../models/Alert');

const REPORTER_FIELDS = 'fullName rank role';

async function populateAlert(alertDoc) {
  if (!alertDoc) return null;
  return Alert.findById(alertDoc._id).populate('reportedBy', REPORTER_FIELDS);
}

async function broadcastAlert(io, alertDoc) {
  const populated = await populateAlert(alertDoc);
  if (io && populated) {
    io.emit('new_alert', populated.toObject());
  }
  return populated;
}

async function broadcastAlertResolved(io, alertDoc) {
  if (!io || !alertDoc) return;
  io.emit('alert_resolved', {
    _id: alertDoc._id?.toString(),
    alertId: alertDoc.alertId,
    isResolved: true,
  });
}

module.exports = { populateAlert, broadcastAlert, broadcastAlertResolved, REPORTER_FIELDS };
