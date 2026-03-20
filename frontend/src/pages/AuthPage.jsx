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
