import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Printer, Calendar, BarChart3, RefreshCw, ShieldAlert, CheckCircle, XCircle, Info, Filter } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444'];

export default function Reports() {
  const { user } = useAuth();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  // Advanced Filter states
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [type, setType] = useState('');
  const [gate, setGate] = useState('');
  const [action, setAction] = useState('');
  const [isAuthorized, setIsAuthorized] = useState('');
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        type,
        gate,
        action,
        isAuthorized
      }).toString();
      
      const { data } = await api.get(`/reports/range?${params}`);
      setReport(data);
    } catch (err) {
      console.error('Failed to fetch reports range:', err);
      toast.error('Failed to compile report data');
      setReport({
        summary: { total: 0, entries: 0, exits: 0, personnel: 0, vehicles: 0, visitors: 0, unauthorized: 0 },
        logs: [],
        trendData: [],
        gateData: [],
        isSingleDay: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []); // Fetch on mount

  const handleResetFilters = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
    setType('');
    setGate('');
    setAction('');
    setIsAuthorized('');
    toast.success('Filters reset to default');
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        type,
        gate,
        action,
        isAuthorized
      }).toString();
      
      const response = await api.get(`/reports/export/excel?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `camp-security-report-${startDate}_to_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Spreadsheet downloaded');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed - check server connection');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-fadeIn">
      {/* Stylesheet specifically for printing a formal military report */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: serif !important;
            font-size: 12px !important;
          }
          .sidebar, .top-bar, .page-header, .no-print, .btn, .filter-card {
            display: none !important;
          }
          .content-area {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin-bottom: 2rem !important;
            page-break-inside: avoid !important;
          }
          .print-only {
            display: block !important;
          }
          .print-report-header {
            display: flex !important;
            align-items: center;
            gap: 1.25rem;
            text-align: left;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 3px double #000;
          }
          .print-report-logo {
            width: 90px;
            height: 90px;
            object-fit: contain;
            flex-shrink: 0;
          }
          .print-report-title-block {
            flex: 1;
            text-align: center;
          }
          .print-report-meta {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.5rem;
            font-size: 11px;
            margin-top: 12px;
            padding: 0 0.5rem;
          }
          .stat-card {
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
            padding: 8px !important;
            margin: 2px !important;
          }
          .stat-value {
            font-size: 20px !important;
            color: #000 !important;
          }
          .stat-label {
            font-size: 9px !important;
            color: #555 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          th, td {
            border: 1px solid #ddd !important;
            padding: 6px 8px !important;
            font-size: 10px !important;
          }
          th {
            background-color: #f2f2f2 !important;
            color: #000 !important;
          }
          .badge {
            background: none !important;
            color: #000 !important;
            border: none !important;
            padding: 0 !important;
            font-size: 10px !important;
            font-family: inherit !important;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      {/* Formal Header Block for Print Only */}
      <div className="print-only print-report-header">
        <img
          src="/assets/army-logo.png"
          alt="Army emblem"
          className="print-report-logo"
        />
        <div className="print-report-title-block">
          <h1 style={{ fontSize: 24, fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Camp Security Access Control System</h1>
          <h2 style={{ fontSize: 16, textTransform: 'uppercase', margin: '5px 0 0' }}>Access Movement Security Audit Report</h2>
        </div>
        <div style={{ width: '90px', flexShrink: 0 }} aria-hidden="true" />
      </div>
      <div className="print-only" style={{ marginBottom: '1.5rem' }}>
        <div className="print-report-meta">
          <div><strong>REPORT PERIOD:</strong> {startDate} to {endDate}</div>
          <div><strong>GENERATED BY:</strong> {user?.fullName} ({user?.role})</div>
          <div><strong>PRINT DATE:</strong> {new Date().toLocaleString()}</div>
        </div>
        {(gate || type || action || isAuthorized) && (
          <div style={{ fontSize: 10, textAlign: 'left', marginTop: 10, padding: '5px 1rem', background: '#f5f5f5', border: '1px solid #ddd' }}>
            <strong>FILTERS APPLIED:</strong>{' '}
            {gate && `Gate [${gate}] `}
            {type && `Type [${type}] `}
            {action && `Action [${action}] `}
            {isAuthorized && `Authorized [${isAuthorized === 'true' ? 'YES ONLY' : 'NO ONLY'}]`}
          </div>
        )}
      </div>

      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Reports Panel</h1>
          <p className="page-subtitle">Compile range queries, security movement analysis, and printable audits</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="card filter-card no-print" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
          <Filter size={16} color="var(--accent-primary)" />
          <span style={{ fontFamily: 'Rajdhani', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audit Query Filters</span>
        </div>

        <div className="form-grid reports-filter-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Record Type</label>
            <select className="input" value={type} onChange={e => setType(e.target.value)}>
              <option value="">-- All Types --</option>
              <option value="Personnel">Personnel</option>
              <option value="Vehicle">Vehicle</option>
              <option value="Visitor">Visitor</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Active Gate</label>
            <select className="input" value={gate} onChange={e => setGate(e.target.value)}>
              <option value="">-- All Gates --</option>
              <option value="Main Gate">Main Gate</option>
              <option value="North Post">North Post</option>
              <option value="South Post">South Post</option>
              <option value="VIP Entrance">VIP Entrance</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Action</label>
            <select className="input" value={action} onChange={e => setAction(e.target.value)}>
              <option value="">-- All Actions --</option>
              <option value="Entry">Entry</option>
              <option value="Exit">Exit</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Authorization</label>
            <select className="input" value={isAuthorized} onChange={e => setIsAuthorized(e.target.value)}>
              <option value="">-- All Statuses --</option>
              <option value="true">Authorized Access</option>
              <option value="false">Unauthorized Attempt</option>
            </select>
          </div>
        </div>

        <div className="reports-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="reports-actions">
            <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
              Generate Report
            </button>
            <button className="btn btn-ghost" onClick={handleResetFilters}>
              Reset
            </button>
          </div>
          <div className="reports-actions">
            <button className="btn btn-ghost" onClick={handlePrint} disabled={!report || report.logs.length === 0}>
              <Printer size={14} /> Print Audit / PDF
            </button>
            <button className="btn btn-gold" onClick={handleExportExcel} disabled={!report || report.logs.length === 0}>
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          </div>
        </div>
      </div>

      {report && (
        <>
          {/* Charts Row */}
          {report.logs.length > 0 && (
            <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Trend Chart */}
              <div className="card">
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', marginBottom: '1rem' }}>
                  {report.isSingleDay ? 'Hourly Movement Peak' : 'Daily Movement Trend'}
                </div>
                <div style={{ height: 220, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={report.trendData || []}>
                      <defs>
                        <linearGradient id="colorEnt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorEx" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fontSize: 9, fontFamily: 'Share Tech Mono' }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9, fontFamily: 'Share Tech Mono' }} />
                      <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'Share Tech Mono', fontSize: 11 }} />
                      <Area type="monotone" dataKey="entries" stroke="var(--accent-green)" strokeWidth={2} fillOpacity={1} fill="url(#colorEnt)" />
                      <Area type="monotone" dataKey="exits" stroke="var(--accent-cyan)" strokeWidth={2} fillOpacity={1} fill="url(#colorEx)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Type and Gate Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {/* Gate Chart */}
                {report.gateData.length > 0 ? (
                  <div className="card">
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', marginBottom: '1rem' }}>
                      Traffic by Post / Gate
                    </div>
                    <div style={{ height: 180, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={report.gateData || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 9, fontFamily: 'Share Tech Mono' }} />
                          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9, fontFamily: 'Share Tech Mono' }} />
                          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6 }} />
                          <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]}>
                            {report.gateData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No gate traffic breakdown available.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logs table */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ 
              padding: '1rem', 
              borderBottom: '1px solid var(--border)', 
              fontFamily: 'Rajdhani, sans-serif', 
              fontWeight: 800, 
              fontSize: 14, 
              textTransform: 'uppercase',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Access Movement Ledger ({report.logs.length} records found)</span>
              <span className="mono no-print" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'none' }}>
                Showing query range: {startDate} to {endDate}
              </span>
            </div>

            <div className="table-container">
              <table className="table-wide">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Date / Time</th>
                    <th>Type</th>
                    <th>Action</th>
                    <th>Name / Subject</th>
                    <th>Vehicle Name</th>
                    <th>Owner Name</th>
                    <th>Plate Number</th>
                    <th>Record ID</th>
                    <th>Driver</th>
                    <th>Gate Post</th>
                    <th>Authorized</th>
                    <th className="no-print">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {report.logs.length === 0 ? (
                    <tr>
                      <td colSpan={13} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: 13 }}>
                        No records match the selected filter query criteria.
                      </td>
                    </tr>
                  ) : (
                    report.logs.map((log, i) => (
                      <tr key={log._id || i}>
                        <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.logId}</span></td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm')}
                        </td>
                        <td>
                          <span className={`badge ${{ Personnel: 'badge-blue', Vehicle: 'badge-green', Visitor: 'badge-purple' }[log.type] || 'badge-gray'}`}>
                            {log.type}
                          </span>
                        </td>
                        <td style={{ 
                          color: log.action === 'Entry' ? 'var(--accent-green)' : 'var(--accent-cyan)', 
                          fontWeight: 800, 
                          fontFamily: 'Rajdhani', 
                          fontSize: 13 
                        }}>
                          {log.action}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {log.subjectName}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {log.vehicleName && log.vehicleName !== '--' ? log.vehicleName : '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {log.ownerName && log.ownerName !== '--' ? log.ownerName : '—'}
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {log.plateNumber && log.plateNumber !== '--' ? log.plateNumber : '—'}
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {log.recordId && log.recordId !== '--' ? log.recordId : '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {log.driverName && log.driverName !== '--' ? log.driverName : '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>{log.gate}</td>
                        <td>
                          {log.isAuthorized ? (
                            <span className="badge badge-green" style={{ fontSize: 10, padding: '2px 8px' }}>YES</span>
                          ) : (
                            <span className="badge badge-red" style={{ fontSize: 10, padding: '2px 8px' }}>NO</span>
                          )}
                        </td>
                        <td className="no-print" style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.purpose || log.notes || '--'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
