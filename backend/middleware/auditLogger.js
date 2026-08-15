const AuditLog = require('../models/AuditLog');

const auditLogger = (req, res, next) => {
  // Only log modifying actions, not generic GET requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Capture the original send method
    const originalSend = res.send;

    res.send = function (body) {
      // Restore original send and call it
      res.send = originalSend;
      const result = res.send(body);

      // We log asynchronously after sending the response to not block the request
      if (req.user && req.user._id) { // Set by authentication middleware
        let action = 'UNKNOWN';
        if (req.method === 'POST') action = 'CREATE';
        if (req.method === 'PUT' || req.method === 'PATCH') action = 'UPDATE';
        if (req.method === 'DELETE') action = 'DELETE';

        // Custom action mappings for specific endpoints
        if (req.originalUrl.includes('/api/auth/login')) action = 'LOGIN';
        if (req.originalUrl.includes('/api/auth/register')) action = 'REGISTER';

        // Filter sensitive data
        const details = { ...req.body };
        if (details.password) details.password = '[REDACTED]';
        if (details.oldPassword) details.oldPassword = '[REDACTED]';
        if (details.newPassword) details.newPassword = '[REDACTED]';

        const auditEntry = new AuditLog({
          user: req.user._id,
          action,
          method: req.method,
          endpoint: req.originalUrl,
          details,
          ipAddress: req.ip || req.connection.remoteAddress
        });

        auditEntry.save().catch(err => {
          console.error('Audit Log Error:', err);
        });
      }

      return result;
    };
  }
  next();
};

module.exports = auditLogger;
