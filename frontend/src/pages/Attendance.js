import React, { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, Clock, ClipboardList, CheckCircle, XCircle, AlertCircle, Calendar, User, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

export default function Attendance() {
  const { user } = useAuth();
  const [todayStatus, setTodayStatus] = useState(null); // { checkedIn: false } or { checkedIn: true, record: ... }
  const [personalHistory, setPersonalHistory] = useState([]);
  const [teamRecords, setTeamRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'team' (Admin only)

  const fetchTodayStatus = async () => {
    try {
      const { data } = await api.get('/attendance/today');
      setTodayStatus(data);
    } catch (err) {
      console.error('Failed to fetch today status', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/attendance/history');
      setPersonalHistory(data);
    } catch (err) {
      console.error('Failed to fetch attendance history', err);
    }
  };

  const fetchTeamRecords = async (dateStr) => {
    if (user?.role !== 'Administrator') return;
    try {
      const { data } = await api.get(`/attendance/all?date=${dateStr}`);
      setTeamRecords(data);
    } catch (err) {
      console.error('Failed to fetch team records', err);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchTodayStatus(),
      fetchHistory(),
      user?.role === 'Administrator' ? fetchTeamRecords(selectedDate) : Promise.resolve()
    ]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.post('/attendance/check-in', { notes });
      toast.success(data.message || 'Checked in successfully');
      setNotes('');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.post('/attendance/check-out', { notes });
      toast.success(data.message || 'Checked out successfully');
      setNotes('');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const dateStr = e.target.value;
    setSelectedDate(dateStr);
    fetchTeamRecords(dateStr);
  };

  if (loading) {
    return <div className="loading">Loading Attendance records...</div>;
  }

  const record = todayStatus?.record;
  const isCheckedIn = todayStatus?.checkedIn;
  const isCheckedOut = record?.checkOutTime;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance System</h1>
          <p className="page-subtitle">Manage daily attendance and duty shift tracking</p>
        </div>
        
        {user?.role === 'Administrator' && (
          <div style={{ display: 'flex', gap: 8, background: 'var(--bg-secondary)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
            <button 
              onClick={() => setActiveTab('personal')} 
              className="btn" 
              style={{ 
                padding: '6px 12px', 
                fontSize: 13, 
                marginBottom: 0,
                background: activeTab === 'personal' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'personal' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                borderRadius: 6
              }}
            >
              My Attendance
            </button>
            <button 
              onClick={() => setActiveTab('team')} 
              className="btn" 
              style={{ 
                padding: '6px 12px', 
                fontSize: 13, 
                marginBottom: 0,
                background: activeTab === 'team' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'team' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                borderRadius: 6
              }}
            >
              Team Monitoring
            </button>
          </div>
        )}
      </div>

      {activeTab === 'personal' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Action Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
                <CalendarCheck size={20} color="var(--accent-primary)" />
                <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Duty Attendance</h2>
              </div>

              {/* Status Graphic */}
              <div style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border)', 
                borderRadius: 12, 
                padding: '1.5rem', 
                textAlign: 'center', 
                marginBottom: '1.5rem'
              }}>
                {!isCheckedIn ? (
                  <>
                    <AlertCircle size={48} color="var(--accent-gold)" style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-gold)' }}>NOT CHECKED IN</div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>You have not recorded your attendance for today yet.</p>
                  </>
                ) : isCheckedOut ? (
                  <>
                    <CheckCircle size={48} color="var(--accent-blue)" style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-blue)' }}>SHIFT COMPLETED</div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>You have checked out for today. Shift complete.</p>
                  </>
                ) : (
                  <>
                    <CheckCircle size={48} color="var(--accent-green)" style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-green)' }}>ACTIVE ON DUTY</div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Your attendance is recorded. Have a safe duty shift.</p>
                  </>
                )}
              </div>

              {/* Date & Time display */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Current Date</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{format(new Date(), 'dd MMMM yyyy')}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Check-in status</div>
                  <div>
                    {!isCheckedIn ? (
                      <span className="badge badge-gray" style={{ padding: '2px 8px', fontSize: 10 }}>Absent</span>
                    ) : isCheckedOut ? (
                      <span className="badge badge-blue" style={{ padding: '2px 8px', fontSize: 10 }}>Completed</span>
                    ) : (
                      <span className="badge badge-green" style={{ padding: '2px 8px', fontSize: 10 }}>Checked In</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Details if checked in */}
              {isCheckedIn && (
                <div style={{ 
                  background: 'var(--bg-elevated)', 
                  padding: '1rem', 
                  borderRadius: 8, 
                  border: '1px solid var(--border)',
                  marginBottom: '1.5rem',
                  fontSize: 13
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Check-in:</span>
                    <span style={{ fontWeight: 700, fontFamily: 'Share Tech Mono' }}>
                      {format(new Date(record.checkInTime), 'HH:mm:ss')}
                    </span>
                  </div>
                  {record.checkOutTime && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Check-out:</span>
                      <span style={{ fontWeight: 700, fontFamily: 'Share Tech Mono' }}>
                        {format(new Date(record.checkOutTime), 'HH:mm:ss')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Shift Notes */}
              {!isCheckedOut && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Duty Shift Notes</label>
                  <textarea 
                    className="input" 
                    rows={2}
                    value={notes} 
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Enter any notes, gate assignment, or log info..."
                    style={{ fontSize: 13 }}
                  />
                </div>
              )}
            </div>

            {/* Check-in / Out Buttons */}
            <div>
              {!isCheckedIn ? (
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                >
                  <Clock size={16} /> {actionLoading ? 'Registering check-in...' : 'Check In Today'}
                </button>
              ) : !isCheckedOut ? (
                <button 
                  className="btn btn-danger" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                >
                  <Clock size={16} /> {actionLoading ? 'Registering check-out...' : 'Check Out of Duty'}
                </button>
              ) : (
                <button 
                  className="btn btn-ghost" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={true}
                >
                  Duty Shift Complete
                </button>
              )}
            </div>
          </div>

          {/* History Card */}
          <div className="card" style={{ flex: '1.5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
              <ClipboardList size={20} color="var(--accent-secondary)" />
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Attendance History</h2>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {personalHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: 13 }}>
                        No attendance history found.
                      </td>
                    </tr>
                  ) : (
                    personalHistory.map(h => (
                      <tr key={h._id}>
                        <td style={{ fontSize: 13, fontWeight: 600 }}>{h.date}</td>
                        <td>
                          <span className={`badge ${h.checkOutTime ? 'badge-blue' : 'badge-green'}`}>
                            {h.checkOutTime ? 'Completed' : 'Checked In'}
                          </span>
                        </td>
                        <td className="mono" style={{ fontSize: 13 }}>{format(new Date(h.checkInTime), 'HH:mm')}</td>
                        <td className="mono" style={{ fontSize: 13 }}>{h.checkOutTime ? format(new Date(h.checkOutTime), 'HH:mm') : '--'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.notes || '--'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Team Attendance Monitoring (Admin only) */
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={20} color="var(--accent-primary)" />
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team Attendance Status</h2>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Select Date:</label>
              <input 
                type="date" 
                className="input" 
                style={{ padding: '6px 12px', fontSize: 13, width: 'auto', marginBottom: 0 }}
                value={selectedDate}
                onChange={handleDateChange}
              />
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Guard Name</th>
                  <th>Rank / Role</th>
                  <th>Badge No.</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {teamRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: 13 }}>
                      No attendance records found for {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  teamRecords.map(rec => (
                    <tr key={rec._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ 
                            width: 28, height: 28, borderRadius: '50%', 
                            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: 'var(--accent-primary)'
                          }}>
                            {rec.user?.fullName?.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{rec.user?.fullName}</div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {rec.user?.rank || 'N/A'} • {rec.user?.role}
                      </td>
                      <td style={{ fontSize: 12, fontFamily: 'Share Tech Mono' }}>
                        {rec.user?.badgeNumber || 'N/A'}
                      </td>
                      <td className="mono" style={{ fontSize: 13 }}>
                        {format(new Date(rec.checkInTime), 'HH:mm:ss')}
                      </td>
                      <td className="mono" style={{ fontSize: 13 }}>
                        {rec.checkOutTime ? format(new Date(rec.checkOutTime), 'HH:mm:ss') : '--'}
                      </td>
                      <td>
                        <span className={`badge ${rec.checkOutTime ? 'badge-blue' : 'badge-green'}`}>
                          {rec.checkOutTime ? 'Completed' : 'On Duty'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.notes || '--'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
