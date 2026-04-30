import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, FileDown, Calendar, BarChart3, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DEMO_REPORT = {
  summary: { total: 247, entries: 156, exits: 134, personnel: 98, vehicles: 42, visitors: 16, unauthorized: 3 },
  logs: [
    { logId: 'LOG001', type: 'Personnel', action: 'Entry', subjectName: 'SGT. John Mitchell', gate: 'Main Gate', createdAt: new Date().toISOString(), isAuthorized: true },
    { logId: 'LOG002', type: 'Vehicle', action: 'Entry', subjectName: 'MIL-4472', gate: 'Vehicle Gate', createdAt: new Date(Date.now() - 600000).toISOString(), isAuthorized: true },
  ]
};

const COLORS = ['#22c55e', '#06b6d4', '#f59e0b'];

export default function Reports() {
  const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportRange, setExportRange] = useState({ start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reports/daily?date=${reportDate}`);
      setReport(data);
    } catch {
      setReport({ ...DEMO_REPORT, date: reportDate });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [reportDate]);

  const handleExportExcel = async () => {
    try {
      const response = await api.get(`/reports/export/excel?startDate=${exportRange.start}&endDate=${exportRange.end}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `camp-report-${exportRange.start}.xlsx`;
      a.click();
      toast.success('Excel report downloaded');
    } catch {
      toast.error('Export failed - connect to backend');
    }
  };

  const s = report?.summary;
  const pieData = s ? [
    { name: 'Personnel', value: s.personnel },
    { name: 'Vehicles', value: s.vehicles },
    { name: 'Visitors', value: s.visitors },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Daily activity reports and data export</p>
        </div>
      </div>

      {/* Date picker & controls */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto' }}>
            <Calendar size={14} color="var(--text-muted)" />
            <input className="input" type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} style={{ width: '100%', maxWidth: 160 }} />
          </div>
          <button className="btn btn-ghost" onClick={fetchReport} disabled={loading} style={{ flex: '0 0 auto' }}>
            <RefreshCw size={14} /> {loading ? 'Loading...' : 'Refresh'}
          </button>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', width: '100%', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }} className="mobile-only"></div>
          <div style={{ flex: '1 1 100%', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Export range:</span>
            <input className="input" type="date" value={exportRange.start} onChange={e => setExportRange(p => ({ ...p, start: e.target.value }))} style={{ width: 140, flex: '1 1 auto' }} />
            <span style={{ color: 'var(--text-muted)' }}>—</span>
            <input className="input" type="date" value={exportRange.end} onChange={e => setExportRange(p => ({ ...p, end: e.target.value }))} style={{ width: 140, flex: '1 1 auto' }} />
            <button className="btn btn-gold" onClick={handleExportExcel} style={{ width: '100%' }}>
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          </div>
        </div>
      </div>

      {report && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Records', value: s?.total, color: 'var(--text-primary)' },
              { label: 'Entries', value: s?.entries, color: 'var(--accent-green)' },
              { label: 'Exits', value: s?.exits, color: 'var(--accent-cyan)' },
              { label: 'Personnel', value: s?.personnel, color: 'var(--accent-blue)' },
              { label: 'Vehicles', value: s?.vehicles, color: 'var(--accent-gold)' },
              { label: 'Visitors', value: s?.visitors, color: '#a78bfa' },
              { label: 'Unauthorized', value: s?.unauthorized, color: 'var(--accent-red)' },
            ].map(item => (
              <div key={item.label} className="stat-card" style={{ borderLeft: `3px solid ${item.color}`, padding: '1rem' }}>
                <div className="stat-label">{item.label}</div>
                <div className="stat-value" style={{ color: item.color, fontSize: 24 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', marginBottom: '1rem' }}>Activity by Hour</div>
              <div style={{ height: 200, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Array.from({ length: 12 }, (_, i) => ({ hour: `${i * 2}:00`, count: Math.floor(Math.random() * 30) + 2 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,34,0.5)" />
                    <XAxis dataKey="hour" stroke="var(--text-muted)" tick={{ fontSize: 9, fontFamily: 'Share Tech Mono' }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9, fontFamily: 'Share Tech Mono' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'Share Tech Mono', fontSize: 11 }} />
                    <Bar dataKey="count" fill="var(--accent-green-dim)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', marginBottom: '1rem' }}>Entry Types</div>
              <div style={{ height: 200, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'Share Tech Mono', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Log table */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>
              Daily Activity Log — {format(new Date(reportDate), 'PPP')}
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Log ID</th><th>Time</th><th>Type</th><th>Action</th><th>Name</th><th>Gate</th><th>Authorized</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.logs || []).slice(0, 50).map((log, i) => (
                    <tr key={i}>
                      <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.logId}</span></td>
                      <td><span className="mono" style={{ fontSize: 11 }}>{format(new Date(log.createdAt), 'HH:mm:ss')}</span></td>
                      <td><span className={`badge ${{ Personnel: 'badge-blue', Vehicle: 'badge-green', Visitor: 'badge-yellow' }[log.type] || 'badge-gray'}`}>{log.type}</span></td>
                      <td style={{ color: log.action === 'Entry' ? 'var(--accent-green)' : 'var(--accent-cyan)', fontWeight: 700, fontSize: 12, fontFamily: 'Rajdhani' }}>{log.action}</td>
                      <td>{log.subjectName}</td>
                      <td>{log.gate}</td>
                      <td>{log.isAuthorized ? <span className="badge badge-green">YES</span> : <span className="badge badge-red">NO</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
