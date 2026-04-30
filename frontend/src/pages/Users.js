import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Shield, Eye, EyeOff } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DEMO = [
  { _id: '1', username: 'admin', fullName: 'System Administrator', role: 'Administrator', email: 'admin@camp.mil', isActive: true, lastLogin: new Date().toISOString(), createdAt: new Date().toISOString() },
  { _id: '2', username: 'sec_officer1', fullName: 'MAJ. David Clarke', role: 'SecurityOfficer', email: 'dclarke@camp.mil', rank: 'Major', isActive: true, lastLogin: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date().toISOString() },
  { _id: '3', username: 'guard_stevens', fullName: 'CPL. Mark Stevens', role: 'Guard', email: 'mstevens@camp.mil', rank: 'Corporal', isActive: true, lastLogin: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date().toISOString() },
];

const INITIAL_FORM = { username: '', password: '', fullName: '', email: '', role: 'Guard', phone: '', rank: '', badgeNumber: '', militaryId: '', isActive: true };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {
      setUsers(DEMO);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

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
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch { toast.error('Failed'); }
  };

  const roleConfig = { Administrator: 'badge-red', SecurityOfficer: 'badge-yellow', Guard: 'badge-green' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">System access control</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(INITIAL_FORM); setModal('add'); }}>
          <Plus size={14} /> Add User
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Username</th><th>Full Name</th><th>Role</th><th>Email</th><th>Rank</th><th>Military ID</th><th>Status</th><th>Last Login</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : users.map(u => (
                <tr key={u._id}>
                  <td><span className="mono" style={{ color: 'var(--accent-cyan)', fontSize: 13 }}>{u.username}</span></td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={13} color="var(--text-muted)" /></div><span style={{ fontWeight: 600 }}>{u.fullName}</span></div></td>
                  <td><span className={`badge ${roleConfig[u.role] || 'badge-gray'}`}>{u.role}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                  <td>{u.rank || '-'}</td>
                  <td><span className="mono" style={{ fontSize: 11 }}>{u.militaryId || '-'}</span></td>
                  <td>{u.isActive ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Inactive</span>}</td>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.lastLogin ? format(new Date(u.lastLogin), 'yyyy-MM-dd HH:mm') : 'Never'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setSelected(u); setForm({ ...u, password: '' }); setModal('edit'); }}><Edit2 size={12} /></button>
                      <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(u._id)}><Trash2 size={12} /></button>
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
              <div className="form-grid">
                <div className="form-group"><label className="form-label">Username *</label><input className="input" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required /></div>
                <div className="form-group">
                  <label className="form-label">{modal === 'add' ? 'Password *' : 'New Password (leave blank to keep)'}</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input" style={{ paddingRight: 36 }} type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required={modal === 'add'} />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Full Name *</label><input className="input" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Email *</label><input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Role</label>
                  <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    <option>Administrator</option><option>SecurityOfficer</option><option>Guard</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Rank</label><input className="input" value={form.rank} onChange={e => setForm(p => ({ ...p, rank: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Badge Number</label><input className="input" value={form.badgeNumber} onChange={e => setForm(p => ({ ...p, badgeNumber: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Military ID (Personnel ID)</label><input className="input" value={form.militaryId} onChange={e => setForm(p => ({ ...p, militaryId: e.target.value }))} placeholder="PXXXXXXXX" /></div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  <label htmlFor="isActive" className="form-label" style={{ marginTop: 0 }}>Active Account</label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : modal === 'add' ? 'Create User' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
