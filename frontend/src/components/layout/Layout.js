import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard, Users, Car, UserCheck, ArrowLeftRight,
  FileBarChart2, Bell, Shield, LogOut, Menu, X, ChevronRight, MessageSquare, Sun, Moon,
  CalendarCheck, AlertTriangle, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { getSocket, disconnectSocket } from '../../utils/socket';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/my-work', icon: FileBarChart2, label: 'My Work Today' },
  { to: '/entry-exit', icon: ArrowLeftRight, label: 'Entry / Exit' },
  { to: '/personnel', icon: Users, label: 'Personnel' },
  { to: '/visitors', icon: UserCheck, label: 'Visitors' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/reports', icon: FileBarChart2, label: 'Reports' },
  { to: '/users', icon: Shield, label: 'Users', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  // ── Real-time notifications ──
  const [notifUnread, setNotifUnread] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Connect socket & listen for new_alert
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const handleNewAlert = (alert) => {
      setNotifUnread(prev => prev + 1);
      setRecentAlerts(prev => [alert, ...prev].slice(0, 5));
      // Severity-based toast
      const isCritical = alert.severity === 'Critical' || alert.severity === 'High';
      const toastFn = isCritical ? toast.error : toast;
      toastFn(
        `🔔 ${alert.type}: ${alert.message}`,
        { duration: 5000, id: alert.alertId }
      );
    };
    socket.on('new_alert', handleNewAlert);
    return () => {
      socket.off('new_alert', handleNewAlert);
    };
  }, [user]);

  // Disconnect socket on unmount (logout)
  // NOTE: we call disconnectSocket() in handleLogout instead of here
  // because React Strict Mode double-invokes effects in development.

  // Poll unread count every 20s
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/chat/unread-count');
        setChatUnread(data.count || 0);
      } catch {}
    };
    fetchUnread();
    const iv = setInterval(fetchUnread, 20000);
    return () => clearInterval(iv);
  }, []);

  const [showCheckInPrompt, setShowCheckInPrompt] = useState(false);

  // Check today's attendance on mount/user load
  useEffect(() => {
    const checkTodayAttendance = async () => {
      if (!user) return;
      try {
        const { data } = await api.get('/attendance/today');
        if (!data.checkedIn) {
          setShowCheckInPrompt(true);
        }
      } catch (err) {
        console.error('Failed to check today\'s attendance status', err);
      }
    };
    checkTodayAttendance();
  }, [user]);

  const handleLogout = () => {
    disconnectSocket(); // tear down socket before clearing token
    logout();
    navigate('/login');
  };

  const roleColor = {
    Administrator: 'badge-red',
    SecurityOfficer: 'badge-gold',
    Guard: 'badge-green'
  };

  return (
    <div className="layout-container">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''} ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        {/* Logo area */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '64px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '8px', flexShrink: 0,
            background: 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <Shield size={20} color="var(--bg-secondary)" />
          </div>
          {(sidebarOpen || mobileOpen) && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '0.08em', color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>CAMP SECURITY</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: 'Share Tech Mono, monospace' }}>ACCESS CONTROL v1.0</div>
            </div>
          )}
          {/* Mobile close button */}
          <button 
            className="btn btn-ghost mobile-only" 
            style={{ marginLeft: 'auto', padding: 4 }}
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto', overflowX: 'hidden' }}>
          {navItems.filter(item => !item.adminOnly || user?.role === 'Administrator').map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 6,
                marginBottom: 2,
                color: isActive ? 'var(--text-active)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-active)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--border-active)' : 'transparent'}`,
                textDecoration: 'none',
                transition: 'all 0.15s',
                fontFamily: 'Rajdhani, sans-serif',
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              })}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {(sidebarOpen || mobileOpen) && (
                <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {label}
                  {to === '/chat' && chatUnread > 0 && (
                    <span style={{ background: 'var(--accent-red)', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                      {chatUnread > 9 ? '9+' : chatUnread}
                    </span>
                  )}
                </span>
              )}
              {!(sidebarOpen || mobileOpen) && to === '/chat' && chatUnread > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 4, background: 'var(--accent-red)', borderRadius: '50%', width: 8, height: 8 }} />
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
          {(sidebarOpen || mobileOpen) ? (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Rajdhani, sans-serif' }}>{user?.fullName}</div>
              <span className={`badge ${roleColor[user?.role] || 'badge-gray'}`} style={{ marginTop: 4 }}>{user?.role}</span>
            </div>
          ) : null}
          <button
            onClick={handleLogout}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: (sidebarOpen || mobileOpen) ? 'flex-start' : 'center', padding: '6px 10px', fontSize: 12 }}
          >
            <LogOut size={14} />
            {(sidebarOpen || mobileOpen) && 'Logout'}
          </button>
        </div>

        {/* Collapse toggle (Desktop only) */}
        <button
          className="desktop-only"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'absolute',
            top: '50%',
            right: -12,
            transform: 'translateY(-50%)',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          <ChevronRight size={12} style={{ transform: sidebarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
        </button>
      </aside>

      {/* Main content */}
      <div className="main-wrapper">
        {/* Top bar */}
        <header className="top-bar">
          <button 
            className="btn btn-ghost mobile-only" 
            style={{ padding: '8px' }}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }} className="desktop-only">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <button
              onClick={toggleTheme}
              className="btn btn-ghost"
              style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Real-time Notification Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                id="notif-bell-btn"
                className="btn btn-ghost"
                style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                title="Notifications"
                onClick={() => { setNotifOpen(o => !o); setNotifUnread(0); }}
              >
                <Bell size={18} />
                {notifUnread > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    background: 'var(--accent-red)', color: '#fff',
                    borderRadius: '50%', width: 16, height: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 800, lineHeight: 1,
                    animation: 'pulse-primary 1.5s infinite',
                    border: '1.5px solid var(--bg-secondary)'
                  }}>
                    {notifUnread > 9 ? '9+' : notifUnread}
                  </span>
                )}
              </button>

              {/* Dropdown panel */}
              {notifOpen && (
                <div id="notif-dropdown" style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: 340, background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-light)', borderRadius: 10,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                  zIndex: 1000, overflow: 'hidden',
                  animation: 'fadeIn 0.15s ease'
                }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>Live Notifications</span>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '2px 8px', fontSize: 11, color: 'var(--accent-primary)' }}
                      onClick={() => { navigate('/notifications'); setNotifOpen(false); }}
                    >
                      View All
                    </button>
                  </div>

                  {recentAlerts.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      <Bell size={24} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                      <div>No new notifications</div>
                    </div>
                  ) : (
                    <div>
                      {recentAlerts.map((alert, i) => {
                        const isCritical = alert.severity === 'Critical' || alert.severity === 'High';
                        const color = isCritical ? 'var(--accent-red)' : alert.severity === 'Medium' ? 'var(--accent-gold)' : 'var(--accent-cyan)';
                        return (
                          <div key={alert.alertId || i} style={{
                            padding: '0.65rem 1rem',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex', gap: 10, alignItems: 'flex-start',
                            background: i === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
                          }}>
                            <div style={{ paddingTop: 2, flexShrink: 0 }}>
                              {isCritical
                                ? <AlertTriangle size={14} color={color} />
                                : <Info size={14} color={color} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.message}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 6 }}>
                                <span style={{ color, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>{alert.severity}</span>
                                <span>•</span>
                                <span>{alert.type}</span>
                                {alert.gate && <><span>•</span><span>{alert.gate}</span></>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                    <button
                      className="btn btn-ghost"
                      style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                      onClick={() => { navigate('/notifications'); setNotifOpen(false); }}
                    >
                      Go to Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-green)', animation: 'pulse-primary 2s infinite' }} />
              <span style={{ fontSize: 14, color: 'var(--accent-green)', fontFamily: 'Share Tech Mono, monospace', fontWeight: 800 }}>ONLINE</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="content-area noise-bg">
          <Outlet />
        </main>
      </div>

      {/* Attendance Check-in Prompt Modal */}
      {showCheckInPrompt && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 450, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(245,158,11,0.08)',
                border: '2.5px solid var(--accent-gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse-primary 2s infinite'
              }}>
                <CalendarCheck size={32} color="var(--accent-gold)" />
              </div>
            </div>
            <h3 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Attendance Required
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Attention <strong>{user?.fullName}</strong>. You have not registered today's access attendance. Please check in to log your shift.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={async () => {
                  try {
                    const { data } = await api.post('/attendance/check-in', {});
                    toast.success(data.message || 'Successfully checked in!');
                    setShowCheckInPrompt(false);
                    window.location.reload();
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Check-in failed');
                  }
                }}
              >
                Check In Now
              </button>
              <button 
                className="btn btn-ghost" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  setShowCheckInPrompt(false);
                  navigate('/attendance');
                }}
              >
                Go to Attendance Screen
              </button>
              <button 
                className="btn btn-ghost" 
                style={{ width: '100%', justifyContent: 'center', border: 'none', background: 'transparent', fontSize: 12, padding: 6, color: 'var(--text-muted)' }}
                onClick={() => setShowCheckInPrompt(false)}
              >
                Dismiss for now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
