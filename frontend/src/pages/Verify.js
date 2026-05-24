import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Clock, User, Award, Home } from 'lucide-react';
import api from '../utils/api';

export default function Verify() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const statusColor = (s) => {
    if (!s) return '#64748b';
    const sl = s.toLowerCase();
    if (sl === 'active' || sl === 'approved') return '#22c55e';
    if (sl === 'denied' || sl === 'suspended' || sl === 'blacklisted') return '#ef4444';
    if (sl === 'pending') return '#f59e0b';
    return '#64748b';
  };

  useEffect(() => {
    const fetchIdentity = async () => {
      try {
        const { data } = await api.get(`/public/verify/${id}`);
        setData(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Verification Failed');
      } finally {
        setLoading(false);
      }
    };
    fetchIdentity();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Rajdhani, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <Shield size={48} className="animate-pulse" style={{ color: '#3b82f6', marginBottom: '1rem' }} />
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '0.1em' }}>VERIFYING IDENTITY...</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: '2rem', textAlign: 'center', fontFamily: 'Rajdhani, sans-serif' }}>
      <div className="card" style={{ maxWidth: 400, border: '2px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
        <XCircle size={64} color="#ef4444" style={{ margin: '0 auto 1.5rem' }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: '1rem' }}>UNAUTHORIZED</h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>{error}</p>
        <div style={{ marginTop: '2rem', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>SEC_AUTH_ERR_{new Date().getTime().toString(36).toUpperCase()}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'Rajdhani, sans-serif' }}>
      <div className="card" style={{ maxWidth: 500, width: '100%', padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)' }}>
        {/* Header */}
        <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderBottom: '2px solid var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Military Camp System</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>IDENTITY VERIFIED</div>
          </div>
          <CheckCircle size={32} color="var(--accent-green)" />
        </div>

        {/* Content */}
        <div style={{ padding: '2rem', background: 'var(--bg-primary)' }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Photo Section */}
            <div style={{ position: 'relative' }}>
              <div style={{ width: 160, height: 200, borderRadius: 12, background: 'var(--bg-secondary)', border: '3px solid var(--accent-primary)', overflow: 'hidden', boxShadow: '0 0 20px rgba(37, 99, 235, 0.1)' }}>
                {data.photo ? <img src={data.photo} alt="Identity" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><User size={64} /></div>}
              </div>
              <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)' }}>
                <span style={{ background: statusColor(data.status), color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', boxShadow: '0 4px 6px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>{data.status.toUpperCase()}</span>
              </div>
            </div>

            {/* Info Section */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Full Name</label>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{data.fullName}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}><Award size={10} /> Rank</label>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{data.rank || 'N/A'}</div>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}><Home size={10} /> Unit</label>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{data.unit}</div>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}><Shield size={10} /> Category</label>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{data.type}</div>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}><Clock size={10} /> Verification</label>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{new Date(data.verifiedAt).toLocaleTimeString()}</div>
                </div>
              </div>

              <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>SECURE IDENTIFIER</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>{data.id}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
          This is an official verification page. Unauthorized reproduction is strictly prohibited.
          <br />© 2026 MILITARY COMMAND - ALL RIGHTS RESERVED
        </div>
      </div>
    </div>
  );
}
