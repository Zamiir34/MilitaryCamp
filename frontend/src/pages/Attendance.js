import React, { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, Clock, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { format, differenceInMinutes } from 'date-fns';
import { useAuth } from '../context/AuthContext';

function formatShiftDuration(checkInTime, checkOutTime) {
  if (!checkInTime) return '--';
  try {
    const start = new Date(checkInTime);
    const end = checkOutTime ? new Date(checkOutTime) : new Date();
    const totalMins = Math.max(0, differenceInMinutes(end, start));
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${mins}m`;
  } catch {
    return '--';
  }
}

function todayDateTimeLocal(hours, minutes) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export default function Attendance() {
  const { user, canAccess } = useAuth();
  const canViewTeamRecords = canAccess(['Administrator', 'SecurityOfficer']);
  const [todayStatus, setTodayStatus] = useState(null);
  const [teamRecords, setTeamRecords] = useState([]);
  const [startTime, setStartTime] = useState(() => todayDateTimeLocal(0, 0));
  const [endTime, setEndTime] = useState(() => todayDateTimeLocal(23, 59));
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const fetchTodayStatus = async () => {
    try {
      const { data } = await api.get('/attendance/today');
      setTodayStatus(data);
    } catch (err) {
      console.error('Failed to fetch today status', err);
    }
  };

  const fetchTeamRecords = async (start, end) => {
    if (!canViewTeamRecords) return;
    if (!start || !end) return;
    if (new Date(start) > new Date(end)) {
      toast.error('Start time must be before end time');
      return;
    }
    try {
      const params = new URLSearchParams({ startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString() });
      const { data } = await api.get(`/attendance/all?${params}`);
      setTeamRecords(data);
    } catch (err) {
      console.error('Failed to fetch team records', err);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchTodayStatus(),
      canViewTeamRecords ? fetchTeamRecords(startTime, endTime) : Promise.resolve(),
    ]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canViewTeamRecords]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.post('/attendance/check-in', {});
      toast.success(data.message || 'Checked in successfully');
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
      const { data } = await api.post('/attendance/check-out', {});
      toast.success(data.message || 'Checked out successfully');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const applyTeamRange = () => {
    fetchTeamRecords(startTime, endTime);
  };

  const handleStartTimeChange = (e) => {
    setStartTime(e.target.value);
  };

  const handleEndTimeChange = (e) => {
    setEndTime(e.target.value);
  };

  if (loading) {
    return <div className="loading">Loading Attendance records...</div>;
  }

  const record = todayStatus?.record;
  const isCheckedIn = todayStatus?.checkedIn;
  const isCheckedOut = Boolean(record?.checkOutTime);
  const shiftDuration = formatShiftDuration(record?.checkInTime, record?.checkOutTime);

  const renderShiftCard = () => (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginBottom: canViewTeamRecords ? '1.5rem' : 0 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
          <CalendarCheck size={20} color="var(--accent-primary)" />
          <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Today&apos;s Duty Shift
          </h2>
        </div>

        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '1.5rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
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
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Your attendance is recorded. Remember to check out when your shift ends.</p>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Check In</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: isCheckedIn ? 'var(--accent-green)' : 'var(--text-muted)' }}>
              {isCheckedIn && record?.checkInTime ? format(new Date(record.checkInTime), 'HH:mm') : '--:--'}
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Check Out</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: isCheckedOut ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
              {isCheckedOut && record?.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm') : '--:--'}
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Duration</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {isCheckedIn ? shiftDuration : '--'}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          {format(new Date(), 'EEEE, dd MMMM yyyy')}
        </div>
      </div>

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
            disabled
          >
            Duty Shift Complete
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance System</h1>
          <p className="page-subtitle">Manage daily attendance and duty shift tracking</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {renderShiftCard()}

        {canViewTeamRecords && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={20} color="var(--accent-primary)" />
                <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {user?.role === 'SecurityOfficer' ? 'Guard Attendance Status' : 'Team Attendance Status'}
                </h2>
              </div>

              <div className="filter-toolbar" style={{ marginBottom: 0, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Start Time:</label>
                  <input
                    type="datetime-local"
                    className="input filter-select"
                    style={{ padding: '6px 12px', fontSize: 13, width: 'auto', marginBottom: 0 }}
                    value={startTime}
                    onChange={handleStartTimeChange}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>End Time:</label>
                  <input
                    type="datetime-local"
                    className="input filter-select"
                    style={{ padding: '6px 12px', fontSize: 13, width: 'auto', marginBottom: 0 }}
                    value={endTime}
                    onChange={handleEndTimeChange}
                  />
                </div>
                <button type="button" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={applyTeamRange}>
                  Apply
                </button>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Guard Name</th>
                    <th>Rank / Role</th>
                    <th>Badge No.</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: 13 }}>
                        No attendance records found for the selected time range.
                      </td>
                    </tr>
                  ) : (
                    teamRecords.map(rec => (
                      <tr key={rec._id}>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {rec.date || format(new Date(rec.checkInTime), 'yyyy-MM-dd')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, color: 'var(--accent-primary)',
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
