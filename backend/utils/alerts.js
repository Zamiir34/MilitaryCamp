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

module.exports = { populateAlert, broadcastAlert, REPORTER_FIELDS };
