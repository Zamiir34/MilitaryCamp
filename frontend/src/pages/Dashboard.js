import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, Car, UserCheck, TrendingUp, TrendingDown, Bell, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '../utils/api';
import { format } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="stat-card animate-fadeIn" style={{ borderLeft: `3px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color }}>{value?.toLocaleString()}</div>
        {sub && <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'Share Tech Mono, monospace', fontWeight: 600 }}>{sub}</div>}
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
  const [data, setData] = useState({
    stats: { totalPersonnel: 0, totalVehicles: 0, totalVisitors: 0, todayEntries: 0, todayExits: 0, unresolvedAlerts: 0, personnelEntriesToday: 0, vehicleEntriesToday: 0, visitorEntriesToday: 0 },
    chart: [],
    recentActivity: [],
    myRecentActivity: [],
    recentAlerts: [],
    allGuards: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      api.get('/dashboard')
        .then(r => setData(r.data))
        .catch(err => {
          console.error('Dashboard data fetch failed:', err);
          // Don't set demo data, keep initial empty state
        })
        .finally(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const { stats, chart, recentActivity, myRecentActivity, recentAlerts, allGuards } = data;

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
        <StatCard icon={ArrowDownLeft} label="Today's Exits" value={stats?.todayExits} color="var(--accent-purple)" />
        <StatCard icon={Bell} label="Active Alerts" value={stats?.unresolvedAlerts} color="var(--accent-red)" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Area chart */}
        <div className="card" style={{ flex: '1 1 60%' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 18, letterSpacing: '0.05em', textTransform: 'uppercase' }}>7-Day Activity</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>Entry and exit movements</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chart || []}>
              <defs>
                <linearGradient id="entryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="exitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 12, fontFamily: 'Share Tech Mono', fontWeight: 600 }} tickFormatter={v => v.slice(5)} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12, fontFamily: 'Share Tech Mono', fontWeight: 600 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="entries" stroke="#3b82f6" strokeWidth={2} fill="url(#entryGrad)" />
              <Area type="monotone" dataKey="exits" stroke="#059669" strokeWidth={2} fill="url(#exitGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Today breakdown */}
        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Today's Breakdown</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { name: 'Personnel', value: stats?.personnelEntriesToday || 0 },
              { name: 'Vehicles', value: stats?.vehicleEntriesToday || 0 },
              { name: 'Visitors', value: stats?.visitorEntriesToday || 0 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'Share Tech Mono' }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'Share Tech Mono' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {/* My Recent Activity */}
        <div className="card">
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>My Recent Activity</span>
            <span style={{ fontSize: 11, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => window.location.href='/my-work'}>VIEW ALL</span>
          </div>
          <div className="table-container">
            <div style={{ minWidth: '100%' }}>
              {myRecentActivity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: 12 }}>No actions recorded today</div>
              ) : myRecentActivity.map((log, i) => (
                <div key={log._id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < myRecentActivity.length - 1 ? '1px solid rgba(30,58,34,0.4)' : 'none' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 4, flexShrink: 0,
                    background: log.action === 'Entry' ? 'rgba(34,197,94,0.1)' : 'rgba(6,182,212,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {log.action === 'Entry'
                      ? <ArrowUpRight size={12} color="var(--accent-green)" />
                      : <ArrowDownLeft size={12} color="var(--accent-cyan)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.action}: {log.subjectName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {log.type} • {log.gate}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace' }}>
                    {log.createdAt ? format(new Date(log.createdAt), 'HH:mm') : '--:--'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

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
                    <div style={{ fontSize: 16, fontWeight: 700, color: log.isAuthorized ? 'var(--text-primary)' : 'var(--accent-red)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.subjectName}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace', fontWeight: 600 }}>
                      {log.type} • {log.gate}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace', flexShrink: 0, fontWeight: 600 }}>
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
            <span>Active Notifications</span>
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

        {/* Guards Status */}
        <div className="card">
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Guard Status</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="badge badge-green">{(allGuards || []).filter(g => g.isOnDuty).length} ON</span>
              <span className="badge badge-gray">{(allGuards || []).filter(g => !g.isOnDuty).length} OFF</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
            {(allGuards || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: 12 }}>No guards registered</div>
            ) : allGuards.map((guard, i) => (
              <div key={guard._id || i} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 10, 
                padding: '8px 12px', 
                background: guard.isOnDuty ? 'rgba(34,197,94,0.05)' : 'var(--bg-secondary)', 
                border: `1px solid ${guard.isOnDuty ? 'rgba(34,197,94,0.15)' : 'var(--border)'}`, 
                borderRadius: 8,
                opacity: guard.isOnDuty ? 1 : 0.7
              }}>
                <div style={{ 
                  width: 32, height: 32, borderRadius: '50%', 
                  background: 'var(--bg-primary)', 
                  border: `1px solid ${guard.isOnDuty ? 'var(--accent-green)' : 'var(--border)'}`, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: 10, fontWeight: 700, 
                  color: guard.isOnDuty ? 'var(--accent-green)' : 'var(--text-muted)' 
                }}>
                  {guard.fullName?.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: guard.isOnDuty ? 'var(--text-primary)' : 'var(--text-muted)' }}>{guard.fullName}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Share Tech Mono, monospace' }}>{guard.rank} • {guard.badgeNumber || 'N/A'}</div>
                </div>
                <div style={{ 
                  width: 8, height: 8, borderRadius: '50%', 
                  background: guard.isOnDuty ? 'var(--accent-green)' : 'var(--border)', 
                  boxShadow: guard.isOnDuty ? '0 0 8px var(--accent-green)' : 'none' 
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
