import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, Shield, X } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const DEMO = [
  { _id: '1', alertId: 'ALT001', type: 'Unauthorized Access', severity: 'Critical', message: 'Unknown individual bypassed Gate 2 sensor', details: 'Security camera captured unidentified individual at 03:45. No valid ID presented.', gate: 'Gate 2', isResolved: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { _id: '2', alertId: 'ALT002', type: 'Blacklisted Vehicle', severity: 'High', message: 'Blacklisted vehicle plate XYZ-1234 detected at Vehicle Gate', details: 'Vehicle attempted entry at 09:15. Plate matches blacklist database.', gate: 'Vehicle Gate', isResolved: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { _id: '3', alertId: 'ALT003', type: 'Expired Permit', severity: 'Medium', message: 'Visitor permit expired: James Thompson (VIS240001)', details: 'Visitor permit expired 2 hours ago. Visitor still present in camp.', gate: 'Main Gate', isResolved: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { _id: '4', alertId: 'ALT004', type: 'System Alert', severity: 'Low', message: 'Gate 3 sensor offline - maintenance required', details: 'Gate 3 proximity sensor not responding. Physical inspection required.', gate: 'Gate 3', isResolved: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
];

const severityConfig = {
  Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: '🔴' },
  High: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', icon: '🟠' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: '🟡' },
  Low: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', icon: '🔵' },
};

export default function Alerts() {
  const { canAccess } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterResolved, setFilterResolved] = useState('false');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ type: 'Unauthorized Access', severity: 'Medium', message: '', details: '', gate: 'Main Gate' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterResolved !== '') params.set('isResolved', filterResolved);
      if (filterSeverity) params.set('severity', filterSeverity);
      const { data } = await api.get(`/alerts?${params}`);
      setAlerts(data.data || data);
      setTotal(data.total || (data.data || data).length);
    } catch {
      setAlerts(DEMO.filter(a => filterResolved === '' || String(a.isResolved) === filterResolved));
      setTotal(DEMO.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, [filterResolved, filterSeverity]);

  const handleResolve = async (id) => {
    try {
      await api.put(`/alerts/${id}/resolve`);
      toast.success('Alert resolved');
      fetchAlerts();
    } catch {
      // Demo mode: toggle locally
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, isResolved: true } : a));
      toast.success('Alert resolved');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/alerts', form);
      toast.success('Alert created');
      setModal(null);
      fetchAlerts();
    } catch {
      toast.error('Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const unresolved = alerts.filter(a => !a.isResolved).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Alerts</h1>
          <p className="page-subtitle">{unresolved} unresolved alerts</p>
        </div>
        <button className="btn btn-danger" onClick={() => setModal('create')}>
          <Bell size={14} /> Create Alert
        </button>
      </div>

      {/* Unresolved banner */}
      {unresolved > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="var(--accent-red)" />
          <span style={{ fontSize: 13, color: 'var(--accent-red)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>
            {unresolved} ACTIVE ALERT{unresolved > 1 ? 'S' : ''} REQUIRING ATTENTION
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 160 }} value={filterResolved} onChange={e => setFilterResolved(e.target.value)}>
            <option value="false">Active Alerts</option>
            <option value="true">Resolved Alerts</option>
            <option value="">All Alerts</option>
          </select>
          <select className="input" style={{ width: 140 }} value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
            <option value="">All Severities</option>
            <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
        </div>
      </div>

      {/* Alerts list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <Shield size={32} color="var(--accent-green)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ color: 'var(--accent-green)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700 }}>All Clear</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No active alerts</div>
          </div>
        ) : alerts.map(alert => {
          const cfg = severityConfig[alert.severity] || severityConfig.Low;
          return (
            <div key={alert._id} className="animate-fadeIn" style={{
              background: 'var(--bg-card)',
              border: `1px solid ${alert.isResolved ? 'var(--border)' : cfg.border}`,
              borderRadius: 8,
              padding: '1rem 1.25rem',
              opacity: alert.isResolved ? 0.6 : 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', color: cfg.color }}>{alert.severity}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace' }}>•</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>{alert.type}</span>
                    {alert.gate && <span className="badge badge-gray" style={{ fontSize: 10 }}>{alert.gate}</span>}
                    {alert.isResolved && <span className="badge badge-green">RESOLVED</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{alert.message}</div>
                  {alert.details && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{alert.details}</div>}
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                    {alert.alertId} • {format(new Date(alert.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                  </div>
                </div>
                {!alert.isResolved && canAccess(['Administrator', 'SecurityOfficer']) && (
                  <button className="btn btn-ghost" style={{ flexShrink: 0, borderColor: 'rgba(34,197,94,0.3)', color: 'var(--accent-green)', fontSize: 12 }} onClick={() => handleResolve(alert._id)}>
                    <CheckCircle size={14} /> Resolve
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Alert Modal */}
      {modal === 'create' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>Create Alert</h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group"><label className="form-label">Alert Type</label>
                  <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option>Unauthorized Access</option><option>Blacklisted Vehicle</option><option>Expired Permit</option><option>Suspicious Activity</option><option>System Alert</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group"><label className="form-label">Severity</label>
                    <select className="input" value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                      <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Gate</label>
                    <select className="input" value={form.gate} onChange={e => setForm(p => ({ ...p, gate: e.target.value }))}>
                      <option>Main Gate</option><option>Vehicle Gate</option><option>Gate 2</option><option>Gate 3</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Message *</label><input className="input" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Details</label><textarea className="input" rows={3} value={form.details} onChange={e => setForm(p => ({ ...p, details: e.target.value }))} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={submitting}>{submitting ? 'Creating...' : 'Create Alert'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
