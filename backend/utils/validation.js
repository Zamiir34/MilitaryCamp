const mongoose = require('mongoose');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

const cleanString = (value) => (typeof value === 'string' ? value.trim() : value);

const cleanOptionalString = (value) => {
  const cleaned = cleanString(value);
  return cleaned === '' ? undefined : cleaned;
};

const cleanStringFields = (body, fields) => {
  fields.forEach((field) => {
    if (body[field] !== undefined) body[field] = cleanOptionalString(body[field]);
  });
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const validationError = (message, field) => {
  const err = new Error(message);
  err.statusCode = 400;
  if (field) err.field = field;
  return err;
};

const requireFields = (body, fields) => {
  for (const field of fields) {
    if (isBlank(body[field])) {
      throw validationError(`${field} is required.`, field);
    }
    body[field] = cleanString(body[field]);
  }
};

const validateEmail = (email, field = 'email', required = true) => {
  if (isBlank(email)) {
    if (required) throw validationError('Email is required.', field);
    return undefined;
  }

  const cleaned = cleanString(email).toLowerCase();
  if (!EMAIL_REGEX.test(cleaned)) {
    throw validationError('A valid email address is required.', field);
  }
  return cleaned;
};

const validateEnum = (value, allowed, field, required = true) => {
  if (isBlank(value)) {
    if (required) throw validationError(`${field} is required.`, field);
    return undefined;
  }

  const cleaned = cleanString(value);
  if (!allowed.includes(cleaned)) {
    throw validationError(`${field} must be one of: ${allowed.join(', ')}.`, field);
  }
  return cleaned;
};

const validateObjectId = (id, field = 'id') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw validationError(`Invalid ${field}.`, field);
  }
};

const validatePositiveInt = (value, field, defaultValue, maxValue = 100) => {
  if (isBlank(value)) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw validationError(`${field} must be a positive number.`, field);
  }
  return Math.min(parsed, maxValue);
};

const validatePassword = (password, field = 'password', required = true) => {
  if (isBlank(password)) {
    if (required) throw validationError('Password is required.', field);
    return undefined;
  }

  if (String(password).length < 6) {
    throw validationError('Password must be at least 6 characters.', field);
  }
  return String(password);
};

const formatDbError = (err) => {
  if (err.statusCode) return err.message;

  if (err.name === 'ValidationError') {
    return Object.values(err.errors).map((e) => e.message).join(' ');
  }

  if (err.name === 'CastError') {
    return `Invalid ${err.path || 'value'}.`;
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'value';
    return `${field} is already registered.`;
  }

  return err.message || 'Validation failed.';
};

const sendValidationError = (res, err) => {
  const status = err.statusCode || 400;
  return res.status(status).json({ message: formatDbError(err), field: err.field });
};

module.exports = {
  EMAIL_REGEX,
  cleanOptionalString,
  cleanString,
  cleanStringFields,
  escapeRegex,
  formatDbError,
  isBlank,
  requireFields,
  sendValidationError,
  validateEmail,
  validateEnum,
  validateObjectId,
  validatePassword,
  validatePositiveInt,
  validationError,
};
