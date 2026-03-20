# LANDING PAGE & AUTHENTICATION UPGRADE
## For: Google IDX Antigravity IDE
## Project: DataLens AI — existing full-stack React + Express app
## DO NOT recreate from scratch. Modify the existing project only.

---

## WHAT YOU ARE BUILDING

A premium first-landing page exactly like ChatGPT or Claude's login screen — clean, minimal, centered card with three login options:
1. **Google OAuth** (Firebase)
2. **Microsoft OAuth** (Firebase)
3. **Custom Email Login with OTP** (auto-generated 6-digit OTP sent via Nodemailer)

After successful login → user lands on the **interaction page** (CSV upload + dataset picker + start dashboard).

---

## VISUAL DESIGN REFERENCE

The landing page must look like this layout:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│           🔍  DataLens AI                           │
│        Turn questions into dashboards               │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │                                               │  │
│  │   Welcome back                                │  │
│  │   Sign in to continue                         │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  G  Continue with Google                │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  ⊞  Continue with Microsoft             │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │                                               │  │
│  │  ────────────── or ──────────────            │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  Email address                          │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  Continue with Email →                  │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│         Terms of Service  ·  Privacy Policy         │
└─────────────────────────────────────────────────────┘
```

**OTP Screen (after email entered):**
```
┌───────────────────────────────────────┐
│                                       │
│   Check your email                    │
│   We sent a 6-digit code to           │
│   anirban@gmail.com                   │
│                                       │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐    │
│   │  │ │  │ │  │ │  │ │  │ │  │    │
│   └──┘ └──┘ └──┘ └──┘ └──┘ └──┘    │
│                                       │
│   [ Verify Code ]                     │
│                                       │
│   Resend code in 30s                  │
│   ← Use a different email             │
│                                       │
└───────────────────────────────────────┘
```

---

## DESIGN SPECIFICATIONS

### Colors (dark theme — same as existing dashboard)
```css
background page:     #0f1117
card background:     #1a1d27
card border:         1px solid rgba(255,255,255,0.08)
card border-radius:  16px
button Google:       white background, #1a1a1a text
button Microsoft:    white background, #1a1a1a text
button Email CTA:    #6366f1 background, white text
input background:    #22263a
input border:        1px solid #334155
input focus border:  #6366f1
text primary:        #f1f5f9
text muted:          #64748b
OTP box:             #22263a bg, 48x56px, centered digit
OTP box focused:     border #6366f1, glow ring
```

### Typography
```
Heading font:   "Space Grotesk", sans-serif
Body font:      "Inter", sans-serif
Logo size:      28px bold
Tagline:        14px, muted
Card heading:   20px, font-weight 600
Button text:    14px, font-weight 500
```

### Animations
- Page load: card fades in with `translateY(16px)` → `translateY(0)`, duration 400ms
- Button hover: slight scale(1.01) + brightness increase
- OTP boxes: shake animation on wrong code entry
- Success state: green checkmark with scale-in animation before redirect

---

## NEW FILES TO CREATE

```
frontend/src/
├── pages/
│   ├── AuthPage.jsx          ← Main login page (Google, Microsoft, Email)
│   └── OtpPage.jsx           ← OTP verification screen
├── components/
│   └── AuthLayout.jsx        ← Shared wrapper (logo + card + footer)
└── utils/
    └── auth.js               ← Firebase auth helpers

backend/
└── routes/
    └── otp.js                ← OTP generation, email sending, verification
```

---

## FILE 1: `backend/routes/otp.js` — FULL IMPLEMENTATION

```javascript
const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const router = express.Router();

// In-memory OTP store: { email: { otp, expiresAt, attempts } }
const otpStore = new Map();

// Configure nodemailer transporter
// Uses Gmail — add SMTP credentials to backend .env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,      // e.g. datalensai@gmail.com
    pass: process.env.SMTP_APP_PASSWORD // Gmail App Password (not your login password)
  }
});

// POST /api/otp/send
// Body: { email: string }
router.post('/otp/send', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // expires in 10 minutes

  // Store OTP (overwrite if already exists)
  otpStore.set(email.toLowerCase(), { otp, expiresAt, attempts: 0 });

  // Send email
  const mailOptions = {
    from: `"DataLens AI" <${process.env.SMTP_EMAIL}>`,
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
                <span style="color:white;font-size:18px;">🔍</span>
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
          <p style="color:#64748b;font-size:13px;text-align:center;margin:0;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">
          <p style="color:#334155;font-size:12px;text-align:center;margin:0;">DataLens AI · Powered by Groq LLaMA 3.3</p>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[OTP] Sent to ${email}`);
    res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('[OTP] Email send failed:', err.message);
    res.status(500).json({ error: 'EMAIL_FAILED', message: 'Failed to send email. Please try again.' });
  }
});

// POST /api/otp/verify
// Body: { email: string, otp: string }
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
    return res.status(400).json({ error: 'INVALID_OTP', message: `Incorrect code. ${5 - stored.attempts} attempts remaining.` });
  }

  // OTP is correct — clear it and return success
  otpStore.delete(email.toLowerCase());

  // Generate a simple session token (use JWT in production)
  const sessionToken = crypto.randomBytes(32).toString('hex');

  res.json({
    success: true,
    message: 'Email verified successfully.',
    token: sessionToken,
    email: email.toLowerCase(),
  });
});

module.exports = router;
```

---

## FILE 2: Add to `backend/.env`

```
SMTP_EMAIL=your_gmail_address@gmail.com
SMTP_APP_PASSWORD=your_gmail_app_password_here
```

**How to get Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Search "App passwords" → Create one for "Mail"
4. Copy the 16-character password → paste as SMTP_APP_PASSWORD

---

## FILE 3: Add to `backend/server.js`

Add these lines after existing route imports:

```javascript
const otpRoutes = require('./routes/otp');
app.use('/api', otpRoutes);
```

Also add to `backend/package.json` dependencies:
```json
"nodemailer": "^6.9.9"
```

Run: `npm install nodemailer`

---

## FILE 4: `frontend/src/components/AuthLayout.jsx`

```jsx
import React from 'react';
import { BarChart2 } from 'lucide-react';

export default function AuthLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f1117',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
        <div style={{
          width: '36px', height: '36px', background: '#6366f1',
          borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <BarChart2 size={18} color="white" />
        </div>
        <span style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: '700', fontFamily: '"Space Grotesk", sans-serif' }}>
          DataLens <span style={{ color: '#6366f1' }}>AI</span>
        </span>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#1a1d27',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '36px 32px',
        animation: 'fadeInUp 0.4s ease-out',
      }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
        <a href="#" style={{ color: '#334155', fontSize: '12px', textDecoration: 'none' }}>Terms of Service</a>
        <span style={{ color: '#334155', fontSize: '12px' }}>·</span>
        <a href="#" style={{ color: '#334155', fontSize: '12px', textDecoration: 'none' }}>Privacy Policy</a>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap');
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
```

---

## FILE 5: `frontend/src/pages/AuthPage.jsx` — FULL IMPLEMENTATION

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import AuthLayout from '../components/AuthLayout';
import { Loader2, Mail, ArrowRight } from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // ── Google Login ──────────────────────────────────
  async function handleGoogle() {
    setGoogleLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_email', result.user.email);
      localStorage.setItem('auth_name', result.user.displayName);
      localStorage.setItem('auth_photo', result.user.photoURL || '');
      navigate('/app');
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    }
    setGoogleLoading(false);
  }

  // ── Microsoft Login ───────────────────────────────
  async function handleMicrosoft() {
    setMicrosoftLoading(true);
    setError('');
    try {
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_email', result.user.email);
      localStorage.setItem('auth_name', result.user.displayName);
      localStorage.setItem('auth_photo', result.user.photoURL || '');
      navigate('/app');
    } catch (err) {
      setError('Microsoft sign-in failed. Please try again.');
    }
    setMicrosoftLoading(false);
  }

  // ── Email OTP ─────────────────────────────────────
  async function handleEmailContinue() {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setEmailLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      // Navigate to OTP page with email
      navigate('/verify-otp', { state: { email: email.trim().toLowerCase() } });
    } catch (err) {
      setError(err.message || 'Failed to send code. Please try again.');
    }
    setEmailLoading(false);
  }

  const btnBase = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.15s',
    border: 'none',
    outline: 'none',
  };

  return (
    <AuthLayout>
      <h2 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: '600', margin: '0 0 6px', fontFamily: '"Space Grotesk", sans-serif' }}>
        Welcome back
      </h2>
      <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 28px' }}>
        Sign in to DataLens AI to continue
      </p>

      {/* Google Button */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading || microsoftLoading || emailLoading}
        style={{ ...btnBase, background: '#ffffff', color: '#1a1a1a', marginBottom: '10px' }}
        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
        onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
      >
        {googleLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : (
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
            <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16.5 19.2 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/>
            <path fill="#FBBC05" d="M24 46c5.5 0 10.5-1.9 14.3-5l-6.6-5.4C29.8 37 27 38 24 38c-6 0-11.1-4-12.9-9.5l-7 5.4C7.8 41.6 15.3 46 24 46z"/>
            <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.6-2.7 4.8-5.1 6.2l6.6 5.4c3.8-3.5 6.2-8.7 6.2-15.1 0-1.3-.2-2.7-.5-4z"/>
          </svg>
        )}
        Continue with Google
      </button>

      {/* Microsoft Button */}
      <button
        onClick={handleMicrosoft}
        disabled={googleLoading || microsoftLoading || emailLoading}
        style={{ ...btnBase, background: '#ffffff', color: '#1a1a1a', marginBottom: '20px' }}
        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
        onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
      >
        {microsoftLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : (
          <svg width="18" height="18" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
        )}
        Continue with Microsoft
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ color: '#334155', fontSize: '13px' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* Email Input */}
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleEmailContinue()}
        placeholder="Email address"
        style={{
          width: '100%',
          padding: '12px 14px',
          background: '#22263a',
          border: '1px solid #334155',
          borderRadius: '10px',
          color: '#f1f5f9',
          fontSize: '14px',
          marginBottom: '10px',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
          fontFamily: 'Inter, sans-serif',
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = '#334155'}
      />

      {/* Error */}
      {error && (
        <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ⚠ {error}
        </p>
      )}

      {/* Continue with Email */}
      <button
        onClick={handleEmailContinue}
        disabled={emailLoading || googleLoading || microsoftLoading}
        style={{
          ...btnBase,
          background: email.trim() ? '#6366f1' : '#22263a',
          color: email.trim() ? '#ffffff' : '#475569',
          border: '1px solid',
          borderColor: email.trim() ? '#6366f1' : '#334155',
        }}
        onMouseEnter={e => { if (email.trim()) e.currentTarget.style.background = '#5457e5'; }}
        onMouseLeave={e => { if (email.trim()) e.currentTarget.style.background = '#6366f1'; }}
      >
        {emailLoading
          ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          : <><Mail size={15} /><span>Continue with Email</span><ArrowRight size={14} /></>
        }
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthLayout>
  );
}
```

---

## FILE 6: `frontend/src/pages/OtpPage.jsx` — FULL IMPLEMENTATION

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export default function OtpPage() {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [resending, setResending] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  // Redirect if no email
  useEffect(() => {
    if (!email) navigate('/');
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  function handleDigitChange(index, value) {
    if (!/^\d*$/.test(value)) return; // digits only
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1); // only last char
    setDigits(newDigits);
    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (value && index === 5) {
      const fullOtp = [...newDigits.slice(0, 5), value.slice(-1)].join('');
      if (fullOtp.length === 6) verifyOtp(fullOtp);
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      verifyOtp(pasted);
    }
  }

  async function verifyOtp(otp) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        throw new Error(data.message);
      }
      // Save session
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_email', data.email);
      setSuccess(true);
      setTimeout(() => navigate('/app'), 1200);
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    }
    setLoading(false);
  }

  async function handleResend() {
    setResending(true);
    setError('');
    try {
      await fetch(`${BASE}/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendTimer(30);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError('Failed to resend. Please try again.');
    }
    setResending(false);
  }

  const otpBoxStyle = (i) => ({
    width: '48px',
    height: '56px',
    background: '#22263a',
    border: `1.5px solid ${digits[i] ? '#6366f1' : '#334155'}`,
    borderRadius: '10px',
    color: '#f1f5f9',
    fontSize: '22px',
    fontWeight: '600',
    textAlign: 'center',
    outline: 'none',
    transition: 'border-color 0.15s',
    animation: shake ? 'shake 0.5s ease' : 'none',
    fontFamily: '"Space Grotesk", sans-serif',
  });

  if (success) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            width: '64px', height: '64px', background: '#10b981',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
            animation: 'scaleIn 0.3s ease',
          }}>
            <CheckCircle size={32} color="white" />
          </div>
          <h2 style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: '600', margin: '0 0 8px' }}>Verified!</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Redirecting you to DataLens AI...</p>
        </div>
        <style>{`@keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }`}</style>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <button
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: 0, marginBottom: '20px' }}
      >
        <ArrowLeft size={14} /> Use a different email
      </button>

      <h2 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: '600', margin: '0 0 6px', fontFamily: '"Space Grotesk", sans-serif' }}>
        Check your email
      </h2>
      <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 28px', lineHeight: '1.5' }}>
        We sent a 6-digit verification code to<br />
        <span style={{ color: '#f1f5f9', fontWeight: '500' }}>{email}</span>
      </p>

      {/* OTP Input Boxes */}
      <div
        onPaste={handlePaste}
        style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => inputRefs.current[i] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleDigitChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = d ? '#6366f1' : '#334155'}
            style={otpBoxStyle(i)}
            autoFocus={i === 0}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', margin: '0 0 16px' }}>
          ⚠ {error}
        </p>
      )}

      {/* Verify Button */}
      <button
        onClick={() => verifyOtp(digits.join(''))}
        disabled={digits.join('').length !== 6 || loading}
        style={{
          width: '100%', padding: '12px', borderRadius: '10px',
          background: digits.join('').length === 6 ? '#6366f1' : '#22263a',
          color: digits.join('').length === 6 ? '#fff' : '#475569',
          border: 'none', fontSize: '14px', fontWeight: '500',
          cursor: digits.join('').length === 6 ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          marginBottom: '16px',
        }}
      >
        {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Verify Code'}
      </button>

      {/* Resend */}
      <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', margin: 0 }}>
        {resendTimer > 0
          ? `Resend code in ${resendTimer}s`
          : (
            <button
              onClick={handleResend}
              disabled={resending}
              style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '13px', padding: 0 }}
            >
              {resending ? 'Sending...' : 'Resend code'}
            </button>
          )
        }
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthLayout>
  );
}
```

---

## FILE 7: Update `frontend/src/main.jsx`

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import OtpPage from './pages/OtpPage';
import App from './App';
import './index.css';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('auth_token');
  if (!token) return <Navigate to="/" replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/verify-otp" element={<OtpPage />} />
        <Route path="/app" element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
```

---

## FILE 8: Enable Microsoft in Firebase Console

1. Go to **Firebase Console** → Your project → **Authentication** → **Sign-in method**
2. Click **Microsoft** → Enable
3. You need a **Microsoft Azure App Registration**:
   - Go to https://portal.azure.com → Azure Active Directory → App registrations → New registration
   - Name: `DataLens AI` → Supported account types: **Any Azure AD directory + personal Microsoft accounts**
   - Redirect URI: `https://your-project.firebaseapp.com/__/auth/handler`
   - Copy **Application (client) ID** and **Client secret** → paste into Firebase Microsoft provider settings

---

## ADDITIONAL BACKEND .env VARIABLES NEEDED

```
SMTP_EMAIL=datalensai@gmail.com
SMTP_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

---

## USER FLOW SUMMARY

```
User visits /
      ↓
AuthPage — 3 login options
      ↓
Google clicked → Firebase popup → token saved → redirect /app
Microsoft clicked → Firebase popup → token saved → redirect /app
Email entered → POST /api/otp/send → Nodemailer sends OTP email
      ↓
OtpPage — 6 box OTP input
      ↓
POST /api/otp/verify → match check → session token saved → redirect /app
      ↓
App.jsx (existing dashboard) — protected route, requires token
```

---

## GENERATE ALL FILES NOW in this order:
1. `backend/routes/otp.js`
2. `frontend/src/components/AuthLayout.jsx`
3. `frontend/src/pages/AuthPage.jsx`
4. `frontend/src/pages/OtpPage.jsx`
5. `frontend/src/main.jsx` (updated)
6. Add `otpRoutes` to `backend/server.js`
7. Run `npm install nodemailer` in backend
