import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, ArrowLeftRight, Users, Car, UserCheck, Bell } from 'lucide-react';
import api from '../utils/api';
import { format } from 'date-fns';

export default function MyWork() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get('/dashboard/my-activity');
        setData(data);
      } catch (err) {
        console.error('Failed to fetch activity:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading your work for today...</div>;

  const { summary, details } = data || { summary: {}, details: { logs: [], personnel: [], vehicles: [], visitors: [], resolvedAlerts: [] } };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Work Today</h1>
          <p className="page-subtitle">Personal activity summary for {format(new Date(), 'MMMM dd, yyyy')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
           <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0, background: 'rgba(34,197,94,0.05)' }}>
              <CheckCircle size={16} color="var(--accent-green)" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{summary.logsCount + summary.personnelCount + summary.vehiclesCount + summary.visitorsCount + summary.resolvedAlertsCount} Total Actions</span>
           </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-label">Logs Recorded</div>
              <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{summary.logsCount}</div>
            </div>
            <div style={{ padding: '8px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', color: 'var(--accent-green)' }}><ArrowLeftRight size={20} /></div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-label">Personnel</div>
              <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{summary.personnelCount}</div>
            </div>
            <div style={{ padding: '8px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)' }}><Users size={20} /></div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-label">Vehicles</div>
              <div className="stat-value" style={{ color: 'var(--accent-gold)' }}>{summary.vehiclesCount}</div>
            </div>
            <div style={{ padding: '8px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', color: 'var(--accent-gold)' }}><Car size={20} /></div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-label">Visitors</div>
              <div className="stat-value" style={{ color: '#a855f7' }}>{summary.visitorsCount}</div>
            </div>
            <div style={{ padding: '8px', borderRadius: 8, background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}><UserCheck size={20} /></div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 18, marginBottom: '1rem', textTransform: 'uppercase' }}>Recent Activity</h2>
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Time</th><th>Type</th><th>Action / Name</th><th>Details</th>
                </tr>
              </thead>
              <tbody>
                {details.logs.length === 0 && details.personnel.length === 0 && details.vehicles.length === 0 && details.visitors.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No work recorded today yet.</td></tr>
                ) : (
                  <>
                    {details.logs.map(log => (
                      <tr key={log._id}>
                        <td><span className="mono" style={{ fontSize: 12 }}>{format(new Date(log.createdAt), 'HH:mm')}</span></td>
                        <td><span className={`badge ${log.action === 'Entry' ? 'badge-green' : 'badge-blue'}`}>{log.type} Log</span></td>
                        <td><span style={{ fontWeight: 600 }}>{log.action}: {log.subjectName}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.gate} • {log.purpose || 'No notes'}</td>
                      </tr>
                    ))}
                    {details.personnel.map(p => (
                      <tr key={p._id}>
                        <td><span className="mono" style={{ fontSize: 12 }}>{format(new Date(p.createdAt), 'HH:mm')}</span></td>
                        <td><span className="badge badge-blue">New Personnel</span></td>
                        <td><span style={{ fontWeight: 600 }}>{p.fullName}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.rank} • {p.unit}</td>
                      </tr>
                    ))}
                    {details.vehicles.map(v => (
                      <tr key={v._id}>
                        <td><span className="mono" style={{ fontSize: 12 }}>{format(new Date(v.createdAt), 'HH:mm')}</span></td>
                        <td><span className="badge badge-yellow">New Vehicle</span></td>
                        <td><span style={{ fontWeight: 600 }}>{v.plateNumber}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.model} • {v.ownerName}</td>
                      </tr>
                    ))}
                    {details.visitors.map(v => (
                      <tr key={v._id}>
                        <td><span className="mono" style={{ fontSize: 12 }}>{format(new Date(v.createdAt), 'HH:mm')}</span></td>
                        <td><span className="badge badge-purple">New Visitor</span></td>
                        <td><span style={{ fontWeight: 600 }}>{v.fullName}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>Purpose: {v.purposeOfVisit}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
