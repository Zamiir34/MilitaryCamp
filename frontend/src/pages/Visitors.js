import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, QrCode, X, Camera } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

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
  status: 'Pending', 
  notes: '',
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
  const [webcamActive, setWebcamActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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

  const startWebcam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = s;
      setWebcamActive(true);
    } catch {
      toast.error('Camera access denied. Please upload a photo instead.');
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setWebcamActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setForm(p => ({ ...p, photo: canvas.toDataURL('image/jpeg', 0.85) }));
    stopWebcam();
  };

  useEffect(() => {
    if (webcamActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [webcamActive]);

  useEffect(() => {
    if (modal !== 'add' && modal !== 'edit') stopWebcam();
  }, [modal]);

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
        stopWebcam();
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
                <th>Visitor ID</th><th>Category</th><th>Name</th><th>Organization</th><th>Purpose</th><th>Host Officer</th><th>Visit Date</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : visitors.map(v => (
                <tr key={v._id}>
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
                    <div style={{ display: 'flex', gap: 4 }}>
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
          <div className="modal" style={{ maxWidth: 700 }}>
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
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ flex: 1, padding: '12px', border: `2px solid ${form.visitorType === 'Military' ? 'var(--accent-primary)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: form.visitorType === 'Military' ? 'var(--bg-active)' : 'transparent' }}>
                      <input type="radio" name="vtype" checked={form.visitorType === 'Military'} onChange={() => setForm(p => ({ ...p, visitorType: 'Military', purposeOfVisit: 'Facility Access / Official Visit' }))} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Military Personnel</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Visiting for official facility business</div>
                      </div>
                    </label>
                    <label style={{ flex: 1, padding: '12px', border: `2px solid ${form.visitorType === 'Civilian' ? 'var(--accent-primary)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: form.visitorType === 'Civilian' ? 'var(--bg-active)' : 'transparent' }}>
                      <input type="radio" name="vtype" checked={form.visitorType === 'Civilian'} onChange={() => setForm(p => ({ ...p, visitorType: 'Civilian', purposeOfVisit: 'Personal / Official Visit to Officer' }))} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Civilian Visitor</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Visiting a specific military officer</div>
                      </div>
                    </label>
                  </div>
                </div>

                  <>
                    {form.visitorType !== 'Military' && (
                      <>
                        <div className="form-group"><label className="form-label">Full Name *</label><input className="input" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required /></div>
                        <div className="form-group"><label className="form-label">National ID *</label><input className="input" value={form.idNumber} onChange={e => setForm(p => ({ ...p, idNumber: e.target.value }))} required /></div>
                        <div className="form-group"><label className="form-label">Phone *</label><input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required /></div>
                      </>
                    )}
                    <div className="form-group"><label className="form-label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                    
                    {form.visitorType !== 'Military' && (
                      <>
                    <div className="form-group">
                      <label className="form-label">Military Officer to Visit *</label>
                      <input className="input" list="hosts" value={form.hostName} onChange={e => setForm(p => ({ ...p, hostName: e.target.value }))} required placeholder="Enter Officer Name" />
                      <datalist id="hosts">
                        {hostUsers.map(u => <option key={u._id} value={u.fullName}>{u.rank} {u.fullName} ({u.role})</option>)}
                      </datalist>
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Purpose of Visit *</label><input className="input" value={form.purposeOfVisit} onChange={e => setForm(p => ({ ...p, purposeOfVisit: e.target.value }))} required /></div>
                    <div className="form-group"><label className="form-label">Status</label>
                      <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                        <option>Pending</option><option>Approved</option><option>Denied</option><option>Completed</option>
                      </select>
                    </div>
                      </>
                    )}
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
                    {form.visitorType !== 'Military' && (
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
                    )}
                  </>

                <div className="form-group" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <label className="form-label">{form.visitorType === 'Military' ? 'Military ID Card Photo' : 'Visitor Photo'} <span style={{ color: 'var(--accent-primary)' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Photo Preview */}
                    <div style={{ width: 110, height: 140, borderRadius: 10, background: 'var(--bg-secondary)', border: `2px solid ${form.photo ? 'var(--accent-green)' : 'var(--accent-primary)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, transition: 'border-color 0.3s' }}>
                      {form.photo
                        ? <img src={form.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}><Camera size={36} /><div style={{ fontSize: 10, marginTop: 6, fontWeight: 700, letterSpacing: '0.05em' }}>{form.visitorType === 'Military' ? 'NO ID UPLOAD' : 'NO PHOTO'}</div></div>
                      }
                    </div>
                    {/* Webcam / Upload */}
                    <div style={{ flex: 1, minWidth: 220 }}>
                      {webcamActive ? (
                        <div>
                          <video ref={videoRef} autoPlay playsInline muted
                            style={{ width: '100%', maxWidth: 320, borderRadius: 8, border: '2px solid var(--accent-primary)', display: 'block', marginBottom: 8 }}
                          />
                          <canvas ref={canvasRef} style={{ display: 'none' }} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-primary" onClick={capturePhoto} style={{ flex: 1 }}>
                              <Camera size={14} /> Capture Photo
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={stopWebcam}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <button type="button" className="btn btn-primary" onClick={startWebcam} style={{ alignSelf: 'flex-start' }}>
                            <Camera size={14} /> Open Camera
                          </button>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 11 }}>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                            or upload file
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                          </div>
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
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                            {form.visitorType === 'Military' 
                              ? 'A clear photo of your Military ID card is required. No face photo is needed.' 
                              : 'A clear facial photo is required. After registration, a QR code will be generated automatically.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
          <div className="modal" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase' }}>Visitor QR Code</h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>

            <div style={{ background: 'white', padding: '1rem', borderRadius: 8, display: 'inline-block', marginBottom: '1.5rem' }}>
              <QRCodeSVG value={`${window.location.origin}/verify/${selected.visitorId}`} size={180} />
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>QR Verification Link</div>
              <a href={`${window.location.origin}/verify/${selected.visitorId}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent-primary)', wordBreak: 'break-all', fontFamily: 'Share Tech Mono, monospace' }}>
                {`${window.location.origin}/verify/${selected.visitorId}`}
              </a>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => window.print()} style={{ width: '100%', justifyContent: 'center' }}>Print Visitor Pass</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
