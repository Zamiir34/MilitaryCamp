import React, { useState, useEffect } from 'react';
import { Shield, Search, Filter, Eye, X, LogIn, LogOut, PlusCircle, Edit, Trash2, Activity } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format, isToday } from 'date-fns';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page,
        limit: 20,
      });
      if (search) query.append('search', search);
      if (actionFilter) query.append('action', actionFilter);

      const { data } = await api.get(`/audit?${query.toString()}`);
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, actionFilter, page]);

  // Calculate events logged today
  const todayCount = logs.filter(log => log.createdAt && isToday(new Date(log.createdAt))).length;

  const getAvatarColor = (name) => {
    if (!name) return { bg: '#e2e8f0', color: '#475569' };
    const colors = [
      { bg: '#ef4444', color: '#ffffff' }, // red
      { bg: '#0d9488', color: '#ffffff' }, // teal
      { bg: '#6366f1', color: '#ffffff' }, // indigo
      { bg: '#d97706', color: '#ffffff' }, // amber
      { bg: '#8b5cf6', color: '#ffffff' }, // purple
      { bg: '#2563eb', color: '#ffffff' }, // blue
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const renderOperationBadge = (action, details) => {
    const actUpper = (action || '').toUpperCase();
    
    if (actUpper.includes('LOGIN') || actUpper === 'LOGIN') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: '#dbeafe',
          color: '#1d4ed8',
          border: '1px solid #bfdbfe'
        }}>
          <LogIn size={13} />
          User Login
        </span>
      );
    }

    if (actUpper.includes('LOGOUT') || actUpper === 'LOGOUT') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fde68a'
        }}>
          <LogOut size={13} />
          User Logout
        </span>
      );
    }

    if (actUpper.includes('CREATE') || actUpper === 'CREATE') {
      const target = details?.target || 'Record';
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: '#dcfce7',
          color: '#15803d',
          border: '1px solid #bbf7d0'
        }}>
          <PlusCircle size={13} />
          Create {target}
        </span>
      );
    }

    if (actUpper.includes('UPDATE') || actUpper === 'UPDATE') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: '#e0e7ff',
          color: '#4338ca',
          border: '1px solid #c7d2fe'
        }}>
          <Edit size={13} />
          Update Record
        </span>
      );
    }

    if (actUpper.includes('DELETE') || actUpper === 'DELETE') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          border: '1px solid #fca5a5'
        }}>
          <Trash2 size={13} />
          Delete Record
        </span>
      );
    }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: '#f1f5f9',
        color: '#475569',
        border: '1px solid #e2e8f0'
      }}>
        <Activity size={13} />
        {action}
      </span>
    );
  };

  const getEventDetailsText = (log) => {
    if (log.details?.description) return log.details.description;
    if (log.details?.message) return log.details.message;

    const action = (log.action || '').toUpperCase();
    const username = log.user?.fullName || log.user?.username || 'User';

    if (action.includes('LOGIN')) {
      return `User ${username} ayaa soo galay nidaamka.`;
    }
    if (action.includes('LOGOUT')) {
      return `Isticmaalaha ${username} ayaa ka baxay nidaamka.`;
    }
    if (action.includes('CREATE')) {
      if (log.details?.appointmentDate || log.endpoint?.includes('appointment')) {
        const dateStr = log.details?.appointmentDate || (log.createdAt ? format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm') : '');
        return `Scheduled new appointment for Date: ${dateStr}`;
      }
      return `Isticmaalaha ${username} ayaa ku daray xog cusub nidaamka.`;
    }
    if (action.includes('UPDATE')) {
      return `Isticmaalaha ${username} ayaa wax ka beddelay xogta nidaamka.`;
    }
    if (action.includes('DELETE')) {
      return `Isticmaalaha ${username} ayaa tirtiray xog nidaamka ka mid ah.`;
    }
    if (log.endpoint) {
      return `Isticmaalaha ${username} ayaa qabtay hawsha (${log.action}) ee qeybta ${log.endpoint}.`;
    }
    return `Isticmaalaha ${username} ayaa qabtay hawl nidaamka ah.`;
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* Top Banner Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gap: '1.5rem',
        marginBottom: '1.5rem',
        alignItems: 'stretch'
      }}>
        {/* Stat Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
            {todayCount || logs.length}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '6px' }}>
            Events Logged Today
          </div>
        </div>

        {/* Filter / Search Bar Container */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Filter by user, action, or date..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                fontSize: '14px',
                color: '#1e293b',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
            />
          </div>

          <div style={{ position: 'relative', width: '180px' }}>
            <Filter size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px 12px 40px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                fontSize: '14px',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        border: '1px solid #f1f5f9',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ACTOR / IDENTITY
                </th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  OPERATION
                </th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  EVENT DETAILS
                </th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                  TIMESTAMP
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '14px' }}>
                    Loading audit events...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '14px' }}>
                    No audit logs found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const userName = log.user?.fullName || log.user?.username || 'System Administrator';
                  const userRole = log.user?.role || 'Admin';
                  const initial = userName.charAt(0).toUpperCase();
                  const avatarStyle = getAvatarColor(userName);
                  const dateFormatted = log.createdAt ? format(new Date(log.createdAt), 'dd MMM, yyyy') : '-';
                  const timeFormatted = log.createdAt ? format(new Date(log.createdAt), 'hh:mm:ss a') : '-';

                  return (
                    <tr 
                      key={log._id} 
                      onClick={() => { setSelectedLog(log); setModalOpen(true); }}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* ACTOR / IDENTITY */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: '10px',
                            backgroundColor: avatarStyle.bg,
                            color: avatarStyle.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '16px',
                            flexShrink: 0
                          }}>
                            {initial}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                              {userName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              <Shield size={12} style={{ color: '#94a3b8' }} />
                              <span>{userRole}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* OPERATION */}
                      <td style={{ padding: '16px 24px' }}>
                        {renderOperationBadge(log.action, log.details)}
                      </td>

                      {/* EVENT DETAILS */}
                      <td style={{ padding: '16px 24px', fontSize: '13px', color: '#334155', maxWidth: '360px', lineHeight: 1.4 }}>
                        {getEventDetailsText(log)}
                      </td>

                      {/* TIMESTAMP */}
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                          {dateFormatted}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', marginTop: '2px' }}>
                          {timeFormatted}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '14px 24px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            Page <span style={{ fontWeight: 700, color: '#1e293b' }}>{page}</span> of <span style={{ fontWeight: 700, color: '#1e293b' }}>{totalPages || 1}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: page === 1 ? '#f1f5f9' : '#ffffff',
                color: page === 1 ? '#94a3b8' : '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: page === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: page >= totalPages ? '#f1f5f9' : '#ffffff',
                color: page >= totalPages ? '#94a3b8' : '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Details View Modal */}
      {modalOpen && selectedLog && (
        <div 
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Audit Event Details
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  ID: {selectedLog._id}
                </span>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>User</div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginTop: '4px' }}>
                    {selectedLog.user?.fullName || 'System'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedLog.user?.role || 'System'}</div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Operation</div>
                  <div style={{ marginTop: '6px' }}>
                    {renderOperationBadge(selectedLog.action, selectedLog.details)}
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                  Event Payload / Details
                </div>
                <pre style={{
                  backgroundColor: '#0f172a',
                  color: '#38bdf8',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  overflowX: 'auto',
                  maxHeight: '200px',
                  margin: 0
                }}>
                  {JSON.stringify(selectedLog.details || { endpoint: selectedLog.endpoint, ip: selectedLog.ipAddress }, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button 
                onClick={() => setModalOpen(false)}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
