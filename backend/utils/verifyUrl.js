const QRCode = require('qrcode');

function getClientBaseUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function buildVerifyUrl(id) {
  return `${getClientBaseUrl()}/verify/${encodeURIComponent(id)}`;
}

async function buildVerifyQrDataUrl(id) {
  return QRCode.toDataURL(buildVerifyUrl(id), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
  });
}

module.exports = { getClientBaseUrl, buildVerifyUrl, buildVerifyQrDataUrl };
