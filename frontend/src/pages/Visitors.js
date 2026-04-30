import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DEMO = [
  { _id: '1', visitorId: 'VIS240001', fullName: 'James Thompson', idNumber: 'ID-441291', phone: '+1-555-2001', organization: 'Ministry of Defence', purposeOfVisit: 'Official Inspection', hostName: 'COL. Williams', visitDate: new Date().toISOString(), status: 'Approved', createdAt: new Date().toISOString() },
  { _id: '2', visitorId: 'VIS240002', fullName: 'Maria Santos', idNumber: 'ID-338812', phone: '+1-555-2002', organization: 'Red Cross', purposeOfVisit: 'Medical Support', hostName: 'Medical Officer', visitDate: new Date().toISOString(), status: 'Pending', createdAt: new Date().toISOString() },
  { _id: '3', visitorId: 'VIS240003', fullName: 'David Wilson', idNumber: 'ID-229931', phone: '+1-555-2003', organization: 'Contractor', purposeOfVisit: 'Equipment Maintenance', hostName: 'Logistics', visitDate: new Date().toISOString(), status: 'Completed', createdAt: new Date().toISOString() },
];

const INITIAL_FORM = { fullName: '', idNumber: '', phone: '', email: '', organization: '', purposeOfVisit: '', hostName: '', visitDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"), expectedDuration: '', vehiclePlate: '', status: 'Pending', notes: '' };

export default function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      const { data } = await api.get(`/visitors?${params}`);
      setVisitors(data.data || data);
      setTotal(data.total || (data.data || data).length);
    } catch {
      setVisitors(DEMO);
      setTotal(DEMO.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVisitors(); }, [search, filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modal === 'add') {
        await api.post('/visitors', form);
        toast.success('Visitor registered');
      } else {
        await api.put(`/visitors/${selected._id}`, form);
        toast.success('Visitor updated');
      }
      setModal(null);
      fetchVisitors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this visitor record?')) return;
    try {
      await api.delete(`/visitors/${id}`);
      toast.success('Deleted');
      fetchVisitors();
    } catch { toast.error('Failed'); }
  };

  const statusBadge = { Pending: 'badge-yellow', Approved: 'badge-green', Denied: 'badge-red', Completed: 'badge-gray' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Visitor Registry</h1>
          <p className="page-subtitle">{total} visitor records</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(INITIAL_FORM); setModal('add'); }}>
          <Plus size={14} /> Register Visitor
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search visitor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option>Pending</option><option>Approved</option><option>Denied</option><option>Completed</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Visitor ID</th><th>Name</th><th>Organization</th><th>Purpose</th><th>Host</th><th>Visit Date</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : visitors.map(v => (
                <tr key={v._id}>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.visitorId}</span></td>
                  <td><span style={{ fontWeight: 600 }}>{v.fullName}</span><br/><span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{v.idNumber}</span></td>
                  <td>{v.organization || '-'}</td>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.purposeOfVisit}</td>
                  <td>{v.hostName || '-'}</td>
                  <td><span className="mono" style={{ fontSize: 11 }}>{format(new Date(v.visitDate || v.createdAt), 'yyyy-MM-dd HH:mm')}</span></td>
                  <td><span className={`badge ${statusBadge[v.status] || 'badge-gray'}`}>{v.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setSelected(v); setModal('qr'); }}><QrCode size={12} /></button>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setSelected(v); setForm({ ...v, visitDate: format(new Date(v.visitDate || v.createdAt), "yyyy-MM-dd'T'HH:mm") }); setModal('edit'); }}><Edit2 size={12} /></button>
                      <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(v._id)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 700 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>
                {modal === 'add' ? 'Register Visitor' : 'Edit Visitor'}
              </h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group"><label className="form-label">Full Name *</label><input className="input" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">ID Number *</label><input className="input" value={form.idNumber} onChange={e => setForm(p => ({ ...p, idNumber: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Phone *</label><input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Organization</label><input className="input" value={form.organization} onChange={e => setForm(p => ({ ...p, organization: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Host Name</label><input className="input" value={form.hostName} onChange={e => setForm(p => ({ ...p, hostName: e.target.value }))} /></div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Purpose of Visit *</label><input className="input" value={form.purposeOfVisit} onChange={e => setForm(p => ({ ...p, purposeOfVisit: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Visit Date/Time</label><input className="input" type="datetime-local" value={form.visitDate} onChange={e => setForm(p => ({ ...p, visitDate: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Vehicle Plate</label><input className="input" value={form.vehiclePlate} onChange={e => setForm(p => ({ ...p, vehiclePlate: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option>Pending</option><option>Approved</option><option>Denied</option><option>Completed</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'qr' && selected && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 320, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase' }}>Visitor Pass QR</h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div style={{ background: 'white', padding: '1rem', borderRadius: 8, display: 'inline-block', marginBottom: '1rem' }}>
              <QRCodeSVG value={JSON.stringify({ type: 'Visitor', id: selected.visitorId, name: selected.fullName, purpose: selected.purposeOfVisit })} size={180} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{selected.fullName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{selected.purposeOfVisit}</div>
            <div style={{ marginTop: 8 }}><span className={`badge ${({ Pending: 'badge-yellow', Approved: 'badge-green', Denied: 'badge-red', Completed: 'badge-gray' })[selected.status]}`}>{selected.status}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
