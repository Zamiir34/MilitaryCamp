import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, AlertTriangle, Shield, X, Zap } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../utils/socket';

const severityConfig = {
  Critical: { color: 'var(--accent-red)', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.3)', icon: '🔴' },
  High: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', icon: '🟠' },
  Medium: { color: 'var(--accent-gold)', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', icon: '🟡' },
  Low: { color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', icon: '🔵' },
  Info: { color: 'var(--accent-cyan)', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.3)', icon: 'ℹ️' },
};

const getSenderLabel = (alert) => {
  if (alert?.reportedBy?.fullName) {
    const rank = alert.reportedBy.rank ? `${alert.reportedBy.rank} ` : '';
    return `${rank}${alert.reportedBy.fullName}`.trim();
  }
  return 'System';
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
  const [newIds, setNewIds] = useState(new Set()); // tracks freshly received IDs for "NEW" badge
  const filterResolvedRef = useRef(filterResolved);
  const filterSeverityRef = useRef(filterSeverity);

  // Keep refs in sync so socket handler always sees latest filter values
  useEffect(() => { filterResolvedRef.current = filterResolved; }, [filterResolved]);
  useEffect(() => { filterSeverityRef.current = filterSeverity; }, [filterSeverity]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterResolved !== '') params.set('isResolved', filterResolved);
      if (filterSeverity) params.set('severity', filterSeverity);
      const { data } = await api.get(`/alerts?${params}`);
      setAlerts(data.data || data);
      setTotal(data.total || (data.data || data).length);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setAlerts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, [filterResolved, filterSeverity]);

  // Real-time: subscribe to new_alert socket events
  useEffect(() => {
    const socket = getSocket();
    const handler = (alert) => {
      // Only prepend if current filter would show it
      const showingActive = filterResolvedRef.current === 'false';
      const showingAll    = filterResolvedRef.current === '';
      const severityMatch = !filterSeverityRef.current || filterSeverityRef.current === alert.severity;
      if ((showingActive || showingAll) && severityMatch) {
        setAlerts(prev => [alert, ...prev]);
        setTotal(prev => prev + 1);
        setNewIds(prev => new Set([...prev, alert.alertId]));
        // Auto-clear "NEW" badge after 8 seconds
        setTimeout(() => {
          setNewIds(prev => { const s = new Set(prev); s.delete(alert.alertId); return s; });
        }, 8000);
      }
    };
    socket.on('new_alert', handler);
    return () => socket.off('new_alert', handler);
  }, []);

  const handleResolve = async (id) => {
    try {
      await api.put(`/alerts/${id}/resolve`);
      toast.success('Notification resolved');
      fetchAlerts();
    } catch {
      // Demo mode: toggle locally
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, isResolved: true } : a));
      toast.success('Notification resolved');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/alerts', form);
      toast.success('Notification created');
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
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unresolved} pending updates</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>
          <Bell size={14} /> New Notification
        </button>
      </div>

      {/* Unresolved banner */}
      {unresolved > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="var(--accent-red)" />
          <span style={{ fontSize: 13, color: 'var(--accent-red)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>
            {unresolved} ACTIVE NOTIFICATION{unresolved > 1 ? 'S' : ''} REQUIRING ATTENTION
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 160 }} value={filterResolved} onChange={e => setFilterResolved(e.target.value)}>
            <option value="false">Active</option>
            <option value="true">Resolved</option>
            <option value="">All</option>
          </select>
          <select className="input" style={{ width: 140 }} value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
            <option value="">All Severities</option>
            <option>Critical</option><option>High</option><option>Medium</option><option>Low</option><option>Info</option>
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
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No active notifications</div>
          </div>
        ) : alerts.map(alert => {
          const cfg = severityConfig[alert.severity] || severityConfig.Low;
          const isNew = newIds.has(alert.alertId);
          return (
            <div
              key={alert._id || alert.alertId}
              className="animate-fadeIn"
              style={{
                background: isNew ? `${cfg.bg}` : 'var(--bg-card)',
                border: `1px solid ${isNew ? cfg.color : alert.isResolved ? 'var(--border)' : cfg.border}`,
                borderRadius: 8,
                padding: '1rem 1.25rem',
                opacity: alert.isResolved ? 0.6 : 1,
                transition: 'all 0.4s ease',
                boxShadow: isNew ? `0 0 12px ${cfg.color}30` : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    {isNew && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        fontSize: 9, fontWeight: 800, fontFamily: 'Rajdhani, sans-serif',
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: '#fff', background: cfg.color,
                        borderRadius: 4, padding: '1px 6px',
                        animation: 'pulse-primary 1.5s infinite'
                      }}>
                        <Zap size={8} /> LIVE
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', color: cfg.color }}>{alert.severity}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace' }}>•</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>{alert.type}</span>
                    {alert.gate && <span className="badge badge-gray" style={{ fontSize: 10 }}>{alert.gate}</span>}
                    {alert.isResolved && <span className="badge badge-green">RESOLVED</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{alert.message}</div>
                  {alert.details && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{alert.details}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-gray" style={{ fontSize: 10 }}>
                      Sent by: {getSenderLabel(alert)}
                    </span>
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                    {alert.alertId} • {alert.createdAt ? format(new Date(alert.createdAt), 'yyyy-MM-dd HH:mm:ss') : 'Just now'}
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
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>New Notification</h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group"><label className="form-label">Type</label>
                   <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option>Unauthorized Access</option>
                    <option>Blacklisted Vehicle</option>
                    <option>Expired Permit</option>
                    <option>Suspicious Activity</option>
                    <option>Personnel Exit</option>
                    <option>Notification</option>
                    <option>System Alert</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group"><label className="form-label">Severity</label>
                    <select className="input" value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                      <option>Critical</option><option>High</option><option>Medium</option><option>Low</option><option>Info</option>
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
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
