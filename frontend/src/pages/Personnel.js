import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, ArrowLeftRight, Camera } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

const RANKS = ['Dable', 'Captan', 'Cornel', 'Gashaanle'];

const INITIAL_FORM = { 
  fullName: '', rank: '', militaryId: '', unit: 'Taliska 18', transferredFrom: '', phone: '', email: '', 
  type: 'Military', status: 'Active', authorizedZones: '',
  hasVehicle: false,
  vehicleDetails: { plateNumber: '', model: '', color: '' },
  serviceVerified: false,
  serviceHistory: '',
  photo: ''
};

const UNITS = [
  'Taliska 18',
  'Taliska 20',
  'Taliska 64',
  'Guutada Gor Gor',
];

export default function Personnel() {
  const { canAccess } = useAuth();
  const [personnel, setPersonnel] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'qr' | 'transfer'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [transferForm, setTransferForm] = useState({ newUnit: '', newRank: '', transferReason: '', authorizedZones: '' });
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
    } catch (err) {
      console.error('Failed to fetch personnel:', err);
      setPersonnel([]);
      setTotal(0);
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
        const { data: newPerson } = await api.post('/personnel', payload);
        toast.success('Personnel registered');
        fetchPersonnel();
        setSelected(newPerson);
        setModal(null);
      } else {
        await api.put(`/personnel/${selected._id}`, payload);
        toast.success('Personnel updated');
        setModal(null);
        fetchPersonnel();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (p) => { 
    setSelected(p); 
    setForm({ 
      ...p, 
      authorizedZones: (p.authorizedZones || []).join(', '),
      vehicleDetails: p.vehicleDetails || { plateNumber: '', model: '', color: '' }
    }); 
    setModal('edit'); 
  };
  const openAdd = () => { setForm(INITIAL_FORM); setModal('add'); };
  
  const openTransfer = (p) => {
    setSelected(p);
    setTransferForm({
      newUnit: '',
      newRank: p.rank || '',
      transferReason: '',
      authorizedZones: (p.authorizedZones || []).join(', ')
    });
    setModal('transfer');
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/personnel/${selected._id}/transfer`, transferForm);
      toast.success('Personnel unit transferred successfully');
      setModal(null);
      fetchPersonnel();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

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

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search by name, ID, unit..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flex: '1 1 auto' }}>
            <select className="input" style={{ flex: 1, minWidth: 120 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option>Military</option>
            </select>
            <select className="input" style={{ flex: 1, minWidth: 120 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option>Active</option><option>Inactive</option><option>Suspended</option>
            </select>
          </div>
        </div>
      </div>

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
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(p.createdAt)}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canAccess(['Administrator', 'SecurityOfficer']) && (
                        <>
                          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => openEdit(p)} title="Edit"><Edit2 size={12} /></button>
                          <button className="btn btn-ghost" style={{ padding: '4px 8px', color: 'var(--accent-primary)' }} onClick={() => openTransfer(p)} title="Transfer Unit"><ArrowLeftRight size={12} /></button>
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
                  <label className="form-label">Military ID Card *</label>
                  <input className="input" value={form.militaryId} onChange={e => setForm(p => ({ ...p, militaryId: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Rank</label>
                  <select className="input" value={form.rank} onChange={e => setForm(p => ({ ...p, rank: e.target.value }))}>
                    <option value="" disabled>Select Rank</option>
                    {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit *</label>
                  <select className="input" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} required>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Transferred From</label>
                  <select className="input" value={form.transferredFrom} onChange={e => setForm(p => ({ ...p, transferredFrom: e.target.value }))}>
                    <option value="">-- Select (if applicable) --</option>
                    <option value="1, Wasaarada gaashan dhiga">1, Wasaarada gaashan dhiga</option>
                    <option value="2, Xallane">2, Xallane</option>
                    <option value="3, Danab">3, Danab</option>
                  </select>
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
                    <option>Military</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option>Active</option><option>Inactive</option><option>Suspended</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Authorized Zones</label>
                  <select className="input" value={form.authorizedZones} onChange={e => setForm(p => ({ ...p, authorizedZones: e.target.value }))}>
                    <option value="">-- Select Zone --</option>
                    <option value="Zone A">Zone A</option>
                    <option value="Zone B">Zone B</option>
                    <option value="Zone C">Zone C</option>
                    <option value="HQ">HQ</option>
                    <option value="All Zones">All Zones</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
                    <input 
                      type="checkbox" 
                      checked={form.hasVehicle} 
                      onChange={e => setForm(p => ({ ...p, hasVehicle: e.target.checked }))}
                      style={{ width: 20, height: 20 }}
                    />
                    Do you drive a car?
                  </label>
                </div>

                {form.hasVehicle && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Plate Number *</label>
                      <input className="input" value={form.vehicleDetails.plateNumber} onChange={e => setForm(p => ({ ...p, vehicleDetails: { ...p.vehicleDetails, plateNumber: e.target.value } }))} required={form.hasVehicle} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vehicle Model *</label>
                      <input className="input" value={form.vehicleDetails.model} onChange={e => setForm(p => ({ ...p, vehicleDetails: { ...p.vehicleDetails, model: e.target.value } }))} required={form.hasVehicle} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Color *</label>
                      <input className="input" value={form.vehicleDetails.color} onChange={e => setForm(p => ({ ...p, vehicleDetails: { ...p.vehicleDetails, color: e.target.value } }))} required={form.hasVehicle} />
                    </div>
                  </>
                )}

                <div className="form-group" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '2px solid var(--border)' }}>
                    <input 
                      type="checkbox" 
                      checked={form.serviceVerified} 
                      onChange={e => setForm(p => ({ ...p, serviceVerified: e.target.checked }))}
                      required
                      style={{ width: 24, height: 24 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Unit Service Verification *</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>I confirm that this individual is a verified soldier of the specified unit.</div>
                    </div>
                  </label>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <label className="form-label">Personnel Photo <span style={{ color: 'var(--accent-primary)' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ width: 110, height: 140, borderRadius: 10, background: 'var(--bg-secondary)', border: `2px solid ${form.photo ? 'var(--accent-green)' : 'var(--accent-primary)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, transition: 'border-color 0.3s' }}>
                      {form.photo
                        ? <img src={form.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}><Camera size={36} /><div style={{ fontSize: 10, marginTop: 6, fontWeight: 700, letterSpacing: '0.05em' }}>NO PHOTO</div></div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setForm(p => ({ ...p, photo: reader.result }));
                            reader.readAsDataURL(file);
                          }
                        }} style={{ fontSize: 13 }} />
                        {form.photo && (
                          <button type="button" className="btn btn-ghost" style={{ fontSize: 12, alignSelf: 'flex-start', color: 'var(--accent-red)' }} onClick={() => setForm(p => ({ ...p, photo: '' }))}>
                            Remove Photo
                          </button>
                        )}
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>A clear facial photo is required.</p>
                      </div>
                    </div>
                  </div>
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

      {modal === 'transfer' && selected && (
        <div className="modal-overlay animate-fadeIn">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowLeftRight size={18} /> Transfer Personnel
              </h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personnel Details</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{selected.fullName}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem', fontSize: 13 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Military ID:</span> <strong className="mono">{selected.personnelId}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Current Rank:</span> <strong>{selected.rank || '-'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Current Unit:</span> <strong>{selected.unit || '-'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Personnel Type:</span> <strong>{selected.type}</strong></div>
              </div>
            </div>

            <form onSubmit={handleTransferSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">New Unit / Station *</label>
                  <select
                    className="input"
                    value={transferForm.newUnit}
                    onChange={e => setTransferForm(p => ({ ...p, newUnit: e.target.value }))}
                    required
                  >
                    <option value="">-- Select Unit --</option>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">New Rank (if promoted/demoted)</label>
                  <select className="input" value={transferForm.newRank} onChange={e => setTransferForm(p => ({ ...p, newRank: e.target.value }))}>
                    <option value="">-- No Change --</option>
                    {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Authorized Zones for New Unit</label>
                  <input 
                    className="input" 
                    value={transferForm.authorizedZones} 
                    onChange={e => setTransferForm(p => ({ ...p, authorizedZones: e.target.value }))} 
                    placeholder="e.g. Zone A, HQ, Command Center (comma separated)" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Transfer Order / Reason *</label>
                  <textarea 
                    className="input" 
                    rows={3} 
                    value={transferForm.transferReason} 
                    onChange={e => setTransferForm(p => ({ ...p, transferReason: e.target.value }))} 
                    placeholder="Specify the reason for transfer or official military orders..." 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Executing Transfer...' : 'Complete Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
