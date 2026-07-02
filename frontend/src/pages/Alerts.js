import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, AlertTriangle, Shield, X, Zap } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../utils/socket';

const cardStyle = {
  color: 'var(--accent-primary)',
  bg: 'rgba(59,130,246,0.08)',
  border: 'rgba(59,130,246,0.25)',
};

const getSenderLabel = (alert) => {
  if (alert?.reportedBy?.fullName) {
    const rank = alert.reportedBy.rank ? `${alert.reportedBy.rank} ` : '';
    return `${rank}${alert.reportedBy.fullName}`.trim();
  }
  return 'System';
};

const NOTIFICATION_TYPES = [
  'Unauthorized Access',
  'Blacklisted Vehicle',
  'Expired Permit',
  'Suspicious Activity',
  'Personnel Exit',
];

export default function Alerts() {
  const { canAccess, user } = useAuth();
  const isGuard = user?.role === 'Guard';
  const canCreate = canAccess(['Administrator']) || isGuard;
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterResolved, setFilterResolved] = useState('false');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ type: 'Unauthorized Access', message: '', gate: 'Main Gate' });
  const [submitting, setSubmitting] = useState(false);
  const filterResolvedRef = useRef(filterResolved);

  useEffect(() => { filterResolvedRef.current = filterResolved; }, [filterResolved]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterResolved !== '') params.set('isResolved', filterResolved);
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

  useEffect(() => { fetchAlerts(); }, [filterResolved]);

  useEffect(() => {
    const socket = getSocket();
    const handler = (alert) => {
      if (['System Alert', 'Notification'].includes(alert.type)) return;
      const showingActive = filterResolvedRef.current === 'false';
      const showingAll = filterResolvedRef.current === '';
      if (showingActive || showingAll) {
        setAlerts(prev => [alert, ...prev]);
        setTotal(prev => prev + 1);
      }
    };
    const handleResolved = () => {
      fetchAlerts();
    };
    socket.on('new_alert', handler);
    socket.on('alert_resolved', handleResolved);
    return () => {
      socket.off('new_alert', handler);
      socket.off('alert_resolved', handleResolved);
    };
  }, []);

  const handleResolve = async (id) => {
    try {
      await api.put(`/alerts/${id}/resolve`);
      toast.success('Notification resolved');
      fetchAlerts();
    } catch {
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, isResolved: true } : a));
      toast.success('Notification resolved');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      delete payload.zone;
      if (isGuard) delete payload.gate;
      await api.post('/alerts', payload);
      toast.success('Notification created');
      setModal(null);
      fetchAlerts();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed';
      toast.error(msg);
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
        {canCreate && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => setModal('create')}>
              <Bell size={14} /> New Notification
            </button>
          </div>
        )}
      </div>

      {unresolved > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="var(--accent-red)" />
          <span style={{ fontSize: 13, color: 'var(--accent-red)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>
            {unresolved} ACTIVE NOTIFICATION{unresolved > 1 ? 'S' : ''} REQUIRING ATTENTION
          </span>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <select className="input filter-select" style={{ maxWidth: 240 }} value={filterResolved} onChange={e => setFilterResolved(e.target.value)}>
          <option value="false">Active</option>
          <option value="true">Resolved</option>
          <option value="">All</option>
        </select>
      </div>

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
          const isNew = !alert.isResolved;
          return (
            <div
              key={alert._id || alert.alertId}
              className="animate-fadeIn"
              style={{
                background: isNew ? cardStyle.bg : 'var(--bg-card)',
                border: `1px solid ${isNew ? cardStyle.color : alert.isResolved ? 'var(--border)' : cardStyle.border}`,
                borderRadius: 8,
                padding: '1rem 1.25rem',
                opacity: alert.isResolved ? 0.6 : 1,
                transition: 'all 0.4s ease',
                boxShadow: isNew ? `0 0 12px ${cardStyle.color}30` : 'none'
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
                        color: '#fff', background: cardStyle.color,
                        borderRadius: 4, padding: '1px 6px',
                        animation: 'pulse-primary 1.5s infinite'
                      }}>
                        <Zap size={8} /> LIVE
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>{alert.type}</span>
                    {alert.zone && <span className="badge badge-blue" style={{ fontSize: 10 }}>Zone: {alert.zone}</span>}
                    {alert.gate && alert.gate !== alert.zone && <span className="badge badge-gray" style={{ fontSize: 10 }}>{alert.gate}</span>}
                    {alert.isResolved && <span className="badge badge-green">RESOLVED</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{alert.message}</div>
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
                    {NOTIFICATION_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {!isGuard && (
                <div className="form-group"><label className="form-label">Gate</label>
                  <select className="input" value={form.gate} onChange={e => setForm(p => ({ ...p, gate: e.target.value }))}>
                    <option>Main Gate</option><option>Vehicle Gate</option><option>Gate 2</option><option>Gate 3</option>
                  </select>
                </div>
                )}
                <div className="form-group"><label className="form-label">Message *</label><input className="input" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Sending...' : 'Send'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
