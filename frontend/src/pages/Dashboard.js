import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, Car, UserCheck, TrendingUp, TrendingDown, Bell, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '../utils/api';
import { format } from 'date-fns';

const DEMO_DATA = {
  stats: {
    totalPersonnel: 1247, totalVehicles: 342, totalVisitors: 89,
    todayEntries: 156, todayExits: 134, unresolvedAlerts: 3,
    personnelEntriesToday: 98, vehicleEntriesToday: 42, visitorEntriesToday: 16
  },
  chart: [
    { date: '2024-01-15', entries: 145, exits: 132 },
    { date: '2024-01-16', entries: 162, exits: 158 },
    { date: '2024-01-17', entries: 138, exits: 141 },
    { date: '2024-01-18', entries: 171, exits: 163 },
    { date: '2024-01-19', entries: 89, exits: 95 },
    { date: '2024-01-20', entries: 76, exits: 82 },
    { date: '2024-01-21', entries: 156, exits: 134 },
  ],
  recentActivity: [
    { _id: '1', logId: 'LOG001', type: 'Personnel', action: 'Entry', subjectName: 'SGT. John Mitchell', gate: 'Main Gate', createdAt: new Date().toISOString(), isAuthorized: true },
    { _id: '2', logId: 'LOG002', type: 'Vehicle', action: 'Entry', subjectName: 'Toyota Land Cruiser - MIL-4472', gate: 'Vehicle Gate', createdAt: new Date(Date.now() - 300000).toISOString(), isAuthorized: true },
    { _id: '3', logId: 'LOG003', type: 'Visitor', action: 'Entry', subjectName: 'James Thompson', gate: 'Main Gate', createdAt: new Date(Date.now() - 600000).toISOString(), isAuthorized: true },
    { _id: '4', logId: 'LOG004', type: 'Personnel', action: 'Exit', subjectName: 'CPL. Sarah Adams', gate: 'Main Gate', createdAt: new Date(Date.now() - 900000).toISOString(), isAuthorized: true },
    { _id: '5', logId: 'LOG005', type: 'Vehicle', action: 'Entry', subjectName: 'Unknown Vehicle - XYZ-1234', gate: 'Vehicle Gate', createdAt: new Date(Date.now() - 1200000).toISOString(), isAuthorized: false },
  ],
  recentAlerts: [
    { _id: '1', alertId: 'ALT001', type: 'Unauthorized Access', severity: 'High', message: 'Unknown vehicle attempted entry at Vehicle Gate', createdAt: new Date(Date.now() - 1200000).toISOString() },
    { _id: '2', alertId: 'ALT002', type: 'Expired Permit', severity: 'Medium', message: 'Visitor permit expired for James T.', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { _id: '3', alertId: 'ALT003', type: 'Suspicious Activity', severity: 'High', message: 'Multiple failed access attempts at Gate 3', createdAt: new Date(Date.now() - 7200000).toISOString() },
  ]
};

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="stat-card animate-fadeIn" style={{ borderLeft: `3px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color }}>{value?.toLocaleString()}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'Share Tech Mono, monospace' }}>{sub}</div>}
      </div>
      <div style={{ padding: '8px', borderRadius: 8, background: `${color}18` }}>
        <Icon size={20} color={color} />
      </div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontFamily: 'Share Tech Mono, monospace', fontSize: 11 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>{p.dataKey.toUpperCase()}: {p.value}</div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      api.get('/dashboard')
        .then(r => setData(r.data))
        .catch(() => setData(DEMO_DATA))
        .finally(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const d = data || DEMO_DATA;
  const { stats, chart, recentActivity, recentAlerts } = d;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time camp activity overview • {format(new Date(), 'PPP')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', animation: 'pulse-green 2s infinite' }} />
          <span style={{ fontSize: 11, color: 'var(--accent-green)', fontFamily: 'Share Tech Mono, monospace' }}>LIVE</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard icon={Users} label="Active Personnel" value={stats?.totalPersonnel} color="var(--accent-green)" />
        <StatCard icon={Car} label="Registered Vehicles" value={stats?.totalVehicles} color="var(--accent-cyan)" />
        <StatCard icon={UserCheck} label="Visitors Today" value={stats?.visitorEntriesToday} color="var(--accent-blue)" />
        <StatCard icon={ArrowUpRight} label="Today's Entries" value={stats?.todayEntries} color="var(--accent-gold)" />
        <StatCard icon={ArrowDownLeft} label="Today's Exits" value={stats?.todayExits} color="#a78bfa" />
        <StatCard icon={Bell} label="Active Alerts" value={stats?.unresolvedAlerts} color="var(--accent-red)" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Area chart */}
        <div className="card" style={{ flex: '1 1 60%' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>7-Day Activity</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Entry and exit movements</div>
          </div>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart || []}>
                <defs>
                  <linearGradient id="entryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,34,0.5)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'Share Tech Mono' }} tickFormatter={v => v.slice(5)} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'Share Tech Mono' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="entries" stroke="#22c55e" strokeWidth={2} fill="url(#entryGrad)" />
                <Area type="monotone" dataKey="exits" stroke="#06b6d4" strokeWidth={2} fill="url(#exitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today breakdown */}
        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Today's Breakdown</div>
          </div>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Personnel', value: stats?.personnelEntriesToday || 0 },
                { name: 'Vehicles', value: stats?.vehicleEntriesToday || 0 },
                { name: 'Visitors', value: stats?.visitorEntriesToday || 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,34,0.5)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'Share Tech Mono' }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'Share Tech Mono' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="var(--accent-green-dim)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {/* Recent Activity */}
        <div className="card">
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Recent Activity</div>
          <div className="table-container">
            <div style={{ minWidth: '100%' }}>
              {(recentActivity || []).map((log, i) => (
                <div key={log._id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < recentActivity.length - 1 ? '1px solid rgba(30,58,34,0.4)' : 'none' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                    background: log.action === 'Entry' ? 'rgba(34,197,94,0.15)' : 'rgba(6,182,212,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {log.action === 'Entry'
                      ? <ArrowUpRight size={14} color="var(--accent-green)" />
                      : <ArrowDownLeft size={14} color="var(--accent-cyan)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: log.isAuthorized ? 'var(--text-primary)' : 'var(--accent-red)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.subjectName}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace' }}>
                      {log.type} • {log.gate}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace', flexShrink: 0 }}>
                    {log.createdAt ? format(new Date(log.createdAt), 'HH:mm') : '--:--'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="card">
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Active Alerts</span>
            <span className="badge badge-red">{stats?.unresolvedAlerts || 0}</span>
          </div>
          {(recentAlerts || []).map((alert, i) => (
            <div key={alert._id || i} style={{ padding: '8px 10px', borderRadius: 6, marginBottom: 6, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }} className={`severity-${alert.severity}`}>{alert.severity}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace' }}>{alert.createdAt ? format(new Date(alert.createdAt), 'HH:mm') : '--:--'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{alert.message}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
