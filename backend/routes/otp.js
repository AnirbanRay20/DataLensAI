const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const router = express.Router();

const otpStore = new Map();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true,               // connection pooling — reuse SMTP connection
  maxConnections: 5,        // up to 5 parallel connections
  maxMessages: 100,
  rateLimit: 10,            // 10 messages per second max
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_APP_PASSWORD,
  },
});

// Verify connection on server start (add to server.js startup)
transporter.verify((error) => {
  if (error) {
    console.error('[SMTP] Connection failed:', error.message);
  } else {
    console.log('[SMTP] Ready to send emails');
  }
});

// POST /api/otp/send
router.post('/otp/send', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  otpStore.set(email.toLowerCase(), { otp, expiresAt, attempts: 0 });

  const mailOptions = {
    from: '"DataLens AI" <' + process.env.SMTP_EMAIL + '>',
    to: email,
    subject: 'Your DataLens AI verification code',
    html: `
<div style="max-width:420px;margin:0 auto;background:#1a1d27;padding:32px;border-radius:12px;font-family:Arial,sans-serif;">
  <h1 style="color:#6366f1;font-size:20px;margin:0 0 4px;">DataLens AI</h1>
  <p style="color:#94a3b8;font-size:13px;margin:0 0 24px;">Your verification code</p>
  <div style="background:#0f1117;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px;">
    <span style="color:#f1f5f9;font-size:36px;font-weight:700;letter-spacing:10px;">${otp}</span>
  </div>
  <p style="color:#64748b;font-size:12px;margin:0;">Expires in 10 minutes. If you did not request this, ignore this email.</p>
</div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('[OTP] Sent to ' + email);
    res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('[OTP] Email send failed:', err.message);
    res.status(500).json({ error: 'EMAIL_FAILED', message: 'Failed to send email. Please try again.' });
  }
});

// POST /api/otp/verify
router.post('/otp/verify', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Email and OTP are required.' });
  }

  const stored = otpStore.get(email.toLowerCase());

  if (!stored) {
    return res.status(400).json({ error: 'OTP_NOT_FOUND', message: 'No OTP found for this email. Please request a new one.' });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: 'OTP_EXPIRED', message: 'This code has expired. Please request a new one.' });
  }

  if (stored.attempts >= 5) {
    otpStore.delete(email.toLowerCase());
    return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS', message: 'Too many incorrect attempts. Please request a new code.' });
  }

  if (stored.otp !== otp.trim()) {
    stored.attempts += 1;
    const remaining = 5 - stored.attempts;
    return res.status(400).json({
      error: 'INVALID_OTP',
      message: 'Incorrect code. ' + remaining + ' attempts remaining.',
    });
  }

  otpStore.delete(email.toLowerCase());

  const sessionToken = crypto.randomBytes(32).toString('hex');

  res.json({
    success: true,
    message: 'Email verified successfully.',
    token: sessionToken,
    email: email.toLowerCase(),
  });
});

module.exports = router;

// Warm up SMTP connection when server starts
setTimeout(() => {
  transporter.verify((err) => {
    if (!err) console.log('[SMTP] Connection warmed up');
  });
}, 2000);