import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, ArrowLeftRight, Shield, Eye, EyeOff, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import PhotoCaptureField from '../components/PhotoCaptureField';

const RANKS = ['Dable', 'Captan', 'Cornel', 'Gashaanle'];

const INITIAL_FORM = { 
  fullName: '', rank: '', militaryId: '', unit: 'Taliska 18', transferredFrom: '', phone: '', email: '', 
  type: 'Military', authorizedZones: '',
  hasVehicle: false,
  vehicleDetails: { plateNumber: '', model: '', color: '' },
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
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'qr' | 'transfer'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [transferForm, setTransferForm] = useState({ newUnit: '', newRank: '', transferReason: '', authorizedZones: '' });
  const [submitting, setSubmitting] = useState(false);
  const [guardAccount, setGuardAccount] = useState(null);
  const [guardForm, setGuardForm] = useState({ password: '', email: '' });
  const [showGuardPass, setShowGuardPass] = useState(false);
  const [guardSubmitting, setGuardSubmitting] = useState(false);
  const canManageGuardAccess = canAccess(['Administrator', 'SecurityOfficer']);

  const fetchPersonnel = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
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

  useEffect(() => { fetchPersonnel(); }, [search, filterType]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.authorizedZones) {
      toast.error('Authorized Zone is required.');
      return;
    }
    setSubmitting(true);
    try {
      const zonesArray = typeof form.authorizedZones === 'string' 
        ? form.authorizedZones.split(',').map(s => s.trim()).filter(Boolean)
        : form.authorizedZones;
        
      const payload = { ...form, authorizedZones: zonesArray };
      delete payload.status;

      if (modal === 'add') {
        const { data: newPerson } = await api.post('/personnel', payload);
        toast.success('Personnel registered');
        fetchPersonnel();
        setSelected(newPerson);
        setModal(null);
      } else {
        await api.put(`/personnel/${selected._id}`, payload);
        
        // Handle guard account creation/update if fields are filled
        if (canManageGuardAccess) {
          try {
            if (guardAccount?.hasAccount && guardForm.password.length >= 6) {
              await api.put(`/personnel/${selected._id}/guard-account/password`, { password: guardForm.password });
              toast.success('Guard password updated');
            } else if (!guardAccount?.hasAccount && guardForm.password.length >= 6 && guardForm.email) {
              if (!zonesArray || zonesArray.length === 0) {
                toast.error('Could not issue guard account: Authorized zone is required.');
              } else {
                await api.post(`/personnel/${selected._id}/guard-account`, guardForm);
                toast.success('Guard credentials issued');
              }
            }
          } catch (guardErr) {
            toast.error(guardErr.response?.data?.message || 'Failed to update guard account');
          }
        }

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

  const loadGuardAccount = async (personnelId, email = '') => {
    if (!canManageGuardAccess) return;
    try {
      const { data } = await api.get(`/personnel/${personnelId}/guard-account`);
      setGuardAccount(data);
      if (data.hasAccount && data.user) {
        setGuardForm({ password: '', email: data.user.email });
      } else {
        setGuardForm({ password: '', email: email || '' });
      }
    } catch {
      setGuardAccount({ hasAccount: false });
      setGuardForm({ password: '', email: email || '' });
    }
  };

  const handleIssueGuardAccount = async () => {
    if (!selected?._id) return;
    if (!form.authorizedZones) {
      toast.error('Set an authorized zone on this personnel record before issuing guard credentials.');
      return;
    }
    setGuardSubmitting(true);
    try {
      const { data } = await api.post(`/personnel/${selected._id}/guard-account`, guardForm);
      toast.success(data.message || 'Guard account issued');
      await loadGuardAccount(selected._id, guardForm.email);
      setGuardForm(prev => ({ ...prev, password: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue guard account');
    } finally {
      setGuardSubmitting(false);
    }
  };

  const handleResetGuardPassword = async () => {
    if (!selected?._id) return;
    setGuardSubmitting(true);
    try {
      const { data } = await api.put(`/personnel/${selected._id}/guard-account/password`, { password: guardForm.password });
      toast.success(data.message || 'Password updated');
      setGuardForm(prev => ({ ...prev, password: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setGuardSubmitting(false);
    }
  };

  const openEdit = (p) => { 
    setSelected(p); 
    setForm({ 
      ...p, 
      authorizedZones: (p.authorizedZones || []).join(', '),
      vehicleDetails: p.vehicleDetails || { plateNumber: '', model: '', color: '' }
    }); 
    setShowGuardPass(false);
    setGuardAccount(null);
    setGuardForm({ password: '', email: p.email || '' });
    setModal('edit');
    loadGuardAccount(p._id, p.email || '');
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

  const typeBadge = { Military: 'badge-blue', Civilian: 'badge-yellow', Staff: 'badge-gray' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Personnel Registry</h1>
          <p className="page-subtitle">{total} records total</p>
        </div>
        {canAccess(['Administrator', 'SecurityOfficer']) && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={14} /> Register Personnel
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div className="filter-toolbar">
          <div className="filter-search">
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search by name, ID, unit..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filter-controls">
            <select className="input filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option>Military</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="table-medium">
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Rank</th><th>Unit</th><th>Type</th><th>Registered</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : personnel.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No records found</td></tr>
              ) : personnel.map(p => (
                <tr key={p._id} className="animate-fadeIn hover-row" onClick={() => { setSelected(p); setModal('view'); }} style={{ cursor: 'pointer' }}>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.personnelId}</span></td>
                  <td><span style={{ fontWeight: 600 }}>{p.fullName}</span></td>
                  <td>{p.rank}</td>
                  <td>{p.unit}</td>
                  <td><span className={`badge ${typeBadge[p.type] || 'badge-gray'}`}>{p.type}</span></td>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(p.createdAt)}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setSelected(p); setModal('view'); }} title="View Details"><Eye size={12} /></button>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setSelected(p); setModal('qr'); }} title="QR Code"><QrCode size={12} /></button>
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
          <div className="modal modal-lg">
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
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Authorized Zones <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                  <select className="input" value={form.authorizedZones} onChange={e => setForm(p => ({ ...p, authorizedZones: e.target.value }))} required>
                    <option value="">-- Select Zone --</option>
                    <option value="Zone A">Zone A</option>
                    <option value="Zone B">Zone B</option>
                    <option value="Zone C">Zone C</option>
                  </select>
                </div>


                {modal === 'edit' && canManageGuardAccess && (
                  <div className="form-group" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                      <Shield size={16} color="var(--accent-primary)" />
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 15, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Guard System Access (Optional)
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Assign or update guard credentials. Changes will be saved when you click "Update".
                    </p>

                    {guardAccount?.hasAccount ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Issued Email</div>
                          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontWeight: 700, color: 'var(--accent-green)' }}>{guardAccount.user?.email}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                            Email: {guardAccount.user?.email} • {guardAccount.user?.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">New Password (Leave blank to keep current)</label>
                          <div style={{ position: 'relative' }}>
                            <input
                              className="input"
                              style={{ paddingRight: 36 }}
                              type={showGuardPass ? 'text' : 'password'}
                              value={guardForm.password}
                              onChange={e => setGuardForm(p => ({ ...p, password: e.target.value }))}
                              placeholder="Min 6 characters to update password"
                            />
                            <button type="button" className="btn btn-ghost" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 4 }} onClick={() => setShowGuardPass(v => !v)}>
                              {showGuardPass ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Guard Password</label>
                          <div style={{ position: 'relative' }}>
                            <input
                              className="input"
                              style={{ paddingRight: 36 }}
                              type={showGuardPass ? 'text' : 'password'}
                              value={guardForm.password}
                              onChange={e => setGuardForm(p => ({ ...p, password: e.target.value }))}
                              placeholder="Min 6 characters"
                            />
                            <button type="button" className="btn btn-ghost" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 4 }} onClick={() => setShowGuardPass(v => !v)}>
                              {showGuardPass ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Login Email</label>
                          <input className="input" type="email" value={guardForm.email} onChange={e => setGuardForm(p => ({ ...p, email: e.target.value }))} placeholder="guard@camp.mil" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

                <PhotoCaptureField
                  photo={form.photo}
                  onPhotoChange={(photo) => setForm(p => ({ ...p, photo }))}
                  label={<>Personnel Photo <span style={{ color: 'var(--accent-primary)' }}>*</span></>}
                  hint="A clear facial photo is required."
                  cameraFacing="user"
                />
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
                  <label className="form-label">Authorized Zone(s) *</label>
                  <select 
                    className="input" 
                    value={transferForm.authorizedZones} 
                    onChange={e => setTransferForm(p => ({ ...p, authorizedZones: e.target.value }))}
                    required
                  >
                    <option value="">-- Select Zone --</option>
                    <option value="Zone A">Zone A</option>
                    <option value="Zone B">Zone B</option>
                    <option value="Zone C">Zone C</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Purpose / Reason *</label>
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

      {modal === 'qr' && selected && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase' }}>Personnel QR Code</h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div style={{ background: 'white', padding: '1rem', borderRadius: 8, display: 'inline-block', marginBottom: '1rem' }}>
              <QRCodeSVG value={`${window.location.origin}/verify/${selected.personnelId}`} size={180} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.fullName}</div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{selected.personnelId}</div>
            <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>Scan to view identity</div>
              <a href={`${window.location.origin}/verify/${selected.personnelId}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent-primary)', wordBreak: 'break-all', fontFamily: 'Share Tech Mono, monospace' }}>
                {`${window.location.origin}/verify/${selected.personnelId}`}
              </a>
            </div>
          </div>
        </div>
      )}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>
                Personnel Details
              </h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {selected.photo ? (
                <img src={selected.photo} alt={selected.fullName} style={{ width: 100, height: 100, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
              ) : (
                <div style={{ width: 100, height: 100, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)' }}>
                  <Shield size={32} color="var(--text-muted)" />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{selected.fullName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }} className="mono">{selected.personnelId}</div>
                <div style={{ marginTop: 8 }}>
                  <span className={`badge ${selected.type === 'Military' ? 'badge-blue' : selected.type === 'Civilian' ? 'badge-yellow' : 'badge-gray'}`}>
                    {selected.type}
                  </span>
                  {selected.status === 'Active' ? <span className="badge badge-green" style={{ marginLeft: 8 }}>Active</span> : <span className="badge badge-red" style={{ marginLeft: 8 }}>{selected.status}</span>}
                </div>
              </div>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Rank</div>
                <div style={{ fontWeight: 600 }}>{selected.rank || '-'}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Unit</div>
                <div style={{ fontWeight: 600 }}>{selected.unit || '-'}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>National ID</div>
                <div className="mono" style={{ fontWeight: 600 }}>{selected.idNumber || '-'}</div>
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
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Auth Zones</div>
                <div style={{ fontWeight: 600 }}>{selected.authorizedZones?.join(', ') || '-'}</div>
              </div>
            </div>
            
            {selected.hasVehicle && selected.vehicleDetails && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: 8 }}>Registered Vehicle</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Plate</div>
                    <div className="mono" style={{ fontWeight: 600 }}>{selected.vehicleDetails.plateNumber}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Model</div>
                    <div style={{ fontWeight: 600 }}>{selected.vehicleDetails.model}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Color</div>
                    <div style={{ fontWeight: 600 }}>{selected.vehicleDetails.color}</div>
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
