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
