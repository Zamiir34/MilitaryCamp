import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, QrCode, X, Filter } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const DEMO = [
  { _id: '1', personnelId: 'P20240001', fullName: 'SGT. John Mitchell', rank: 'Sergeant', unit: 'Alpha Company', idNumber: 'MIL-001234', type: 'Military', status: 'Active', phone: '+1-555-0101', createdAt: new Date().toISOString() },
  { _id: '2', personnelId: 'P20240002', fullName: 'CPL. Sarah Adams', rank: 'Corporal', unit: 'Bravo Company', idNumber: 'MIL-001235', type: 'Military', status: 'Active', phone: '+1-555-0102', createdAt: new Date().toISOString() },
  { _id: '3', personnelId: 'P20240003', fullName: 'Dr. Robert Chen', rank: 'Civilian', unit: 'Medical Division', idNumber: 'CIV-003421', type: 'Civilian', status: 'Active', phone: '+1-555-0103', createdAt: new Date().toISOString() },
  { _id: '4', personnelId: 'P20240004', fullName: 'LT. Emily Reyes', rank: 'Lieutenant', unit: 'Intelligence Unit', idNumber: 'MIL-001236', type: 'Military', status: 'Inactive', phone: '+1-555-0104', createdAt: new Date().toISOString() },
];

const INITIAL_FORM = { fullName: '', rank: '', unit: '', idNumber: '', phone: '', email: '', type: 'Military', status: 'Active', authorizedZones: '' };

export default function Personnel() {
  const { canAccess } = useAuth();
  const [personnel, setPersonnel] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'qr'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchPersonnel = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      const { data } = await api.get(`/personnel?${params}`);
      setPersonnel(data.data || data);
      setTotal(data.total || (data.data || data).length);
    } catch {
      setPersonnel(DEMO);
      setTotal(DEMO.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPersonnel(); }, [search, filterType, filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const zonesArray = typeof form.authorizedZones === 'string' 
        ? form.authorizedZones.split(',').map(s => s.trim()).filter(Boolean)
        : form.authorizedZones;
        
      const payload = { ...form, authorizedZones: zonesArray };

      if (modal === 'add') {
        await api.post('/personnel', payload);
        toast.success('Personnel registered successfully');
      } else {
        await api.put(`/personnel/${selected._id}`, payload);
        toast.success('Personnel updated');
      }
      setModal(null);
      fetchPersonnel();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this personnel record?')) return;
    try {
      await api.delete(`/personnel/${id}`);
      toast.success('Deleted');
      fetchPersonnel();
    } catch {
      toast.error('Delete failed');
    }
  };

  const openEdit = (p) => { setSelected(p); setForm({ ...p, authorizedZones: (p.authorizedZones || []).join(', ') }); setModal('edit'); };
  const openAdd = () => { setForm(INITIAL_FORM); setModal('add'); };
  const openQR = (p) => { setSelected(p); setModal('qr'); };

  const statusBadge = { Active: 'badge-green', Inactive: 'badge-gray', Suspended: 'badge-red' };
  const typeBadge = { Military: 'badge-blue', Civilian: 'badge-yellow', Staff: 'badge-gray' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Personnel Registry</h1>
          <p className="page-subtitle">{total} records total</p>
        </div>
        {canAccess(['Administrator', 'SecurityOfficer']) && (
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> Register Personnel
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search by name, ID, unit..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flex: '1 1 auto' }}>
            <select className="input" style={{ flex: 1, minWidth: 120 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option>Military</option><option>Civilian</option><option>Staff</option>
            </select>
            <select className="input" style={{ flex: 1, minWidth: 120 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option>Active</option><option>Inactive</option><option>Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Rank</th><th>Unit</th><th>Type</th><th>Status</th><th>Registered</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : personnel.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No records found</td></tr>
              ) : personnel.map(p => (
                <tr key={p._id} className="animate-fadeIn">
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.personnelId}</span></td>
                  <td><span style={{ fontWeight: 600 }}>{p.fullName}</span></td>
                  <td>{p.rank}</td>
                  <td>{p.unit}</td>
                  <td><span className={`badge ${typeBadge[p.type] || 'badge-gray'}`}>{p.type}</span></td>
                  <td><span className={`badge ${statusBadge[p.status] || 'badge-gray'}`}>{p.status}</span></td>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(p.createdAt), 'yyyy-MM-dd')}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => openQR(p)} title="View QR"><QrCode size={12} /></button>
                      {canAccess(['Administrator', 'SecurityOfficer']) && (
                        <>
                          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => openEdit(p)} title="Edit"><Edit2 size={12} /></button>
                          <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(p._id)} title="Delete"><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Add/Edit */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 700 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {modal === 'add' ? 'Register New Personnel' : 'Edit Personnel'}
              </h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="input" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Rank</label>
                  <input className="input" value={form.rank} onChange={e => setForm(p => ({ ...p, rank: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit *</label>
                  <input className="input" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">ID Number *</label>
                  <input className="input" value={form.idNumber} onChange={e => setForm(p => ({ ...p, idNumber: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option>Military</option><option>Civilian</option><option>Staff</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option>Active</option><option>Inactive</option><option>Suspended</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Authorized Zones (comma separated)</label>
                  <input className="input" value={form.authorizedZones} onChange={e => setForm(p => ({ ...p, authorizedZones: e.target.value }))} placeholder="Zone A, Zone B, HQ" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : modal === 'add' ? 'Register' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {modal === 'qr' && selected && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 340, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase' }}>Personnel QR Code</h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div style={{ background: 'white', padding: '1rem', borderRadius: 8, display: 'inline-block', marginBottom: '1rem' }}>
              <QRCodeSVG value={JSON.stringify({ type: 'Personnel', id: selected.personnelId, name: selected.fullName })} size={180} />
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16 }}>{selected.fullName}</div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{selected.personnelId}</div>
            <div style={{ marginTop: 4 }}><span className={`badge ${statusBadge[selected.status]}`}>{selected.status}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
