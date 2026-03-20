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
        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: 0, margin: '0 0 20px 0' }}
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
