import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Personnel from './pages/Personnel';
import Visitors from './pages/Visitors';
import EntryExit from './pages/EntryExit';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import Users from './pages/Users';
import Attendance from './pages/Attendance';
import MyWork from './pages/MyWork';
import Chat from './pages/Chat';
import Verify from './pages/Verify';
import VisitorPortal from './pages/VisitorPortal';

const PrivateRoute = ({ children, roles }) => {
  const { user, canAccess } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !canAccess(roles)) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                fontFamily: "'Exo 2', sans-serif",
                fontSize: '13px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
              },
              success: { iconTheme: { primary: 'var(--accent-primary)', secondary: 'var(--bg-primary)' } },
              error: { iconTheme: { primary: 'var(--accent-red)', secondary: 'var(--bg-primary)' } },
            }}
          />
          <Routes>
            <Route path="/login" element={<LoginWrapper />} />
            <Route path="/verify/:id" element={<Verify />} />
            <Route path="/visitor-portal" element={<VisitorPortal />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="my-work" element={<MyWork />} />
              <Route path="personnel" element={<Personnel />} />
              <Route path="visitors" element={<Visitors />} />
              <Route path="entry-exit" element={<EntryExit />} />
              <Route path="reports" element={<Reports />} />
              <Route path="notifications" element={<Alerts />} />
              <Route path="users" element={<PrivateRoute roles={['Administrator', 'SecurityOfficer']}><Users /></PrivateRoute>} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="chat" element={<Chat />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

function LoginWrapper() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default App;
