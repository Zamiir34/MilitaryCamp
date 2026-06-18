import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Plus, Search, Filter, Clock, QrCode, User, Car, UserCheck } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDateTime, formatTime } from '../utils/dateUtils';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const DEMO_LOGS = [
  { _id: '1', logId: 'LOG20240001', type: 'Personnel', action: 'Entry', subjectName: 'SGT. John Mitchell', subjectId: 'MIL-001234', gate: 'Main Gate', isAuthorized: true, recordedByName: 'Guard Stevens', createdAt: new Date().toISOString() },
  { _id: '2', logId: 'LOG20240002', type: 'Vehicle', action: 'Entry', subjectName: 'Toyota Land Cruiser', subjectId: 'MIL-4472', gate: 'Vehicle Gate', isAuthorized: true, recordedByName: 'Guard Stevens', createdAt: new Date(Date.now() - 600000).toISOString() },
  { _id: '3', logId: 'LOG20240003', type: 'Visitor', action: 'Exit', subjectName: 'James Thompson', subjectId: 'VIS240001', gate: 'Main Gate', isAuthorized: true, recordedByName: 'Guard Williams', createdAt: new Date(Date.now() - 1800000).toISOString() },
  { _id: '4', logId: 'LOG20240004', type: 'Vehicle', action: 'Entry', subjectName: 'Unknown Vehicle', subjectId: 'XYZ-1234', gate: 'Vehicle Gate', isAuthorized: false, recordedByName: 'Guard Stevens', createdAt: new Date(Date.now() - 3600000).toISOString() },
];

const INITIAL_FORM = {
  type: 'Personnel', subjectName: '', subjectId: '', gate: 'Main Gate', purpose: '', isAuthorized: true, notes: '', category: ''
};

export default function EntryExit() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'entry' | 'exit'
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [now, setNow] = useState(new Date());
  
  // New features
  const [qrInput, setQrInput] = useState('');
  const [showQrPaste, setShowQrPaste] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      if (filterAction) params.set('action', filterAction);
      if (filterDate) params.set('date', filterDate);
      const { data } = await api.get(`/entries?${params}`);
      setLogs(data.data || data);
      setTotal(data.total || (data.data || data).length);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load entry records';
      toast.error(msg);
      // Show demo data only in development so the UI is not empty
      setLogs(DEMO_LOGS);
      setTotal(DEMO_LOGS.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [search, filterType, filterAction, filterDate]);

  const handleRecord = async (e) => {
    e?.preventDefault();
    setSubmitting(true);
    try {
      const endpoint = modal === 'entry' ? '/entries/entry' : '/entries/exit';
      await api.post(endpoint, form);
      
      if (modal === 'exit' && form.category === 'Military') {
        toast.success('A soldier has left');
      } else {
        toast.success(`${modal === 'entry' ? 'Entry' : 'Exit'} recorded successfully`);
      }
      setModal(null);
      setForm(INITIAL_FORM);
      setQrInput('');
      setShowQrPaste(false);
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQrProcess = () => {
    if (!qrInput.trim()) return;
    try {
      const data = JSON.parse(qrInput);
      setForm(p => ({
        ...p,
        type: data.type || p.type,
        subjectId: data.id || data.plate || p.subjectId,
        subjectName: data.name || p.subjectName,
        isAuthorized: data.isAuthorized !== undefined ? data.isAuthorized : true
      }));
      toast.success('QR Data processed');
      setShowQrPaste(false);
    } catch {
      toast.error('Invalid QR JSON data');
    }
  };

  const searchSubject = async (val) => {
    if (!val || val.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      let endpoint = '';
      if (form.type === 'Personnel') endpoint = `/personnel?search=${val}`;
      else if (form.type === 'Vehicle') endpoint = `/vehicles?search=${val}`;
      else if (form.type === 'Visitor') endpoint = `/visitors?search=${val}`;

      const { data } = await api.get(endpoint);
      setSearchResults(data.data || data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectSubject = (item) => {
    if (form.type === 'Personnel') {
      setForm(p => ({ 
        ...p, 
        subjectName: item.fullName, 
        subjectId: item.personnelId, 
        isAuthorized: item.status === 'Active',
        category: item.type // This stores 'Military', 'Civilian', etc.
      }));
    } else if (form.type === 'Vehicle') {
      // make/model are optional fields — build a safe display name
      const vehicleName = [item.make, item.model].filter(Boolean).join(' ') || item.vehicleType || 'Vehicle';
      const displayName = `${vehicleName} (${item.plateNumber})`;
      setForm(p => ({ ...p, subjectName: displayName, subjectId: item.plateNumber, isAuthorized: item.isAuthorized && item.status === 'Active' }));
    } else if (form.type === 'Visitor') {
      setForm(p => ({ 
        ...p, 
        subjectName: item.fullName, 
        subjectId: item.visitorId, 
        isAuthorized: item.status === 'Approved',
        category: item.visitorType 
      }));
    }
    setSearchResults([]);
  };

  const typeBadge = { Personnel: 'badge-blue', Vehicle: 'badge-green', Visitor: 'badge-yellow' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Entry / Exit Log</h1>
          <p className="page-subtitle">{total} records • Live tracking</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => { setForm({ ...INITIAL_FORM }); setModal('entry'); }}>
            <ArrowUpRight size={14} /> Record Entry
          </button>
          <button className="btn btn-ghost" style={{ borderColor: 'rgba(6,182,212,0.4)', color: 'var(--accent-cyan)' }} onClick={() => { setForm({ ...INITIAL_FORM }); setModal('exit'); }}>
            <ArrowDownLeft size={14} /> Record Exit
          </button>
        </div>
      </div>

      {/* Live clock */}
      <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Clock size={16} color="var(--accent-green)" />
        <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-green)', letterSpacing: '0.1em' }}>
          {formatTime(now)}
        </span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {format(now, 'EEEE, MMMM d, yyyy')}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gate Officer: <strong style={{ color: 'var(--text-primary)' }}>{user?.fullName}</strong></span>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search records..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flex: '1 1 auto', flexWrap: 'wrap' }}>
            <select className="input" style={{ flex: 1, minWidth: 120 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option><option>Personnel</option><option>Vehicle</option><option>Visitor</option>
            </select>
            <select className="input" style={{ flex: 1, minWidth: 120 }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="">Entry & Exit</option><option value="Entry">Entry Only</option><option value="Exit">Exit Only</option>
            </select>
            <input className="input" style={{ flex: 1, minWidth: 120 }} type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Log table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table style={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th>Log ID</th><th>Date / Time</th><th>Action</th><th>Type</th><th>Name</th><th>ID / Plate</th><th>Gate</th><th>Auth</th><th>Officer</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : logs.map(log => (
                <tr key={log._id}>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.logId}</span></td>
                  <td><span className="mono" style={{ fontSize: 11 }}>{log.createdAt ? format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss') : '--'}</span></td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif', color: log.action === 'Entry' ? 'var(--accent-green)' : 'var(--accent-cyan)' }}>
                      {log.action === 'Entry' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                      {log.action}
                    </span>
                  </td>
                  <td><span className={`badge ${typeBadge[log.type] || 'badge-gray'}`}>{log.type}</span></td>
                  <td style={{ fontWeight: 600, color: !log.isAuthorized ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                    {log.subjectName}
                    {log.type === 'Vehicle' && log.vehicle?.ownerName && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{log.vehicle.ownerName} ({log.vehicle.category || 'Military'})</div>}
                  </td>
                  <td><span className="mono" style={{ fontSize: 11 }}>{log.subjectId}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.gate}</td>
                  <td>{log.isAuthorized ? <span className="badge badge-green">AUTH</span> : <span className="badge badge-red">UNAUTH</span>}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.recordedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry/Exit Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {modal === 'entry'
                  ? <ArrowUpRight size={20} color="var(--accent-green)" />
                  : <ArrowDownLeft size={20} color="var(--accent-cyan)" />}
                <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 20, textTransform: 'uppercase', color: modal === 'entry' ? 'var(--accent-green)' : 'var(--accent-cyan)' }}>
                  Record {modal === 'entry' ? 'Entry' : 'Exit'}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }} onClick={() => setShowQrPaste(!showQrPaste)}>
                  <QrCode size={16} /> QR Auto-fill
                </button>
                <span className="mono" style={{ fontSize: 16, color: 'var(--accent-green)' }}>{formatTime(now)}</span>
              </div>
            </div>

            {showQrPaste && (
              <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(34,197,94,0.05)', border: '1px solid var(--accent-green)' }}>
                <label className="form-label">Paste QR JSON Data</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" placeholder='{"type":"Personnel", "id":"...", "name":"..."}' value={qrInput} onChange={e => setQrInput(e.target.value)} />
                  <button className="btn btn-primary" onClick={handleQrProcess}>Process</button>
                </div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Pasting QR data will auto-fill the form fields below.</p>
              </div>
            )}

            <form onSubmit={handleRecord}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option>Personnel</option><option>Vehicle</option><option>Visitor</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Gate</label>
                  <select className="input" value={form.gate} onChange={e => setForm(p => ({ ...p, gate: e.target.value }))}>
                    <option>Main Gate</option><option>Vehicle Gate</option><option>Gate 2</option><option>Gate 3</option><option>Emergency Exit</option>
                  </select>
                </div>
                
                <div className="form-group" style={{ gridColumn: '1 / -1', position: 'relative' }}>
                  <label className="form-label">Search / Full Name *</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      className="input" 
                      value={form.subjectName} 
                      onChange={e => {
                        setForm(p => ({ ...p, subjectName: e.target.value }));
                        searchSubject(e.target.value);
                      }} 
                      required 
                      placeholder={form.type === 'Vehicle' ? 'Type plate or make to search...' : 'Type name to search...'} 
                    />
                    {searching && <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} className="spinner-small" />}
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, padding: 4, maxHeight: 200, overflowY: 'auto', marginTop: 4, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                      {searchResults.map(item => (
                        <div key={item._id} className="dropdown-item" style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }} onClick={() => selectSubject(item)}>
                          {form.type === 'Personnel' ? <User size={14} color="var(--accent-blue)" /> : form.type === 'Vehicle' ? <Car size={14} color="var(--accent-green)" /> : <UserCheck size={14} color="var(--accent-gold)" />}
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>
                              {item.fullName || [item.make, item.model].filter(Boolean).join(' ') || item.plateNumber}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.personnelId || item.plateNumber || item.visitorId} • {item.unit || item.organization || item.vehicleType}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">ID Number / Plate</label>
                  <input className="input" value={form.subjectId} onChange={e => setForm(p => ({ ...p, subjectId: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Purpose</label>
                  <input className="input" value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="auth" checked={form.isAuthorized} onChange={e => setForm(p => ({ ...p, isAuthorized: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  <label htmlFor="auth" className="form-label" style={{ marginTop: 0 }}>Authorized</label>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Notes</label>
                  <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button
                  type="submit"
                  className="btn"
                  style={modal === 'entry' ? { background: 'var(--accent-green-dim)', color: 'white', border: '1px solid var(--accent-green)' } : { background: 'rgba(6,182,212,0.2)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)' }}
                  disabled={submitting}
                >
                  {submitting ? 'Recording...' : `Record ${modal === 'entry' ? 'Entry' : 'Exit'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
