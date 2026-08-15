import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Shield, Eye, EyeOff } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const RANKS = ['Dable', 'Captan', 'Cornel', 'Gashaanle'];

const INITIAL_FORM = { 
  password: '', fullName: '', email: '', role: 'Guard', 
  phone: '', rank: '', badgeNumber: '', militaryId: '', isActive: true,
  hasVehicle: false,
  vehicleDetails: { plateNumber: '', model: '', color: '' }
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const isSecurityOfficer = currentUser?.role === 'SecurityOfficer';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [personnelList, setPersonnelList] = useState([]);

  const fetchPersonnel = async () => {
    try {
      const { data } = await api.get('/personnel?limit=100'); // fetch enough for dropdown
      setPersonnelList(data.data || data);
    } catch (err) {
      console.error('Failed to fetch personnel:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (modal) {
      fetchPersonnel();
    }
  }, [modal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modal === 'add') {
        await api.post('/users', form);
        toast.success('User created');
      } else {
        const { password, ...updateData } = form;
        if (password) updateData.password = password;
        await api.put(`/users/${selected._id}`, updateData);
        toast.success('User updated');
      }
      setModal(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (id === currentUser?._id) {
      toast.error('You cannot delete your own account.');
      return;
    }
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete user'); }
  };

  const roleConfig = { Administrator: 'badge-red', SecurityOfficer: 'badge-yellow', Guard: 'badge-green' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">System access control</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => { setForm({ ...INITIAL_FORM, role: isSecurityOfficer ? 'Guard' : INITIAL_FORM.role }); setModal('add'); }}>
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="table-wide">
            <thead>
              <tr>
                <th>Full Name</th><th>Role</th><th>Email</th><th>Rank</th><th>Military ID</th><th>Status</th><th>Last Login</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : users.map(u => (
                <tr key={u._id} onClick={() => { setSelected(u); setModal('view'); }} style={{ cursor: 'pointer' }} className="hover-row">
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={13} color="var(--text-muted)" /></div><span style={{ fontWeight: 600 }}>{u.fullName}</span></div></td>
                  <td><span className={`badge ${roleConfig[u.role] || 'badge-gray'}`}>{u.role}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                  <td>{u.rank || '-'}</td>
                  <td><span className="mono" style={{ fontSize: 11 }}>{u.militaryId || '-'}</span></td>
                  <td>{u.isActive ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Inactive</span>}</td>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.lastLogin ? format(new Date(u.lastLogin), 'yyyy-MM-dd HH:mm') : 'Never'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setSelected(u); setModal('view'); }}><Eye size={12} /></button>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setSelected(u); setForm({ ...u, password: '' }); setModal('edit'); }}><Edit2 size={12} /></button>
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
          <div className="modal" style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>
                {modal === 'add' ? 'Create User' : 'Edit User'}
              </h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
                <Shield size={18} color="var(--accent-red)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  SECURITY WARNING: Access credentials must be created and registered strictly by an authorized Camp Administrator.
                </span>
              </div>
              <div className="form-grid">
                <div className="form-group"><label className="form-label">Role</label>
                  <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    {isSecurityOfficer ? (
                      <option>Guard</option>
                    ) : (
                      <><option>Administrator</option><option>SecurityOfficer</option><option>Guard</option></>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{modal === 'add' ? 'Password *' : 'New Password (leave blank to keep)'}</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input" style={{ paddingRight: 36 }} type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required={modal === 'add'} />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                
                {(form.role === 'Guard' || form.role === 'SecurityOfficer') && (
                  <div className="form-group" style={{ gridColumn: '1 / -1', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <label className="form-label">Personnel Record (Optional)</label>
                    <select className="input" value={personnelList.find(p => p.personnelId === form.militaryId)?._id || ''} onChange={e => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      const p = personnelList.find(p => p._id === selectedId);
                      if (p) {
                        setForm(prev => ({
                          ...prev,
                          fullName: p.fullName || prev.fullName,
                          email: p.email || prev.email,
                          rank: p.rank || prev.rank,
                          phone: p.phone || prev.phone,
                          militaryId: p.personnelId || prev.militaryId,
                        }));
                        toast.success('Auto-filled from Personnel data');
                      }
                    }}>
                      <option value="">-- Select Personnel --</option>
                      {personnelList.filter(p => p.type === 'Military' || p.type === 'Staff').map(p => (
                        <option key={p._id} value={p._id}>{p.fullName} ({p.personnelId} - {p.rank || p.type})</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      Guard accounts must be linked to an existing personnel record. The account details below are filled from that record.
                    </div>
                  </div>
                )}
                
                <div className="form-group"><label className="form-label">Full Name *</label><input className="input" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Email *</label><input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
                <div className="form-group">
                  <label className="form-label">Rank</label>
                  <select className="input" value={form.rank} onChange={e => setForm(p => ({ ...p, rank: e.target.value }))}>
                    <option value="">Select Rank</option>
                    {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>



                <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
                  <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  <label htmlFor="isActive" className="form-label" style={{ marginTop: 0 }}>Active Account</label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : modal === 'add' ? 'Create User' : 'Update User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>
                User Details
              </h2>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={24} color="var(--accent-blue)" />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{selected.fullName}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected.email}</div>
                </div>
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Role</div>
                  <div style={{ fontWeight: 600 }}>{selected.role}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
                  <div style={{ fontWeight: 600 }}>{selected.isActive ? <span style={{ color: 'var(--accent-green)' }}>Active</span> : <span style={{ color: 'var(--accent-red)' }}>Inactive</span>}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Rank</div>
                  <div style={{ fontWeight: 600 }}>{selected.rank || '-'}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Military ID</div>
                  <div className="mono" style={{ fontWeight: 600 }}>{selected.militaryId || '-'}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Phone</div>
                  <div style={{ fontWeight: 600 }}>{selected.phone || '-'}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Badge Number</div>
                  <div className="mono" style={{ fontWeight: 600 }}>{selected.badgeNumber || '-'}</div>
                </div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                 <div>
                   <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Account Created</div>
                   <div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{selected.createdAt ? format(new Date(selected.createdAt), 'yyyy-MM-dd HH:mm') : '-'}</div>
                 </div>
                 <div>
                   <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Last Login</div>
                   <div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{selected.lastLogin ? format(new Date(selected.lastLogin), 'yyyy-MM-dd HH:mm') : '-'}</div>
                 </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={() => setModal(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
