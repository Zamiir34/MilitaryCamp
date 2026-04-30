import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Personnel from './pages/Personnel';
import Vehicles from './pages/Vehicles';
import Visitors from './pages/Visitors';
import EntryExit from './pages/EntryExit';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import Users from './pages/Users';
import QRScan from './pages/QRScan';
import MyWork from './pages/MyWork';

const PrivateRoute = ({ children, roles }) => {
  const { user, canAccess } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !canAccess(roles)) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#111c15',
              color: '#e8f5e9',
              border: '1px solid #1e3a22',
              fontFamily: "'Exo 2', sans-serif",
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#111c15' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#111c15' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginWrapper />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="my-work" element={<MyWork />} />
            <Route path="personnel" element={<Personnel />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="visitors" element={<Visitors />} />
            <Route path="entry-exit" element={<EntryExit />} />
            <Route path="reports" element={<Reports />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="users" element={<PrivateRoute roles={['Administrator']}><Users /></PrivateRoute>} />
            <Route path="qr-scan" element={<QRScan />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function LoginWrapper() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default App;
