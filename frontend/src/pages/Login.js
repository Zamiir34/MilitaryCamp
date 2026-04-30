import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form.username, form.password);
    if (result.success) {
      toast.success('Access granted');
      navigate('/');
    } else {
      toast.error(result.message || 'Access denied');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(34,197,94,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: '20%', left: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '25%', right: '15%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: '16px',
            background: 'var(--bg-card)',
            border: '2px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: 'var(--glow-green), inset 0 1px 0 rgba(34,197,94,0.1)'
          }}>
            <Shield size={36} color="var(--accent-green)" />
          </div>
          <h1 style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 28, fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-primary)'
          }}>MILITARY CAMP</h1>
          <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.08em' }}>
            SECURITY ACCESS CONTROL SYSTEM
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 3, height: 20, background: 'var(--accent-green)', borderRadius: 2 }} />
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Authorized Personnel Only
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: 32 }}
                  type="text"
                  placeholder="Enter username"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: 32, paddingRight: 36 }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 14 }} disabled={loading}>
              {loading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6 }}>
            <p style={{ fontSize: 11, color: 'var(--accent-gold)', fontFamily: 'Share Tech Mono, monospace', textAlign: 'center' }}>
              ⚠ DEFAULT: admin / admin123 (change after first login)
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace' }}>
          UNAUTHORIZED ACCESS IS PROHIBITED AND MONITORED
        </p>
      </div>
    </div>
  );
}
