import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, QrCode, X, CheckCircle, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const INITIAL_FORM = { plateNumber: '', vehicleType: 'Car', make: '', model: '', color: '', year: '', ownerName: '', ownerIdNumber: '', ownerPhone: '', registrationNumber: '', isAuthorized: false, status: 'Active', notes: '', category: 'Military' };

export default function Vehicles() {
  const { canAccess } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      const { data } = await api.get(`/vehicles?${params}`);
      setVehicles(data.data || data);
      setTotal(data.total || (data.data || data).length);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
      setVehicles([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, [search, filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modal === 'add') {
        await api.post('/vehicles', form);
        toast.success('Vehicle registered');
      } else {
        await api.put(`/vehicles/${selected._id}`, form);
        toast.success('Vehicle updated');
      }
      setModal(null);
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vehicle record?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      toast.success('Deleted');
      fetchVehicles();
    } catch { toast.error('Delete failed'); }
  };

  const openEdit = (v) => { setSelected(v); setForm({ ...v }); setModal('edit'); };
  const statusBadge = { Active: 'badge-green', Blacklisted: 'badge-red', Inactive: 'badge-gray' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicle Registry</h1>
          <p className="page-subtitle">{total} vehicles registered</p>
        </div>
        {canAccess(['Administrator', 'SecurityOfficer']) && (
          <button className="btn btn-primary" onClick={() => { setForm(INITIAL_FORM); setModal('add'); }}>
            <Plus size={14} /> Register Vehicle
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search plate, owner..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option>Active</option><option>Blacklisted</option><option>Inactive</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Plate</th><th>Type</th><th>Make / Model</th><th>Owner</th><th>Authorized</th><th>Status</th><th>Registered</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : vehicles.map(v => (
                <tr key={v._id}>
                  <td><span className="mono" style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: 13 }}>{v.plateNumber}</span></td>
                  <td><span className="badge badge-blue">{v.vehicleType}</span></td>
                  <td>{v.make} {v.model} {v.color ? `(${v.color})` : ''}</td>
                  <td>{v.ownerName}</td>
                  <td>
                    {v.isAuthorized
                      ? <CheckCircle size={16} color="var(--accent-green)" />
                      : <XCircle size={16} color="var(--accent-red)" />
                    }
                  </td>
                  <td><span className={`badge ${statusBadge[v.status] || 'badge-gray'}`}>{v.status}</span></td>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.createdAt ? format(new Date(v.createdAt), 'yyyy-MM-dd') : '--'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setSelected(v); setModal('qr'); }}><QrCode size={12} /></button>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => openEdit(v)}><Edit2 size={12} /></button>
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
                {modal === 'add' ? 'Register Vehicle' : 'Edit Vehicle'}
              </h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Plate Number *</label>
                  <input className="input" value={form.plateNumber} onChange={e => setForm(p => ({ ...p, plateNumber: e.target.value.toUpperCase() }))} required placeholder="MIL-0000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Type *</label>
                  <select className="input" value={form.vehicleType} onChange={e => setForm(p => ({ ...p, vehicleType: e.target.value }))}>
                    <option>Car</option><option>Truck</option><option>Motorcycle</option><option>Military Vehicle</option><option>Bus</option><option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Make</label>
                  <input className="input" value={form.make} onChange={e => setForm(p => ({ ...p, make: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Model</label>
                  <input className="input" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <input className="input" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input className="input" type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Owner Name *</label>
                  <input className="input" value={form.ownerName} onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Owner Category *</label>
                  <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    <option>Military</option><option>Civilian</option><option>Visitor</option><option>Contractor</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Owner Phone</label>
                  <input className="input" value={form.ownerPhone} onChange={e => setForm(p => ({ ...p, ownerPhone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option>Active</option><option>Blacklisted</option><option>Inactive</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="authorized" checked={form.isAuthorized} onChange={e => setForm(p => ({ ...p, isAuthorized: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  <label htmlFor="authorized" className="form-label" style={{ marginTop: 0 }}>Authorized Vehicle</label>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Notes</label>
                  <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
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

      {modal === 'qr' && selected && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 320, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase' }}>Vehicle QR Code</h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div style={{ background: 'white', padding: '1rem', borderRadius: 8, display: 'inline-block', marginBottom: '1rem' }}>
              <QRCodeSVG value={`${window.location.origin}/verify/${selected.vehicleId}`} size={180} />
            </div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent-green)' }}>{selected.plateNumber}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{selected.make} {selected.model}</div>
            
            <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'left' }}>
               <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>QR Verification Link</div>
               <a href={`${window.location.origin}/verify/${selected.vehicleId}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent-primary)', wordBreak: 'break-all', fontFamily: 'Share Tech Mono, monospace' }}>
                 {`${window.location.origin}/verify/${selected.vehicleId}`}
               </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
