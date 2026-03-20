const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const router = express.Router();

const otpStore = new Map();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_APP_PASSWORD,
  },
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
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#0f1117;font-family:'Inter',sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:#1a1d27;border-radius:16px;border:1px solid rgba(255,255,255,0.08);padding:40px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="width:36px;height:36px;background:#6366f1;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                <span style="color:white;font-size:18px;">&#128269;</span>
              </div>
              <span style="color:#f1f5f9;font-size:22px;font-weight:700;">DataLens AI</span>
            </div>
          </div>
          <h2 style="color:#f1f5f9;font-size:20px;font-weight:600;margin:0 0 8px 0;text-align:center;">Your verification code</h2>
          <p style="color:#64748b;font-size:14px;text-align:center;margin:0 0 32px 0;">Enter this code to sign in to DataLens AI</p>
          <div style="background:#22263a;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="color:#f1f5f9;font-size:40px;font-weight:700;letter-spacing:12px;">${otp}</span>
          </div>
          <p style="color:#64748b;font-size:13px;text-align:center;margin:0 0 8px 0;">This code expires in <strong style="color:#f1f5f9;">10 minutes</strong></p>
          <p style="color:#64748b;font-size:13px;text-align:center;margin:0;">If you did not request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">
          <p style="color:#334155;font-size:12px;text-align:center;margin:0;">DataLens AI &middot; Powered by Groq LLaMA 3.3</p>
        </div>
      </body>
      </html>
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