import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, Car, UserCheck, ArrowLeftRight,
  FileBarChart2, Bell, QrCode, Shield, LogOut, Menu, X, ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/my-work', icon: FileBarChart2, label: 'My Work Today' },
  { to: '/entry-exit', icon: ArrowLeftRight, label: 'Entry / Exit' },
  { to: '/personnel', icon: Users, label: 'Personnel' },
  { to: '/vehicles', icon: Car, label: 'Vehicles' },
  { to: '/visitors', icon: UserCheck, label: 'Visitors' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/qr-scan', icon: QrCode, label: 'QR Scanner' },
  { to: '/reports', icon: FileBarChart2, label: 'Reports' },
  { to: '/users', icon: Shield, label: 'Users', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
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
            background: 'linear-gradient(135deg, var(--accent-green-dim), var(--accent-cyan))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--glow-green)'
          }}>
            <Shield size={20} color="white" />
          </div>
          {(sidebarOpen || mobileOpen) && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '0.08em', color: 'var(--accent-green)', whiteSpace: 'nowrap' }}>CAMP SECURITY</div>
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
                color: isActive ? 'var(--accent-green)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(34,197,94,0.1)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(34,197,94,0.3)' : 'transparent'}`,
                textDecoration: 'none',
                transition: 'all 0.15s',
                fontFamily: 'Rajdhani, sans-serif',
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              })}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {(sidebarOpen || mobileOpen) && <span>{label}</span>}
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
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }} className="desktop-only">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)', animation: 'pulse-green 2s infinite' }} />
            <span style={{ fontSize: 11, color: 'var(--accent-green)', fontFamily: 'Share Tech Mono, monospace' }}>ONLINE</span>
          </div>
        </header>

        {/* Page content */}
        <main className="content-area noise-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
