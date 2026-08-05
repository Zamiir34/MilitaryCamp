import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, QrCode, X, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import PhotoCaptureField from '../components/PhotoCaptureField';
import { downloadQrAsPng } from '../utils/downloadQr';

const INITIAL_FORM = { 
  fullName: '', 
  visitorType: 'Military', 
  idNumber: '', 
  phone: '', 
  email: '', 
  organization: '', 
  purposeOfVisit: '', 
  hostName: '', 
  visitDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"), 
  expectedDuration: '', 
  hasVehicle: false,
  vehiclePlate: '', 
  vehicleModel: '',
  vehicleColor: '',
  status: 'Approved', 
  photo: ''
};

export default function Visitors() {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [hostUsers, setHostUsers] = useState([]);

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      const { data } = await api.get(`/visitors?${params}`);
      setVisitors(data.data || data);
      setTotal(data.total || (data.data || data).length);
    } catch (err) {
      console.error('Failed to fetch visitors:', err);
      setVisitors([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchHosts = async () => {
    try {
      const { data } = await api.get('/chat/users');
      setHostUsers(data);
    } catch (err) {
      console.error('Failed to fetch hosts:', err);
    }
  };

  useEffect(() => { fetchVisitors(); }, [search, filterStatus]);
  useEffect(() => { if (modal) fetchHosts(); }, [modal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.photo) {
      toast.error(form.visitorType === 'Military' ? 'Military ID card photo is required.' : 'Visitor photo is required.');
      return;
    }
    setSubmitting(true);
    try {
      if (modal === 'add') {
        const { data: newVisitor } = await api.post('/visitors', form);
        toast.success('Visitor registered — scan QR code now');
        fetchVisitors();
        setSelected(newVisitor);
        setModal('qr');
      } else {
        await api.put(`/visitors/${selected._id}`, form);
        toast.success('Visitor updated');
        setModal(null);
        fetchVisitors();
      }
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
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => { setForm(INITIAL_FORM); setModal('add'); }}>
            <Plus size={14} /> Register Visitor
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div className="filter-toolbar">
          <div className="filter-search">
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search visitor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option>Pending</option><option>Approved</option><option>Denied</option><option>Completed</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="table-wide">
            <thead>
               <tr>
                <th>Visitor ID</th><th>Category</th><th>Name</th><th>Organization</th><th>Purpose</th><th>Host Officer</th><th>Visit Date</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : visitors.map(v => (
                <tr key={v._id} className="hover-row" onClick={() => { setSelected(v); setModal('view'); }} style={{ cursor: 'pointer' }}>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.visitorId}</span></td>
                  <td><span className={`badge ${v.visitorType === 'Military' ? 'badge-blue' : 'badge-yellow'}`}>{v.visitorType}</span></td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{v.fullName}</span>
                    <br/>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{v.idNumber}</span>
                    {v.hasVehicle && (
                      <div style={{ marginTop: 4 }}>
                        <span className="badge badge-gray" style={{ fontSize: 9, padding: '2px 6px' }}>
                          🚗 {v.vehiclePlate} {v.vehicleModel ? `(${v.vehicleModel})` : ''}
                        </span>
                      </div>
                    )}
                  </td>
                  <td>{v.organization || '-'}</td>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.purposeOfVisit}</td>
                  <td><span style={{ fontWeight: v.visitorType === 'Civilian' ? 600 : 400 }}>{v.hostName || '-'}</span></td>
                  <td><span className="mono" style={{ fontSize: 11 }}>{(v.visitDate || v.createdAt) ? format(new Date(v.visitDate || v.createdAt), 'yyyy-MM-dd HH:mm') : '--'}</span></td>
                  <td><span className={`badge ${statusBadge[v.status] || 'badge-gray'}`}>{v.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setSelected(v); setModal('view'); }} title="View Details"><Eye size={12} /></button>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setSelected(v); setModal('qr'); }}><QrCode size={12} /></button>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setSelected(v); setForm({ ...v, hasVehicle: v.hasVehicle || false, vehiclePlate: v.vehiclePlate || '', vehicleModel: v.vehicleModel || '', vehicleColor: v.vehicleColor || '', visitDate: (v.visitDate || v.createdAt) ? format(new Date(v.visitDate || v.createdAt), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm") }); setModal('edit'); }}><Edit2 size={12} /></button>
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
          <div className="modal modal-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>
                {modal === 'add' ? 'Register Visitor' : 'Edit Visitor'}
              </h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Visitor Category *</label>
                  <div className="grid-2-mobile">
                    <label style={{ flex: 1, padding: '12px', border: `2px solid ${form.visitorType === 'Military' ? 'var(--accent-primary)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: form.visitorType === 'Military' ? 'var(--bg-active)' : 'transparent' }}>
                      <input type="radio" name="vtype" checked={form.visitorType === 'Military'} onChange={() => setForm(p => ({ ...p, visitorType: 'Military', purposeOfVisit: '', status: 'Approved' }))} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Military Personnel</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Visiting for official facility business</div>
                      </div>
                    </label>
                    <label style={{ flex: 1, padding: '12px', border: `2px solid ${form.visitorType === 'Civilian' ? 'var(--accent-primary)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: form.visitorType === 'Civilian' ? 'var(--bg-active)' : 'transparent' }}>
                      <input type="radio" name="vtype" checked={form.visitorType === 'Civilian'} onChange={() => setForm(p => ({ ...p, visitorType: 'Civilian', purposeOfVisit: '', status: 'Pending' }))} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Civilian Visitor</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Visiting a specific military officer</div>
                      </div>
                    </label>
                  </div>
                </div>

                  <>
                    <div className="form-group"><label className="form-label">Full Name *</label><input className="input" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required /></div>
                    <div className="form-group"><label className="form-label">{form.visitorType === 'Military' ? 'Military ID *' : 'National ID *'}</label><input className="input" value={form.idNumber} onChange={e => setForm(p => ({ ...p, idNumber: e.target.value }))} required /></div>
                    <div className="form-group"><label className="form-label">Phone *</label><input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required /></div>
                    <div className="form-group"><label className="form-label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                    
                    <div className="form-group">
                      <label className="form-label">{form.visitorType === 'Military' ? 'Host Unit / Officer *' : 'Military Officer to Visit *'}</label>
                      <input className="input" list="hosts" value={form.hostName} onChange={e => setForm(p => ({ ...p, hostName: e.target.value }))} required placeholder={form.visitorType === 'Military' ? 'Enter Unit or Officer' : 'Enter Officer Name'} />
                      <datalist id="hosts">
                        {hostUsers.map(u => <option key={u._id} value={u.fullName}>{u.rank} {u.fullName} ({u.role})</option>)}
                      </datalist>
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Purpose of Visit *</label><input className="input" value={form.purposeOfVisit} onChange={e => setForm(p => ({ ...p, purposeOfVisit: e.target.value }))} required placeholder="e.g. Official duty, meeting, etc." /></div>
                    <div className="form-group"><label className="form-label">Status</label>
                      <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                        <option>Pending</option><option>Approved</option><option>Denied</option><option>Completed</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Has Vehicle?</label>
                      <select className="input" value={form.hasVehicle ? "true" : "false"} onChange={e => setForm(p => ({ ...p, hasVehicle: e.target.value === 'true', vehiclePlate: e.target.value === 'false' ? '' : p.vehiclePlate, vehicleModel: e.target.value === 'false' ? '' : p.vehicleModel, vehicleColor: e.target.value === 'false' ? '' : p.vehicleColor }))}>
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>
                    {form.hasVehicle && (
                      <>
                        <div className="form-group"><label className="form-label">Vehicle Plate *</label><input className="input" value={form.vehiclePlate} onChange={e => setForm(p => ({ ...p, vehiclePlate: e.target.value }))} required /></div>
                        <div className="form-group"><label className="form-label">Vehicle Model</label><input className="input" value={form.vehicleModel} onChange={e => setForm(p => ({ ...p, vehicleModel: e.target.value }))} placeholder="e.g. Toyota Hilux" /></div>
                        <div className="form-group"><label className="form-label">Vehicle Color</label><input className="input" value={form.vehicleColor} onChange={e => setForm(p => ({ ...p, vehicleColor: e.target.value }))} placeholder="e.g. White" /></div>
                      </>
                    )}
                  </>

                <PhotoCaptureField
                  photo={form.photo}
                  onPhotoChange={(photo) => setForm(p => ({ ...p, photo }))}
                  label={
                    <>
                      {form.visitorType === 'Military' ? 'Military ID Card Photo' : 'Visitor Photo'}
                      {' '}
                      <span style={{ color: 'var(--accent-primary)' }}>*</span>
                    </>
                  }
                  emptyLabel={form.visitorType === 'Military' ? 'NO ID UPLOAD' : 'NO PHOTO'}
                  hint={
                    form.visitorType === 'Military'
                      ? 'A clear photo of the Military ID card is required. No face photo is needed.'
                      : 'A clear facial photo is required. After registration, a QR code will be generated automatically.'
                  }
                  cameraFacing={form.visitorType === 'Military' ? 'environment' : 'user'}
                />
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
          <div className="modal" style={{ maxWidth: 280, textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="visitor-qr-download" style={{ background: 'white', padding: '1rem', borderRadius: 8, display: 'inline-block' }}>
              <QRCodeSVG value={`${window.location.origin}/verify/${selected.visitorId}`} size={200} includeMargin />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
              onClick={() => {
                const ok = downloadQrAsPng('.visitor-qr-download', `VisitorQR_${selected.visitorId}.png`, 512);
                if (ok) toast.success('QR image downloaded');
                else toast.error('Could not download QR image');
              }}
            >
              <Download size={14} /> Download Image
            </button>
          </div>
        </div>
      )}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>
                Visitor Details
              </h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {selected.photo ? (
                <img src={selected.photo} alt={selected.fullName} style={{ width: 100, height: 100, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
              ) : (
                <div style={{ width: 100, height: 100, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)' }}>
                  <User size={32} color="var(--text-muted)" />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{selected.fullName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }} className="mono">{selected.visitorId}</div>
                <div style={{ marginTop: 8 }}>
                  <span className={`badge ${selected.visitorType === 'Military' ? 'badge-blue' : 'badge-yellow'}`}>
                    {selected.visitorType}
                  </span>
                  <span className={`badge ${statusBadge[selected.status] || 'badge-gray'}`} style={{ marginLeft: 8 }}>{selected.status}</span>
                </div>
              </div>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>ID Number</div>
                <div className="mono" style={{ fontWeight: 600 }}>{selected.idNumber || '-'}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Organization</div>
                <div style={{ fontWeight: 600 }}>{selected.organization || '-'}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Phone</div>
                <div style={{ fontWeight: 600 }}>{selected.phone || '-'}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Email</div>
                <div style={{ fontWeight: 600 }}>{selected.email || '-'}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Host Name</div>
                <div style={{ fontWeight: 600 }}>{selected.hostName || '-'}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Visit Date</div>
                <div className="mono" style={{ fontWeight: 600 }}>{(selected.visitDate || selected.createdAt) ? format(new Date(selected.visitDate || selected.createdAt), 'yyyy-MM-dd HH:mm') : '-'}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Purpose of Visit</div>
                <div style={{ fontWeight: 600 }}>{selected.purposeOfVisit || '-'}</div>
              </div>
            </div>
            
            {selected.hasVehicle && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: 8 }}>Registered Vehicle</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Plate</div>
                    <div className="mono" style={{ fontWeight: 600 }}>{selected.vehiclePlate}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Model</div>
                    <div style={{ fontWeight: 600 }}>{selected.vehicleModel || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Color</div>
                    <div style={{ fontWeight: 600 }}>{selected.vehicleColor || '-'}</div>
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
