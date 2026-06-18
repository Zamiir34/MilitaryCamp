const nodemailer = require('nodemailer');

/**
 * Send a verification OTP email.
 * In development (or if SMTP is not configured), it falls back to console logging.
 */
async function sendVerificationEmail(toEmail, fullName, code) {
  const subject = 'Military Camp – Email Verification Code';
  const text = `Your verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, please contact your administrator.`;
  const html = `
    <div style="font-family:sans-serif;background:#0d1117;color:#e6edf3;padding:32px;border-radius:12px;max-width:480px;margin:auto;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:#161b22;border:1px solid #30363d;border-radius:10px;padding:12px 20px;">
          <span style="font-size:20px;font-weight:700;letter-spacing:4px;color:#22c55e;">MILITARY CAMP</span>
        </div>
      </div>
      <h2 style="color:#22c55e;font-size:16px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Email Verification</h2>
      <p style="color:#8b949e;margin-bottom:24px;">Hello <strong style="color:#e6edf3;">${fullName}</strong>, use the code below to complete your login:</p>
      <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
        <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#22c55e;font-family:monospace;">${code}</span>
      </div>
      <p style="color:#8b949e;font-size:13px;">This code expires in <strong style="color:#e6edf3;">15 minutes</strong>.</p>
      <p style="color:#8b949e;font-size:12px;margin-top:24px;border-top:1px solid #21262d;padding-top:16px;">If you did not attempt to log in, contact your system administrator immediately.</p>
    </div>
  `;

  const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!smtpConfigured) {
    // Console fallback for development
    console.log('\n========================================');
    console.log('📧 EMAIL VERIFICATION CODE (Dev Mode)');
    console.log(`   To:   ${toEmail}`);
    console.log(`   Name: ${fullName}`);
    console.log(`   CODE: ${code}`);
    console.log('========================================\n');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject,
    text,
    html,
  });
}

module.exports = { sendVerificationEmail };
